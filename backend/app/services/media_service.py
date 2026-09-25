import urllib.parse
import subprocess
import logging
from pathlib import Path
from typing import Optional, List
import httpx
from app.services.settings_service import load_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ALL visual options — cartoon AND realistic side by side.
# visual_mode values:
#   - "ai_cartoon":   3D cartoon for kids (Pixar-style AI image -> animated video)
#   - "ai_cinematic": cinematic illustration for stories/mystery
#   - "real_stock":   REAL stock footage only (Pexels -> Pixabay, multi-query)
#   - "ai_realistic": photorealistic AI (real cars, anti-cartoon prompt, no key)
#   - "auto_real":    real stock first, realistic AI fallback — recommended for cars
#   - "auto"/"stock" (legacy): smart routing by category (kids -> cartoon, else real)
# ---------------------------------------------------------------------------

# Fallback queries for real-car stock search.
REAL_CAR_FALLBACK_QUERIES = [
    "red sports car driving on road",
    "luxury car night city street",
    "car drifting smoke closeup",
    "supercar highway speed",
    "classic car detail headlight",
    "car wheel driving motion",
]

GENERIC_REAL_FALLBACK_QUERIES = [
    "cinematic city night lights vertical",
    "dramatic desert landscape aerial",
    "people walking busy street real life",
]

# Words marking a stock result as cartoonish (skipped in realistic modes only).
CARTOON_HINTS = (
    "cartoon", "animation", "animated", "toy", "pixar", "disney",
    "3d render", "drawing", "illustration", "anime", "claymation", "kids",
)

ANTI_CARTOON_NEGATIVE = (
    "photorealistic, real photography, real car, cinematic film still, "
    "8k, ultra detailed, natural lighting, motion blur on background. "
    "STRICTLY NO cartoon, NO toy car, NO 3d render, NO pixar, NO disney, "
    "NO drawing, NO illustration, NO anime, NO claymation, NO kids style"
)

# AI image models to try in order (pollinations.ai, no key required).
AI_IMAGE_MODELS = ("flux", "turbo")


def _ai_image_url(enhanced_prompt: str, model: str) -> str:
    """Build a pollinations.ai image URL (pure helper, unit-tested)."""
    encoded = urllib.parse.quote(enhanced_prompt)
    return (f"https://image.pollinations.ai/prompt/{encoded}"
            f"?width=1080&height=1920&nologo=true&model={model}")


def _with_seed(url: str, seed: Optional[int]) -> str:
    if seed is None:
        return url
    return f"{url}&seed={int(seed) % 2147483647}"


def _sanitize_query_for_realism(query: str) -> str:
    """Remove cartoonish words so realistic search/AI prompts return real footage."""
    q = (query or "").lower()
    for bad in ("cartoon", "3d", "pixar", "disney", "toy", "cute", "kids",
                "kid", "animation", "animated", "anime", "drawing", "illustration"):
        q = q.replace(bad, " ")
    q = " ".join(q.split())
    if not q:
        q = "real sports car driving"
    elif "real" not in q and "cinematic" not in q:
        q = f"real {q}"
    return q.strip()


def _looks_cartoonish(*texts: str) -> bool:
    text = " ".join(t or "" for t in texts).lower()
    return any(hint in text for hint in CARTOON_HINTS)


def _build_real_query_list(query: str, category: str) -> List[str]:
    """Original query first, then smart realistic alternatives."""
    queries = []
    clean = _sanitize_query_for_realism(query)
    if clean:
        queries.append(clean)
    if "car" in (category or "") or "car" in clean or "vehicle" in clean:
        for fb in REAL_CAR_FALLBACK_QUERIES:
            if fb not in queries:
                queries.append(fb)
    else:
        for fb in GENERIC_REAL_FALLBACK_QUERIES:
            if fb not in queries:
                queries.append(fb)
        for fb in REAL_CAR_FALLBACK_QUERIES[:2]:
            queries.append(fb)
    return queries


