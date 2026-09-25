import os
import uuid
import json
import asyncio
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

from app.config import STORAGE_DIR, FONT_PATH, GEMINI_API_KEY, PEXELS_API_KEY
from app.services.script_service import generate_script_from_prompt
from app.services.voice_service import generate_speech_for_scene, ARABIC_VOICES, DEFAULT_VOICE
from app.services.media_service import fetch_media_for_scene, fetch_stock_only, generate_ai_visual_video, _resolve_style, _build_real_query_list
from app.services.editor_service import create_ass_subtitle_file, render_scene_video, concatenate_and_add_subtitles, mix_background_music, create_karaoke_ass_file, save_timings_file, timings_to_srt, create_text_card
from app.services.youtube_service import upload_short_to_youtube, check_youtube_auth_status, start_local_auth_flow, generate_video_thumbnail, get_video_stats
from app.services.autopilot_service import load_schedules, upsert_schedule, delete_schedule, is_due
from app.services.history_service import load_history, save_history_item, update_history_item, delete_history_item
from app.services.settings_service import get_public_settings, save_settings, load_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="ContentFlow - Shorts Automation Engine", version="1.0.0")

# Enable CORS for Next.js frontend (local and production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Task tracking (persisted to disk so progress survives server restarts)
TASKS_FILE = STORAGE_DIR / "tasks.json"
TASKS_DB: Dict[str, Dict[str, Any]] = {}

def _persist_tasks() -> None:
    try:
        TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(TASKS_FILE, "w", encoding="utf-8") as f:
            json.dump(TASKS_DB, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Could not persist tasks: {e}")

def _load_tasks() -> None:
    try:
        if TASKS_FILE.exists():
            with open(TASKS_FILE, "r", encoding="utf-8") as f:
                TASKS_DB.update(json.load(f))
            # Anything stuck in queued/processing died with the old process
            for tid, t in TASKS_DB.items():
                if t.get("status") in ("queued", "processing"):
                    t["status"] = "failed"
                    t["error"] = "توقف السيرفر أثناء المعالجة — أعد إنتاج الفيديو"
                    t["step"] = "توقفت المهمة بسبب إعادة تشغيل السيرفر"
            _persist_tasks()
    except Exception as e:
        logger.warning(f"Could not load persisted tasks: {e}")

_load_tasks()

from app.services.settings_service import get_public_settings, save_settings, load_settings# ----------------- Models -----------------
class ScriptRequest(BaseModel):
    prompt: str = Field(..., description="فكرة الفيديو أو موضوعه")
    category: str = Field("general", description="kids_cars | kids_alphabet | kids_stories | real_cars | car_facts | cinematic_story | mystery_tales | general | custom")
    tone: str = Field("حماسي وملهم", description="نمط وأسلوب الكلام")
    duration: int = Field(35, description="المدة التقريبية بالثواني")
    custom_system_prompt: Optional[str] = Field(None, description="برومت مخصص للتحكم الكامل")
    scene_count: int = Field(0, description="عدد المشاهد المطلوب (0 = تلقائي)")

class SceneModel(BaseModel):
    scene_number: int
    narration: str
    search_keywords: str
    visual_description: Optional[str] = None

class RenderRequest(BaseModel):
    title: str
    description: str
    tags: List[str] = []
    scenes: List[SceneModel]
    voice: str = Field(DEFAULT_VOICE, description="صوت المعلق")
    category: str = Field("general", description="نوع المحتوى لتخصيص المرئيات")
    visual_mode: str = Field("auto", description="auto | auto_real | real_stock | ai_realistic | ai_cartoon | ai_cinematic")
    include_subtitles: bool = Field(False, description="حرق الترجمة على الفيديو أم تركه نقياً بدون نصوص")
    music_enabled: bool = Field(False, description="إضافة موسيقى خلفية هادئة")
    music_volume: float = Field(0.12, description="مستوى صوت الموسيقى 0.03-0.35")
    voice_rate: float = Field(1.0, description="سرعة الصوت 0.85-1.15")
    subtitle_style: str = Field("karaoke", description="karaoke أو classic")
    title_card: bool = Field(True, description="بطاقة عنوان في البداية وخاتمة في النهاية")

class PublishRequest(BaseModel):
    video_id: str
    title: str
    description: str
    tags: List[str] = []
    privacy: str = Field("public", description="public أو unlisted أو private")
    publish_at: Optional[str] = Field(None, description="ISO datetime لجدولة النشر")

class SettingsUpdateRequest(BaseModel):
    llm: Optional[Dict[str, Any]] = None
    voice: Optional[Dict[str, Any]] = None
    media: Optional[Dict[str, Any]] = None
    publishing: Optional[Dict[str, Any]] = None

def _task_log(task_id: str, msg: str) -> None:
    """Append a timestamped line to the per-task technical log."""
    try:
        log_path = STORAGE_DIR / "temp" / task_id / "render.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}\n")
    except Exception:
        pass

def _cleanup_workdir(task_id: str) -> float:
    """Delete bulky work files (mp4/jpg/ass/txt), keep render.log. Returns freed MB."""
    wd = STORAGE_DIR / "temp" / task_id
    freed = 0.0
    try:
        if wd.exists():
            for f in wd.iterdir():
                if f.name == "render.log":
                    continue
                try:
                    if f.is_file():
                        freed += f.stat().st_size
                        f.unlink()
                    elif f.is_dir():
                        import shutil as _shutil
                        freed += sum(p.stat().st_size for p in f.rglob("*") if p.is_file())
                        _shutil.rmtree(f)
                except Exception:
                    pass
    except Exception:
        pass
    return round(freed / (1024 * 1024), 1)