def _enhance_prompt(prompt: str, style: str) -> str:
    """Build the AI image prompt per style (cartoon OR realistic)."""
    if style == "kids_cartoon":
        return (f"3D Disney Pixar cute animation style, {prompt}, vibrant bright colors, "
                f"playful, friendly, cinematic lighting, vertical 9:16, 8k, ultra detailed, masterpiece")
    if style == "cinematic_story":
        return (f"Cinematic historical illustration, dramatic lighting, storytelling atmosphere, "
                f"{prompt}, vertical portrait 9:16, masterpiece, 8k, trending on artstation")
    # realistic / realistic_car / photorealistic
    clean = _sanitize_query_for_realism(prompt)
    return (f"{clean}, {ANTI_CARTOON_NEGATIVE}, "
            f"dynamic action shot, subject in motion, vertical 9:16 composition")


async def generate_ai_visual_video(
    prompt: str,
    output_video_path: str,
    duration: float = 5.0,
    style: str = "3d_cartoon",
    seed: Optional[int] = None
) -> Optional[str]:
    """
    توليد مرئيات بالذكاء الاصطناعي (صورة -> فيديو متحرك 1080x1920).
    الأنماط: kids_cartoon (كرتون أطفال) | cinematic_story | realistic (سيارة حقيقية).
    seed: رقم ثابت لكل فيديو لثبات الأسلوب/الشخصية عبر مشاهده.
    """
    # Backward-compat alias
    if style == "3d_cartoon":
        style = "kids_cartoon"
    temp_img_path = str(Path(output_video_path).with_suffix(".jpg"))
    enhanced_prompt = _enhance_prompt(prompt, style)

    image_bytes: Optional[bytes] = None
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            for model in AI_IMAGE_MODELS:
                try:
                    url = _with_seed(_ai_image_url(enhanced_prompt, model), seed)
                    resp = await client.get(url, follow_redirects=True)
                    if resp.status_code == 200 and len(resp.content) > 20_000:
                        image_bytes = resp.content
                        break
                    logger.warning(f"AI image model '{model}' returned {resp.status_code}, trying next...")
                except Exception as e:
                    logger.warning(f"AI image model '{model}' failed: {e}, trying next...")
            if image_bytes is None:
                logger.error("All AI image models failed")
                return None
            with open(temp_img_path, "wb") as f:
                f.write(image_bytes)
    except Exception as e:
        logger.error(f"Error calling AI image generator: {e}")
        return None

    # Camera motion: energetic push-in for realistic, gentle zoom for cartoon.
    # 25 fps * duration = total frames
    frames = int(duration * 25)
    if style in ("realistic", "realistic_car", "photorealistic"):
        vf = (
            "scale=2160:3840:force_original_aspect_ratio=increase,"
            "crop=2160:3840,"
            f"zoompan=z='min(1.0+0.0028*on,1.45)':d={frames}:"
            "x='iw/2-(iw/zoom/2)+20*on/25':y='ih/2-(ih/zoom/2)':s=1080x1920,"
            "fps=25"
        )
    else:
        vf = (f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
              f"zoompan=z='min(zoom+0.0012,1.25)':d={frames}:"
              f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920,fps=25")

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", temp_img_path,
        "-t", f"{duration:.3f}",
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        output_video_path
    ]

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return output_video_path
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg AI image to video conversion failed: {e.stderr}")
        return None
    finally:
        try:
            if Path(temp_img_path).exists():
                Path(temp_img_path).unlink()
        except Exception:
            pass


async def _download_file(client: httpx.AsyncClient, url: str, output_path: str) -> Optional[str]:
    try:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        async with client.stream("GET", url) as stream_resp:
            if stream_resp.status_code == 200:
                with open(output_path, "wb") as f:
                    async for chunk in stream_resp.aiter_bytes(chunk_size=1024 * 64):
                        f.write(chunk)
                if Path(output_path).stat().st_size > 10_000:
                    return output_path
    except Exception as e:
        logger.warning(f"Download failed for {url}: {e}")
    return None


def _pick_best_portrait_file(video_files: list) -> Optional[str]:
    """Pick the portrait file with quality closest to 1080p (good quality, sane size)."""
    if not video_files:
        return None
    portrait = [f for f in video_files if (f.get("height", 0) or 0) >= (f.get("width", 0) or 0)]
    pool = portrait or video_files
    pool = [f for f in pool if f.get("link") and (f.get("height", 0) or 0) >= 480]
    if not pool:
        pool = [f for f in (portrait or video_files) if f.get("link")]
    if not pool:
        return None
    pool.sort(key=lambda x: abs((x.get("height") or 1080) - 1080))
    return pool[0].get("link")


async def search_pexels_video(query: str, api_key: str, output_path: str,
                              skip_cartoon: bool = False) -> Optional[str]:
    """Search Pexels; multi-query attempts; optionally skip cartoonish results."""
    headers = {"Authorization": api_key}
    url = "https://api.pexels.com/videos/search"
    queries = _build_real_query_list(query, "general") if skip_cartoon else [query]

    async with httpx.AsyncClient(timeout=30.0) as client:
        for q in queries:
            try:
                resp = await client.get(url, headers=headers,
                                        params={"query": q, "orientation": "portrait", "per_page": 10})
                if resp.status_code != 200:
                    continue
                for video in resp.json().get("videos", []):
                    if skip_cartoon and _looks_cartoonish(video.get("url", ""), str(video.get("id", ""))):
                        continue
                    link = _pick_best_portrait_file(video.get("video_files", []))
                    if link and not (skip_cartoon and _looks_cartoonish(link)):
                        got = await _download_file(client, link, output_path)
                        if got:
                            logger.info(f"Pexels hit: '{q}'")
                            return got
            except Exception as e:
                logger.warning(f"Pexels search '{q}' failed: {e}")
                continue
    return None


async def search_pixabay_video(query: str, api_key: str, output_path: str,
                               skip_cartoon: bool = False) -> Optional[str]:
    """Search Pixabay; multi-query attempts; optionally skip cartoonish results."""
    url = "https://pixabay.com/api/videos/"
    queries = _build_real_query_list(query, "general") if skip_cartoon else [query]

    async with httpx.AsyncClient(timeout=30.0) as client:
        for q in queries:
            try:
                resp = await client.get(url, params={"key": api_key, "q": q,
                                                     "video_type": "all", "per_page": 8})
                if resp.status_code != 200:
                    continue
                for hit in resp.json().get("hits", []):
                    if skip_cartoon and _looks_cartoonish(hit.get("tags", ""), hit.get("pageURL", "")):
                        continue
                    videos = hit.get("videos", {}) or {}
                    for quality in ("large", "medium", "small"):
                        link = (videos.get(quality) or {}).get("url")
                        if link and not (skip_cartoon and _looks_cartoonish(link)):
                            got = await _download_file(client, link, output_path)
                            if got:
                                logger.info(f"Pixabay hit: '{q}'")
                                return got
            except Exception as e:
                logger.warning(f"Pixabay search '{q}' failed: {e}")
                continue
    return None


def _resolve_style(visual_mode: str, category: str) -> str:
    """Map visual_mode + category to an AI style (used when AI generation is needed)."""
    if visual_mode == "ai_cartoon":
        return "kids_cartoon"
    if visual_mode == "ai_cinematic":
        return "cinematic_story"
    if visual_mode in ("ai_realistic", "auto_real", "real_stock"):
        if category in ("cinematic_story", "mystery_tales"):
            return "cinematic_story"
        return "realistic"
    # auto / stock legacy: kids categories -> cartoon, everything else -> realistic
    if "kids" in (category or ""):
        return "kids_cartoon"
    if category in ("cinematic_story", "mystery_tales"):
        return "cinematic_story"
    return "realistic"