# ----------------- Endpoints -----------------

@app.get("/api/health")
def health_check():
    youtube_status = check_youtube_auth_status()
    s = load_settings()
    llm_prov = s.get("llm", {}).get("provider", "gemini")
    voice_prov = s.get("voice", {}).get("provider", "edge_tts")
    media_prov = s.get("media", {}).get("provider", "pexels")
    import shutil as _shutil
    try:
        disk_free_gb = round(_shutil.disk_usage(STORAGE_DIR).free / (1024 ** 3), 1)
    except Exception:
        disk_free_gb = -1.0

    return {
        "status": "online",
        "llm_provider": llm_prov,
        "voice_provider": voice_prov,
        "media_provider": media_prov,
        "has_gemini": bool(s.get("llm", {}).get("gemini_api_key")),
        "has_pexels": bool(s.get("media", {}).get("pexels_api_key")),
        "ffmpeg": bool(_shutil.which("ffmpeg")),
        "ffprobe": bool(_shutil.which("ffprobe")),
        "disk_free_gb": disk_free_gb,
        "youtube": youtube_status,
        "available_voices": ARABIC_VOICES
    }

@app.get("/api/settings")
def get_settings_endpoint():
    return get_public_settings()

@app.post("/api/settings")
def update_settings_endpoint(req: SettingsUpdateRequest):
    current = load_settings()
    if req.llm:
        for k, v in req.llm.items():
            if v:
                current["llm"][k] = v
            elif k in ["provider", "model_name"]:
                current["llm"][k] = v
    if req.voice:
        for k, v in req.voice.items():
            if v:
                current["voice"][k] = v
            elif k in ["provider", "voice_name", "elevenlabs_voice_id"]:
                current["voice"][k] = v
    if req.media:
        for k, v in req.media.items():
            if v:
                current["media"][k] = v
            elif k == "provider":
                current["media"][k] = v
    if req.publishing:
        current["publishing"].update(req.publishing)

    save_settings(current)
    return {"success": True, "settings": get_public_settings()}