async def fetch_media_for_scene(
    query: str,
    output_path: str,
    duration: float = 5.0,
    visual_mode: str = "auto",
    category: str = "general",
    seed: Optional[int] = None
) -> Optional[str]:
    """
    جلب مرئيات المشهد — كل الخيارات متاحة:
      - "ai_cartoon":   كرتون 3D للأطفال (مباشرة بالذكاء الاصطناعي)
      - "ai_cinematic": لوحات سينمائية للقصص
      - "real_stock":   فيديو ستوك حقيقي فقط (Pexels ثم Pixabay + بحث موسّع)
      - "ai_realistic": سيارة/مشهد حقيقي بالذكاء الاصطناعي (بدون مفاتيح)
      - "auto_real":    ستوك حقيقي أولاً ثم AI واقعي — موصى به للسيارات الحقيقية
      - "auto":         ذكي حسب الفئة (أطفال -> كرتون، سيارات حقيقية/قصص -> واقعي)
    """
    settings = load_settings()
    media_conf = settings.get("media", {})
    style = _resolve_style(visual_mode, category)
    realistic = style in ("realistic", "realistic_car", "photorealistic") or visual_mode in ("real_stock", "auto_real", "ai_realistic")

    async def try_stock() -> Optional[str]:
        pexels_key = media_conf.get("pexels_api_key")
        if pexels_key:
            res = await search_pexels_video(query, pexels_key, output_path, skip_cartoon=realistic)
            if res:
                return res
        pixabay_key = media_conf.get("pixabay_api_key")
        if pixabay_key:
            res = await search_pixabay_video(query, pixabay_key, output_path, skip_cartoon=realistic)
            if res:
                return res
        return None

    # Cartoon / cinematic AI modes go straight to AI generation.
    if visual_mode in ("ai_cartoon", "ai_cinematic"):
        ai_res = await generate_ai_visual_video(prompt=query, output_video_path=output_path,
                                                duration=duration, style=style, seed=seed)
        if ai_res:
            return ai_res
        return await try_stock()

    # Stock-first modes (real_stock / auto_real / auto / stock legacy).
    stock_res = await try_stock()
    if stock_res:
        return stock_res
    if visual_mode == "real_stock":
        logger.warning("No real stock footage found — falling back to realistic AI so production never stops.")

    # Fallback: AI generation in the resolved style (cartoon for kids, realistic otherwise).
    if realistic:
        for q in _build_real_query_list(query, category):
            ai_res = await generate_ai_visual_video(prompt=q, output_video_path=output_path,
                                                    duration=duration, style=style, seed=seed)
            if ai_res:
                return ai_res
        return None

    return await generate_ai_visual_video(prompt=query or "colorful cinematic vertical scene",
                                          output_video_path=output_path,
                                          duration=duration, style=style, seed=seed)


async def fetch_stock_only(
    query: str,
    output_path: str,
    skip_cartoon: bool = False
) -> Optional[str]:
    """
    بحث الستوك فقط (Pexels ثم Pixabay) — للتشغيل المتزامن مع توليد الصوت.
    لا يرمي استثناءات أبداً: يعيد None عند الفشل ليُستخدم التوليد كاحتياطي.
    """
    try:
        settings = load_settings()
        media_conf = settings.get("media", {})
        pexels_key = media_conf.get("pexels_api_key")
        if pexels_key:
            res = await search_pexels_video(query, pexels_key, output_path, skip_cartoon=skip_cartoon)
            if res:
                return res
        pixabay_key = media_conf.get("pixabay_api_key")
        if pixabay_key:
            res = await search_pixabay_video(query, pixabay_key, output_path, skip_cartoon=skip_cartoon)
            if res:
                return res
    except Exception as e:
        logger.warning(f"Stock-only fetch failed for '{query}': {e}")
    return None