@app.post("/api/script/generate")
def generate_script(req: ScriptRequest):
    try:
        data = generate_script_from_prompt(
            user_prompt=req.prompt,
            category=req.category,
            tone=req.tone,
            target_duration_sec=req.duration,
            custom_system_prompt=req.custom_system_prompt,
            scene_count=req.scene_count
        )
        return data
    except Exception as e:
        logger.error(f"Error generating script: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class RegenerateSceneRequest(BaseModel):
    category: str = Field("general")
    tone: str = Field("ممتع ومرح")
    narration: str = Field(...)
    scene_number: int = Field(1)

@app.post("/api/script/regenerate-scene")
def regenerate_scene(req: RegenerateSceneRequest):
    try:
        from app.services.script_service import regenerate_single_scene
        return regenerate_single_scene(
            category=req.category,
            tone=req.tone,
            current_narration=req.narration,
            scene_number=req.scene_number
        )
    except Exception as e:
        logger.error(f"Error regenerating scene: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TitleVariationsRequest(BaseModel):
    title: str
    description: str = ""
    category: str = "general"
    tone: str = "حماسي وملهم"
    count: int = 3

@app.post("/api/script/title-variations")
def title_variations(req: TitleVariationsRequest):
    try:
        from app.services.script_service import generate_title_variations
        return generate_title_variations(
            title=req.title,
            description=req.description,
            category=req.category,
            tone=req.tone,
            count=max(2, min(req.count, 5))
        )
    except Exception as e:
        logger.error(f"Error generating title variations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class VoicePreviewRequest(BaseModel):
    text: str
    voice: str = DEFAULT_VOICE

@app.post("/api/voice/preview")
async def voice_preview(req: VoicePreviewRequest):
    """معاينة سريعة للصوت (أول ~120 حرف) قبل الإنتاج الكامل."""
    try:
        sample = req.text.strip()[:140]
        if not sample:
            raise ValueError("النص فارغ")
        import hashlib
        fname = f"preview_{hashlib.md5((sample + req.voice).encode()).hexdigest()[:12]}.mp3"
        out_path = str(STORAGE_DIR / "temp" / fname)
        await generate_speech_for_scene(text=sample, output_audio_path=out_path, voice=req.voice)
        return FileResponse(path=out_path, media_type="audio/mpeg", filename="voice_preview.mp3")
    except Exception as e:
        logger.error(f"Voice preview failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def run_render_pipeline(task_id: str, payload: RenderRequest):
    """
    خط إنتاج الفيديو الكامل في الخلفية (Background Task)
    """
    try:
        TASKS_DB[task_id]["status"] = "processing"
        TASKS_DB[task_id]["progress"] = 10
        TASKS_DB[task_id]["step"] = "توليد التعليق الصوتي وحساب التوقيتات..."
        _task_log(task_id, f"START title='{payload.title}' scenes={len(payload.scenes)} mode={payload.visual_mode} voice={payload.voice} rate={payload.voice_rate}")

        work_dir = STORAGE_DIR / "temp" / task_id
        work_dir.mkdir(parents=True, exist_ok=True)

        scene_video_paths = []
        subtitle_timings = []
        word_events: List[Dict[str, Any]] = []
        accumulated_time = 0.0

        num_scenes = len(payload.scenes)
        direct_ai = payload.visual_mode in ("ai_cartoon", "ai_cinematic")
        rate_str = f"{int(round(((payload.voice_rate or 1.0) - 1.0) * 100)):+d}%"
        _default_style = _resolve_style(payload.visual_mode, payload.category)
        realistic_mode = _default_style in ("realistic", "realistic_car", "photorealistic") or payload.visual_mode in ("real_stock", "auto_real", "ai_realistic")
        import random as _random
        task_seed = _random.randint(1, 999999)
        _task_log(task_id, f"seed={task_seed}")

        # ---- Phase 1: voice + visuals per scene (voice∥stock concurrently) ----
        render_jobs: List[Dict[str, Any]] = []

        for idx, scene in enumerate(payload.scenes):
            s_num = scene.scene_number
            TASKS_DB[task_id]["progress"] = 12 + int((idx / num_scenes) * 33)
            TASKS_DB[task_id]["step"] = f"معالجة المشهد {s_num} من {num_scenes} (صوت ومرئيات)..."

            audio_path = str(work_dir / f"scene_{s_num}.mp3")
            raw_video_path = str(work_dir / f"raw_scene_{s_num}.mp4")

            if direct_ai:
                # 1. Generate Voice (then AI visuals need the exact duration)
                duration, word_timings = await generate_speech_for_scene(
                    text=scene.narration,
                    output_audio_path=audio_path,
                    voice=payload.voice,
                    rate=rate_str
                )
                _task_log(task_id, f"scene {s_num}: voice={duration:.1f}s words={len(word_timings or [])} media=AI-direct")
                # 2. AI visuals (cartoon / cinematic) with consistent seed
                downloaded = await fetch_media_for_scene(
                    query=scene.search_keywords,
                    output_path=raw_video_path,
                    duration=duration,
                    visual_mode=payload.visual_mode,
                    category=payload.category,
                    seed=task_seed
                )
            else:
                # Voice + stock search CONCURRENTLY (stock needs no duration),
                # AI generation only as fallback once duration is known.
                voice_task = generate_speech_for_scene(
                    text=scene.narration,
                    output_audio_path=audio_path,
                    voice=payload.voice,
                    rate=rate_str
                )
                stock_task = fetch_stock_only(
                    query=scene.search_keywords,
                    output_path=raw_video_path,
                    skip_cartoon=realistic_mode
                )
                (voice_result, stock_hit) = await asyncio.gather(voice_task, stock_task)
                duration, word_timings = voice_result
                if stock_hit:
                    downloaded = stock_hit
                    _task_log(task_id, f"scene {s_num}: voice={duration:.1f}s words={len(word_timings or [])} media=STOCK")
                else:
                    _task_log(task_id, f"scene {s_num}: voice={duration:.1f}s words={len(word_timings or [])} media=AI-fallback")
                    style = _resolve_style(payload.visual_mode, payload.category)
                    downloaded = None
                    queries = _build_real_query_list(scene.search_keywords, payload.category) if realistic_mode else [scene.search_keywords]
                    for q in queries:
                        downloaded = await generate_ai_visual_video(
                            prompt=q,
                            output_video_path=raw_video_path,
                            duration=duration,
                            style=style,
                            seed=task_seed
                        )
                        if downloaded:
                            break

            # Record subtitle segment
            subtitle_timings.append({
                "start": accumulated_time,
                "end": accumulated_time + duration,
                "text": scene.narration
            })
            # Collect word-level timings with absolute offsets (for karaoke/SRT)
            for w in word_timings or []:
                try:
                    word_events.append({
                        "word": w.get("word", ""),
                        "start": round(accumulated_time + float(w.get("start", 0)), 3),
                        "end": round(accumulated_time + float(w.get("end", 0)), 3),
                    })
                except Exception:
                    continue
            accumulated_time += duration

            if not downloaded:
                raise RuntimeError(f"تعذر جلب مرئيات المشهد {s_num} من كل المصادر")

            render_jobs.append({
                "s_num": s_num,
                "audio": audio_path,
                "raw": raw_video_path,
                "duration": duration,
                "out": str(work_dir / f"cut_scene_{s_num}.mp4"),
            })

        # ---- Phase 2: render all scenes CONCURRENTLY (bounded, FFmpeg is subprocess) ----
        TASKS_DB[task_id]["progress"] = 48
        TASKS_DB[task_id]["step"] = f"تركيب {len(render_jobs)} مشاهد بالتوازي ⚡..."
        _task_log(task_id, f"parallel render x{min(3, len(render_jobs))}")
        _render_sem = asyncio.Semaphore(3)
        _render_done = 0

        async def _render_one(job: Dict[str, Any]) -> Dict[str, Any]:
            nonlocal _render_done
            async with _render_sem:
                ok = await asyncio.to_thread(
                    render_scene_video,
                    job["raw"], job["audio"], job["duration"], job["out"]
                )
                _render_done += 1
                TASKS_DB[task_id]["progress"] = 48 + int((_render_done / len(render_jobs)) * 12)
                return {"s_num": job["s_num"], "ok": ok, "out": job["out"]}

        render_results = await asyncio.gather(*(_render_one(j) for j in render_jobs))
        failed = [r["s_num"] for r in render_results if not r.get("ok")]
        if failed:
            raise RuntimeError(f"فشل تركيب المشاهد: {failed}")
        scene_video_paths = [r["out"] for r in sorted(render_results, key=lambda r: r["s_num"])]
        _task_log(task_id, f"rendered {len(scene_video_paths)} scenes")

        # 4. Title & end cards (optional branding) — shift subtitle timings accordingly
        intro_dur = 0.0
        if payload.title_card and Path(FONT_PATH).exists():
            TASKS_DB[task_id]["progress"] = 62
            TASKS_DB[task_id]["step"] = "تجهيز بطاقة العنوان والخاتمة..."
            intro_path = str(work_dir / "card_intro.mp4")
            outro_path = str(work_dir / "card_outro.mp4")
            if create_text_card(payload.title, intro_path, 1.6, FONT_PATH):
                intro_dur = 1.6
                scene_video_paths.insert(0, intro_path)
            outro_dur = 0.0
            if create_text_card("تابعنا للمزيد", outro_path, 1.8, FONT_PATH):
                outro_dur = 1.8
                scene_video_paths.append(outro_path)
            if intro_dur:
                for seg in subtitle_timings:
                    seg["start"] += intro_dur
                    seg["end"] += intro_dur
                for w in word_events:
                    w["start"] = round(w["start"] + intro_dur, 3)
                    w["end"] = round(w["end"] + intro_dur, 3)
                accumulated_time += intro_dur + outro_dur

        # 5. Generate Subtitles File (Only if requested)
        # Karaoke word-pop style (default) or classic chunks per user choice.
        ass_path = None
        use_karaoke = False
        if payload.include_subtitles:
            TASKS_DB[task_id]["progress"] = 65
            TASKS_DB[task_id]["step"] = "تنسيق الترجمة بالخط العربي..."
            ass_path = str(work_dir / "subtitles.ass")
            if payload.subtitle_style != "classic" and word_events:
                create_karaoke_ass_file(word_timings=word_events, output_ass_path=ass_path, font_name="Tajawal")
                use_karaoke = True
            else:
                create_ass_subtitle_file(
                    scenes_timings=subtitle_timings,
                    output_ass_path=ass_path,
                    font_name="Tajawal"
                )

        # Persist timings for later SRT download
        timings_path = str(STORAGE_DIR / "output" / f"{task_id}_timings.json")
        save_timings_file(
            {"scenes": subtitle_timings, "words": word_events, "karaoke": use_karaoke},
            timings_path
        )

        # 5. Final Concat (Clean video or burned subtitles)
        TASKS_DB[task_id]["progress"] = 80
        TASKS_DB[task_id]["step"] = "دمج المشاهد وإخراج الفيديو النهائي (1080x1920)..."
        _task_log(task_id, f"concat {len(scene_video_paths)} clips total={accumulated_time:.1f}s subs={bool(ass_path)} karaoke={use_karaoke}")

        final_video_name = f"{task_id}.mp4"
        final_video_path = str(STORAGE_DIR / "output" / final_video_name)

        concatenate_and_add_subtitles(
            scene_video_paths=scene_video_paths,
            ass_subtitle_path=ass_path,
            output_final_path=final_video_path,
            font_file_path=FONT_PATH,
            burn_subtitles=payload.include_subtitles,
            total_duration=accumulated_time
        )

        # 6. Optional background music mix (non-blocking)
        if payload.music_enabled:
            TASKS_DB[task_id]["progress"] = 90
            TASKS_DB[task_id]["step"] = "مزج الموسيقى الخلفية..."
            music_file = next((str(f) for f in MUSIC_DIR.glob("background.*")), None)
            if music_file:
                ok = mix_background_music(final_video_path, music_file, volume=payload.music_volume)
                _task_log(task_id, f"music mix vol={payload.music_volume} ok={ok}")
            else:
                logger.warning("Music enabled but no track uploaded — skipping.")

        TASKS_DB[task_id]["progress"] = 100
        TASKS_DB[task_id]["status"] = "completed"
        TASKS_DB[task_id]["step"] = "تم إنتاج الفيديو بنجاح! جاهز للمعاينة والموافقة"
        TASKS_DB[task_id]["video_id"] = task_id
        TASKS_DB[task_id]["video_url"] = f"/api/video/stream/{task_id}"
        freed = _cleanup_workdir(task_id)
        _task_log(task_id, f"DONE freed={freed}MB")
        _persist_tasks()

        # Record to persistent history (including full script for reuse)
        save_history_item({
            "video_id": task_id,
            "title": payload.title,
            "description": payload.description,
            "tags": payload.tags,
            "category": payload.category,
            "visual_mode": payload.visual_mode,
            "voice": payload.voice,
            "scenes": [s.model_dump() for s in payload.scenes],
            "music_enabled": payload.music_enabled,
            "has_subtitles": payload.include_subtitles,
            "voice_rate": payload.voice_rate,
            "subtitle_style": payload.subtitle_style,
            "title_card": payload.title_card,
            "duration": round(accumulated_time, 1),
            "status": "completed",
            "published": False,
            "video_url": f"/api/video/stream/{task_id}"
        })

    except Exception as e:
        logger.exception(f"Pipeline failed for task {task_id}: {e}")
        TASKS_DB[task_id]["status"] = "failed"
        TASKS_DB[task_id]["error"] = str(e)
        TASKS_DB[task_id]["step"] = f"حدث خطأ أثناء المعالجة: {str(e)}"
        _task_log(task_id, f"FAILED: {e}")
        _persist_tasks()

MUSIC_DIR = STORAGE_DIR / "music"
ALLOWED_MUSIC_EXT = {".mp3", ".wav", ".m4a", ".ogg"}

@app.get("/api/music")
def list_music():
    """قائمة ملفات الموسيقى الخلفية المرفوعة."""
    items = []
    if MUSIC_DIR.exists():
        for f in sorted(MUSIC_DIR.iterdir()):
            if f.is_file() and f.suffix.lower() in ALLOWED_MUSIC_EXT:
                items.append({"name": f.name, "size_kb": round(f.stat().st_size / 1024)})
    return items

@app.post("/api/music/upload")
async def upload_music(file: UploadFile):
    """رفع ملف موسيقى خلفية (يحل محل السابق)."""
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_MUSIC_EXT:
        raise HTTPException(status_code=400, detail="صيغة غير مدعومة (MP3/WAV/M4A/OGG فقط)")
    MUSIC_DIR.mkdir(parents=True, exist_ok=True)
    # Keep a single active track + originals
    dest = MUSIC_DIR / f"background{suffix}"
    # Remove previous track with different extension
    for f in MUSIC_DIR.glob("background.*"):
        try:
            f.unlink()
        except Exception:
            pass
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="الملف كبير جداً (الحد 25MB)")
    with open(dest, "wb") as f:
        f.write(content)
    return {"success": True, "name": dest.name}

@app.get("/api/music/stream")
def stream_music():
    """تشغيل الموسيقى الخلفية الحالية للمعاينة."""
    for f in MUSIC_DIR.glob("background.*"):
        if f.suffix.lower() in ALLOWED_MUSIC_EXT:
            return FileResponse(path=str(f), media_type="audio/mpeg", filename=f.name)
    raise HTTPException(status_code=404, detail="لا توجد موسيقى مرفوعة")

# ----------------- Render Queue (sequential background production) -----------------
QUEUE_FILE = STORAGE_DIR / "queue.json"
QUEUE: List[Dict[str, Any]] = []
_queue_worker_running = False

def _save_queue() -> None:
    try:
        QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(QUEUE_FILE, "w", encoding="utf-8") as f:
            json.dump(QUEUE, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Could not persist queue: {e}")

def _load_queue() -> None:
    try:
        if QUEUE_FILE.exists():
            with open(QUEUE_FILE, "r", encoding="utf-8") as f:
                QUEUE.extend(json.load(f))
            for item in QUEUE:
                if item.get("status") == "processing":
                    item["status"] = "queued"  # resume after restart
            _save_queue()
    except Exception as e:
        logger.warning(f"Could not load queue: {e}")

def _create_task_entry(payload: RenderRequest) -> str:
    task_id = str(uuid.uuid4())[:8]
    TASKS_DB[task_id] = {
        "task_id": task_id,
        "status": "queued",
        "progress": 0,
        "step": "تم استلام الطلب وبدء المعالجة...",
        "title": payload.title,
        "description": payload.description,
        "tags": payload.tags
    }
    _persist_tasks()
    return task_id

async def _queue_worker() -> None:
    global _queue_worker_running
    if _queue_worker_running:
        return
    _queue_worker_running = True
    try:
        while True:
            nxt = next((q for q in QUEUE if q.get("status") == "queued"), None)
            if not nxt:
                break
            try:
                payload = RenderRequest(**nxt["payload"])
            except Exception as e:
                nxt["status"] = "failed"
                nxt["error"] = f"بيانات غير صالحة: {e}"
                _save_queue()
                continue
            nxt["status"] = "processing"
            task_id = _create_task_entry(payload)
            nxt["task_id"] = task_id
            _save_queue()
            await run_render_pipeline(task_id, payload)
            if TASKS_DB.get(task_id, {}).get("status") == "completed":
                nxt["status"] = "done"
                nxt["video_id"] = task_id
                from app.services.notify_service import notify_event
                notify_event(f"✅ اكتمل فيديو الطابور: {payload.title}")
            else:
                nxt["status"] = "failed"
                nxt["error"] = TASKS_DB.get(task_id, {}).get("error", "فشل غير معروف")
                from app.services.notify_service import notify_event
                notify_event(f"❌ فشل فيديو الطابور: {payload.title}\n{nxt['error']}")
            _save_queue()
    finally:
        _queue_worker_running = False

def _ensure_queue_worker() -> None:
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_queue_worker())
    except RuntimeError:
        pass  # no running loop (should not happen inside request handlers)

_load_queue()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: drop transient work dirs (outputs persist) + resume queued items
    try:
        temp_dir = STORAGE_DIR / "temp"
        if temp_dir.exists():
            for child in temp_dir.iterdir():
                try:
                    if child.is_dir():
                        import shutil as _shutil
                        _shutil.rmtree(child)
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"Startup temp cleanup skipped: {e}")
    _ensure_queue_worker()
    asyncio.create_task(_autopilot_loop())
    yield

app.router.lifespan_context = lifespan

# ----------------- Autopilot (daily scheduled production) -----------------
class AutopilotCreate(BaseModel):
    prompt: str
    category: str = "general"
    tone: str = "حماسي وملهم"
    duration: int = 35
    scene_count: int = 0
    voice: str = DEFAULT_VOICE
    visual_mode: str = "auto"
    include_subtitles: bool = False
    music_enabled: bool = False
    voice_rate: float = 1.0
    subtitle_style: str = "karaoke"
    title_card: bool = True
    time: str = "18:00"
    auto_publish: bool = False
    privacy: str = "unlisted"
    enabled: bool = True

async def run_schedule_job(schedule_id: str) -> Dict[str, Any]:
    """Execute one schedule: script -> render -> optional publish."""
    from app.services.script_service import generate_script_from_prompt
    schedules = load_schedules()
    sch = next((s for s in schedules if s.get("id") == schedule_id), None)
    if not sch:
        raise ValueError("الجدولة غير موجودة")

    logger.info(f"Autopilot: generating script for schedule {schedule_id}")
    # Prompt rotation: split by --- for a different topic each day
    raw_prompt = sch.get("prompt", "")
    variants = [v.strip() for v in raw_prompt.split("---") if v.strip()] or [raw_prompt]
    day_index = datetime.now().timetuple().tm_yday % len(variants)
    active_prompt = variants[day_index]
    logger.info(f"Autopilot: using prompt variant {day_index + 1}/{len(variants)}")
    data = generate_script_from_prompt(
        user_prompt=active_prompt,
        category=sch.get("category", "general"),
        tone=sch.get("tone", "حماسي وملهم"),
        target_duration_sec=sch.get("duration", 35),
        scene_count=sch.get("scene_count", 0)
    )
    payload = RenderRequest(
        title=data.get("title", "فيديو جديد"),
        description=data.get("description", ""),
        tags=data.get("tags", []),
        scenes=[SceneModel(**s) for s in data.get("scenes", [])],
        voice=sch.get("voice", DEFAULT_VOICE),
        category=sch.get("category", "general"),
        visual_mode=sch.get("visual_mode", "auto"),
        include_subtitles=sch.get("include_subtitles", False),
        music_enabled=sch.get("music_enabled", False),
        voice_rate=sch.get("voice_rate", 1.0),
        subtitle_style=sch.get("subtitle_style", "karaoke"),
        title_card=sch.get("title_card", True)
    )
    task_id = _create_task_entry(payload)
    await run_render_pipeline(task_id, payload)

    outcome: Dict[str, Any] = {"task_id": task_id}
    if TASKS_DB.get(task_id, {}).get("status") == "completed":
        outcome["status"] = "completed"
        outcome["video_id"] = task_id
        if sch.get("auto_publish"):
            try:
                video_file = STORAGE_DIR / "output" / f"{task_id}.mp4"
                thumb_path = str(STORAGE_DIR / "output" / f"{task_id}_thumb.jpg")
                generate_video_thumbnail(str(video_file), thumb_path)
                result = upload_short_to_youtube(
                    video_path=str(video_file),
                    title=payload.title,
                    description=payload.description,
                    tags=payload.tags,
                    privacy_status=sch.get("privacy", "unlisted"),
                    thumbnail_path=thumb_path if Path(thumb_path).exists() else None
                )
                update_history_item(task_id, {
                    "published": True,
                    "published_url": result.get("url"),
                    "youtube_video_id": result.get("video_id")
                })
                outcome["published_url"] = result.get("url")
            except Exception as e:
                logger.error(f"Autopilot publish failed for {task_id}: {e}")
                outcome["publish_error"] = str(e)
    else:
        outcome["status"] = "failed"
        outcome["error"] = TASKS_DB.get(task_id, {}).get("error")

    # Record run on the schedule
    for s in load_schedules():
        if s.get("id") == schedule_id:
            s["last_run"] = datetime.now().strftime("%Y-%m-%d")
            s["last_status"] = outcome.get("status")
            s["last_video_id"] = outcome.get("video_id")
            upsert_schedule(s)
            break
    from app.services.notify_service import notify_event
    if outcome.get("status") == "completed":
        extra = " 🚀 ونُشر على يوتيوب" if outcome.get("published_url") else ""
        notify_event(f"⏰ الطيار الآلي أنتج فيديو: {payload.title}{extra}")
    else:
        notify_event(f"⏰ الطيار الآلي فشل: {payload.title}\n{outcome.get('error') or outcome.get('publish_error') or ''}")
    return outcome

async def _autopilot_loop() -> None:
    """Background ticker: run due schedules (checked every 45s)."""
    while True:
        try:
            for sch in load_schedules():
                try:
                    if is_due(sch):
                        logger.info(f"Autopilot: schedule {sch.get('id')} is due, running...")
                        await run_schedule_job(sch["id"])
                except Exception as e:
                    logger.error(f"Autopilot job {sch.get('id')} failed: {e}")
        except Exception as e:
            logger.warning(f"Autopilot loop error: {e}")
        await asyncio.sleep(45)

@app.get("/api/autopilot")
def autopilot_list():
    return load_schedules()

@app.post("/api/autopilot")
def autopilot_create(req: AutopilotCreate):
    item = upsert_schedule(req.model_dump())
    return item

@app.patch("/api/autopilot/{schedule_id}")
def autopilot_update(schedule_id: str, updates: Dict[str, Any]):
    items = load_schedules()
    sch = next((s for s in items if s.get("id") == schedule_id), None)
    if not sch:
        raise HTTPException(status_code=404, detail="الجدولة غير موجودة")
    sch.update(updates)
    return upsert_schedule(sch)

@app.delete("/api/autopilot/{schedule_id}")
def autopilot_delete(schedule_id: str):
    if not delete_schedule(schedule_id):
        raise HTTPException(status_code=404, detail="الجدولة غير موجودة")
    return {"success": True}

@app.post("/api/autopilot/{schedule_id}/run-now")
async def autopilot_run_now(schedule_id: str, bg_tasks: BackgroundTasks):
    sch = next((s for s in load_schedules() if s.get("id") == schedule_id), None)
    if not sch:
        raise HTTPException(status_code=404, detail="الجدولة غير موجودة")
    bg_tasks.add_task(run_schedule_job, schedule_id)
    return {"success": True, "message": "بدأ التنفيذ الفوري في الخلفية"}

@app.post("/api/queue/add")
async def queue_add(payload: RenderRequest):
    qid = str(uuid.uuid4())[:8]
    QUEUE.append({
        "queue_id": qid,
        "title": payload.title,
        "category": payload.category,
        "visual_mode": payload.visual_mode,
        "status": "queued",
        "task_id": None,
        "video_id": None,
        "error": None,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "payload": payload.model_dump()
    })
    _save_queue()
    _ensure_queue_worker()
    position = sum(1 for q in QUEUE if q.get("status") in ("queued", "processing"))
    return {"queue_id": qid, "position": position}

@app.get("/api/queue")
def queue_list():
    return QUEUE

@app.delete("/api/queue/{qid}")
def queue_remove(qid: str):
    global QUEUE
    item = next((q for q in QUEUE if q.get("queue_id") == qid), None)
    if not item:
        raise HTTPException(status_code=404, detail="العنصر غير موجود في الطابور")
    if item.get("status") == "processing":
        raise HTTPException(status_code=400, detail="لا يمكن حذف عنصر قيد المعالجة حالياً")
    QUEUE = [q for q in QUEUE if q.get("queue_id") != qid]
    _save_queue()
    return {"success": True}

@app.post("/api/video/render")
async def trigger_render(payload: RenderRequest, bg_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())[:8]
    TASKS_DB[task_id] = {
        "task_id": task_id,
        "status": "queued",
        "progress": 0,
        "step": "تم استلام الطلب وبدء المعالجة...",
        "title": payload.title,
        "description": payload.description,
        "tags": payload.tags
    }
    _persist_tasks()
    bg_tasks.add_task(run_render_pipeline, task_id, payload)
    return {"task_id": task_id, "status": "queued"}

@app.get("/api/video/status/{task_id}")
def get_task_status(task_id: str):
    if task_id not in TASKS_DB:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    return TASKS_DB[task_id]

@app.get("/api/video/stream/{video_id}")
def stream_video(video_id: str):
    video_file = STORAGE_DIR / "output" / f"{video_id}.mp4"
    if not video_file.exists():
        raise HTTPException(status_code=404, detail="ملف الفيديو غير موجود")
    return FileResponse(path=str(video_file), media_type="video/mp4", filename=f"short_{video_id}.mp4")

@app.get("/api/video/thumb/{video_id}")
def get_video_thumbnail(video_id: str):
    thumb_file = STORAGE_DIR / "output" / f"{video_id}_thumb.jpg"
    if not thumb_file.exists():
        # Generate on demand for older videos (best effort)
        video_file = STORAGE_DIR / "output" / f"{video_id}.mp4"
        if video_file.exists():
            generate_video_thumbnail(str(video_file), str(thumb_file))
    if not thumb_file.exists():
        raise HTTPException(status_code=404, detail="لا توجد مصغرة لهذا الفيديو")
    return FileResponse(path=str(thumb_file), media_type="image/jpeg", filename=f"thumb_{video_id}.jpg")

@app.get("/api/video/srt/{video_id}")
def download_srt(video_id: str):
    timings_file = STORAGE_DIR / "output" / f"{video_id}_timings.json"
    if not timings_file.exists():
        raise HTTPException(status_code=404, detail="لا توجد توقيتات ترجمة لهذا الفيديو")
    try:
        with open(timings_file, "r", encoding="utf-8") as f:
            timings = json.load(f)
        srt_text = timings_to_srt(timings)
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(
            content=srt_text,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=short_{video_id}.srt"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/youtube/stats")
def youtube_stats(ids: str = ""):
    """إحصائيات المشاهدات/الإعجابات لفيديوهات منشورة (ids مفصولة بفواصل)."""
    try:
        video_ids = [v.strip() for v in (ids or "").split(",") if v.strip()]
        return get_video_stats(video_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video/log/{task_id}")
def get_task_log(task_id: str):
    """السجل التقني لعملية الإنتاج (لتشخيص الأعطال)."""
    log_path = STORAGE_DIR / "temp" / task_id / "render.log"
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="لا يوجد سجل لهذه المهمة")
    return PlainTextResponse(content=log_path.read_text(encoding="utf-8"), media_type="text/plain; charset=utf-8")

def _dir_mb(path: Path) -> float:
    total = 0
    if path.exists():
        for f in path.rglob("*"):
            try:
                if f.is_file():
                    total += f.stat().st_size
            except Exception:
                pass
    return round(total / (1024 * 1024), 1)

@app.get("/api/storage/stats")
def storage_stats():
    """حجم التخزين المستخدم (المخرجات + المؤقت + الموسيقى)."""
    videos = len(list((STORAGE_DIR / "output").glob("*.mp4"))) if (STORAGE_DIR / "output").exists() else 0
    return {
        "output_mb": _dir_mb(STORAGE_DIR / "output"),
        "temp_mb": _dir_mb(STORAGE_DIR / "temp"),
        "music_mb": _dir_mb(STORAGE_DIR / "music"),
        "videos": videos,
    }

@app.post("/api/storage/cleanup")
def storage_cleanup():
    """حذف الملفات المؤقتة فقط (المخرجات والموسيقى آمنة)."""
    before = _dir_mb(STORAGE_DIR / "temp")
    temp_dir = STORAGE_DIR / "temp"
    if temp_dir.exists():
        for child in temp_dir.iterdir():
            try:
                if child.is_dir():
                    import shutil as _shutil
                    _shutil.rmtree(child)
                else:
                    child.unlink()
            except Exception as e:
                logger.warning(f"Cleanup skipped {child}: {e}")
    freed = round(before - _dir_mb(temp_dir), 1)
    return {"success": True, "freed_mb": freed}

@app.post("/api/queue/{qid}/retry")
def queue_retry(qid: str):
    """إعادة عنصر فاشل إلى الانتظار."""
    item = next((q for q in QUEUE if q.get("queue_id") == qid), None)
    if not item:
        raise HTTPException(status_code=404, detail="العنصر غير موجود في الطابور")
    if item.get("status") not in ("failed", "done"):
        raise HTTPException(status_code=400, detail="فقط العناصر الفاشلة أو المنتهية قابلة لإعادة التشغيل")
    item["status"] = "queued"
    item["error"] = None
    item["task_id"] = None
    _save_queue()
    _ensure_queue_worker()
    return {"success": True}

@app.get("/api/backup")
def backup_export():
    """Export all app data (settings, history, schedules, queue) as JSON. Videos excluded."""
    from app.services.history_service import HISTORY_FILE
    history = load_history()
    return {
        "app": "contentflow",
        "version": 1,
        "exported_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "settings": load_settings(),
        "history": history,
        "schedules": load_schedules(),
        "queue": QUEUE,
    }

@app.post("/api/backup/restore")
def backup_restore(bundle: Dict[str, Any]):
    """Restore app data from a backup bundle (overwrites current data)."""
    try:
        if bundle.get("app") != "contentflow":
            raise ValueError("ملف النسخة غير صالح")
        if "settings" in bundle:
            save_settings(bundle["settings"])
        if "history" in bundle:
            from app.services.history_service import HISTORY_FILE
            HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(bundle["history"], f, ensure_ascii=False, indent=2)
        if "schedules" in bundle:
            from app.services.autopilot_service import save_schedules
            save_schedules(bundle["schedules"])
        global QUEUE
        if "queue" in bundle:
            QUEUE = bundle["queue"]
            _save_queue()
        _ensure_queue_worker()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class NotifyTestRequest(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

@app.post("/api/notify/test")
def notify_test(req: NotifyTestRequest):
    from app.services.notify_service import send_telegram
    ok = send_telegram(
        "✅ ContentFlow: التنبيهات تعمل بنجاح!",
        bot_token=req.bot_token or None,
        chat_id=req.chat_id or None
    )
    if not ok:
        raise HTTPException(status_code=400, detail="تعذر الإرسال — تحقق من التوكن ومعرف المحادثة")
    return {"success": True}

@app.post("/api/youtube/publish")
def publish_to_youtube(req: PublishRequest):
    video_file = STORAGE_DIR / "output" / f"{req.video_id}.mp4"
    if not video_file.exists():
        raise HTTPException(status_code=404, detail="ملف الفيديو المطلوب نشره غير موجود")
    
    try:
        # Auto-generate a thumbnail from the video (best effort)
        thumb_path = str(STORAGE_DIR / "output" / f"{req.video_id}_thumb.jpg")
        generate_video_thumbnail(str(video_file), thumb_path)
        result = upload_short_to_youtube(
            video_path=str(video_file),
            title=req.title,
            description=req.description,
            tags=req.tags,
            privacy_status=req.privacy,
            thumbnail_path=thumb_path if Path(thumb_path).exists() else None,
            publish_at=req.publish_at
        )
        # Update history with published link
        update_history_item(req.video_id, {
            "published": True,
            "published_url": result.get("url"),
            "youtube_video_id": result.get("video_id")
        })
        return result
    except Exception as e:
        logger.error(f"Failed to publish to YouTube: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def get_history_endpoint():
    return load_history()

@app.delete("/api/history/{video_id}")
def delete_history_endpoint(video_id: str):
    delete_history_item(video_id)
    return {"success": True}

@app.get("/api/youtube/auth")
def trigger_youtube_auth():
    try:
        success = start_local_auth_flow()
        return {"success": success, "message": "تم توثيق حساب يوتيوب وحفظ الجلسة بنجاح"}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
