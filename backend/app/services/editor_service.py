import os
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import arabic_reshaper
from bidi.algorithm import get_display

logger = logging.getLogger(__name__)

def shape_arabic(text: str) -> str:
    """
    إعادة تشكيل وعكس النص العربي لضمان ظهوره متصلاً ومن اليمين لليسار في FFmpeg/ASS
    """
    try:
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except Exception as e:
        logger.warning(f"Error shaping arabic text: {e}")
        return text

def _chunk_narration(text: str, max_words: int = 8) -> List[str]:
    """Split a long narration into short readable chunks for subtitles."""
    words = (text or "").split()
    if len(words) <= max_words:
        return [" ".join(words)] if words else [text]
    return [" ".join(words[i:i + max_words]) for i in range(0, len(words), max_words)]


def create_ass_subtitle_file(
    scenes_timings: List[Dict[str, Any]], 
    output_ass_path: str,
    font_name: str = "Tajawal"
) -> str:
    """
    إنشاء ملف ترجمة ASS احترافي للفيديوهات القصيرة (Safe-Zone، ألوان عصرية، وحدود سوداء بارزة).
    """
    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},62,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,5,0,2,80,80,680,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []

    for item in scenes_timings:
        start_sec = item["start"]
        end_sec = item["end"]
        raw_text = item["text"]

        # Format time to H:MM:SS.cs
        def format_time(s: float) -> str:
            hours = int(s // 3600)
            minutes = int((s % 3600) // 60)
            seconds = s % 60
            return f"{hours}:{minutes:02d}:{seconds:05.2f}"

        # Split long narrations into short chunks distributed proportionally
        # across the scene duration (much more readable than one full block).
        chunks = _chunk_narration(raw_text)
        total_words = max(1, sum(len(c.split()) for c in chunks))
        cursor = start_sec
        total_span = max(0.5, end_sec - start_sec)

        for chunk in chunks:
            weight = len(chunk.split()) / total_words
            chunk_end = cursor + total_span * weight
            shaped_text = shape_arabic(chunk)
            events.append(f"Dialogue: 0,{format_time(cursor)},{format_time(chunk_end)},Default,,0,0,0,,{shaped_text}")
            cursor = chunk_end

    full_ass = ass_header + "\n".join(events) + "\n"
    
    Path(output_ass_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_ass_path, "w", encoding="utf-8-sig") as f:
        f.write(full_ass)

    return output_ass_path

def render_scene_video(
    video_input_path: str,
    audio_input_path: str,
    duration: float,
    output_path: str
) -> bool:
    """
    قص وضبط أبعاد فيديو المشهد إلى 1080x1920 رأسي ودمجه مع صوته بالمدة المحددة تماماً.
    مع تطبيع مستوى الصوت (loudnorm) وتلاشي ناعم في البداية والنهاية لتجنب الطقطقة.
    """
    # Filter scales to fit 1080x1920 and center crops + cinematic grade
    # (subtle vignette + contrast/saturation lift for a filmic look)
    vf = ("scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,"
          "vignette=PI/4.5,eq=contrast=1.06:saturation=1.12")

    # Audio polish: normalize loudness + short fades (guarded for very short scenes)
    fade_out_start = max(0.2, duration - 0.6)
    af = (f"loudnorm=I=-16:TP=-1.5:LRA=11,"
          f"afade=t=in:st=0:d=0.25,afade=t=out:st={fade_out_start:.3f}:d=0.5")

    cmd = [
        "ffmpeg", "-y",
        "-stream_loop", "-1",
        "-i", video_input_path,
        "-i", audio_input_path,
        "-t", f"{duration:.3f}",
        "-vf", vf,
        "-af", af,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        output_path
    ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg scene render error: {e.stderr}")
        return False

def concatenate_and_add_subtitles(
    scene_video_paths: List[str],
    ass_subtitle_path: Optional[str],
    output_final_path: str,
    font_file_path: Optional[str] = None,
    burn_subtitles: bool = False,
    total_duration: float = 0.0
) -> bool:
    """
    دمج مشاهد الفيديو، مع خيار اختياري لحرق الترجمة (Burn-in subtitles).
    إذا كان burn_subtitles = False، يتم إنتاج الفيديو نقياً ومباشراً وبسرعة فائقة.
    يضيف تلاشياً سينمائياً (fade in/out) في بداية/نهاية الفيديو النهائي.
    """
    temp_dir = Path(output_final_path).parent / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    concat_list_file = temp_dir / "concat_list.txt"
    with open(concat_list_file, "w", encoding="utf-8") as f:
        for vp in scene_video_paths:
            clean_path = str(Path(vp).resolve()).replace("\\", "/")
            f.write(f"file '{clean_path}'\n")

    # Cinematic fade filter for the final video (needs re-encode when applied)
    fade_vf = None
    if total_duration and total_duration > 2.0:
        fade_out_start = max(0.5, total_duration - 0.6)
        fade_vf = f"fade=t=in:st=0:d=0.5,fade=t=out:st={fade_out_start:.3f}:d=0.6"

    # If subtitles are disabled, produce clean video (re-encode only for fades)
    if not burn_subtitles or not ass_subtitle_path or not Path(ass_subtitle_path).exists():
        if fade_vf:
            final_cmd = [
                "ffmpeg", "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_list_file),
                "-vf", fade_vf,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "20",
                "-c:a", "copy",
                "-movflags", "+faststart",
                output_final_path
            ]
        else:
            final_cmd = [
                "ffmpeg", "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_list_file),
                "-c", "copy",
                "-movflags", "+faststart",
                output_final_path
            ]
        try:
            subprocess.run(final_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg concat direct error: {e.stderr}")
            return False

    # Otherwise, burn subtitles using libass
    unsubbed_video = temp_dir / "merged_no_sub.mp4"
    concat_cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list_file),
        "-c", "copy",
        str(unsubbed_video)
    ]
    subprocess.run(concat_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    ass_clean = str(Path(ass_subtitle_path).resolve()).replace("\\", "/").replace(":", "\\:")
    sub_filter = f"subtitles='{ass_clean}'"
    if font_file_path and Path(font_file_path).exists():
        font_dir = str(Path(font_file_path).parent.resolve()).replace("\\", "/").replace(":", "\\:")
        sub_filter = f"subtitles='{ass_clean}':fontsdir='{font_dir}'"
    if fade_vf:
        sub_filter = f"{sub_filter},{fade_vf}"

    burn_cmd = [
        "ffmpeg", "-y",
        "-i", str(unsubbed_video),
        "-vf", sub_filter,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-c:a", "copy",
        "-movflags", "+faststart",
        output_final_path
    ]

    try:
        subprocess.run(burn_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg burn subtitle error: {e.stderr}")
        copy_cmd = ["ffmpeg", "-y", "-i", str(unsubbed_video), "-c", "copy", "-movflags", "+faststart", output_final_path]
        subprocess.run(copy_cmd, check=True)
        return True


def mix_background_music(
    video_path: str,
    music_path: str,
    volume: float = 0.12
) -> bool:
    """
    مزج موسيقى خلفية هادئة (تتكرر بطول الفيديو) مع صوت التعليق.
    غير قاتل: يعيد False عند الفشل ويبقى الفيديو الأصلي سليماً.
    """
    if not Path(music_path).exists() or not Path(video_path).exists():
        return False
    vol = max(0.03, min(volume, 0.35))
    tmp_out = str(Path(video_path).with_suffix(".music.mp4"))
    # Music looped + lowered, ducked under voice via amix (voice stays dominant)
    fc = (f"[1:a]aloop=loop=-1:size=2e9,volume={vol:.3f},afade=t=in:st=0:d=1[m];"
          f"[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]")
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-stream_loop", "-1",
        "-i", music_path,
        "-filter_complex", fc,
        "-map", "0:v",
        "-map", "[a]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        tmp_out
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        Path(tmp_out).replace(video_path)
        return True
    except subprocess.CalledProcessError as e:
        logger.warning(f"Background music mix failed: {e.stderr}")
        try:
            if Path(tmp_out).exists():
                Path(tmp_out).unlink()
        except Exception:
            pass
        return False


def create_karaoke_ass_file(
    word_timings: List[Dict[str, Any]],
    output_ass_path: str,
    font_name: str = "Tajawal"
) -> str:
    """
    ترجمة كاريوكي بأسلوب تيك توك: كلمة نابضة كبيرة تظهر لحظة نطقها.
    word_timings: [{word, start, end}] بأوقات مطلقة على كامل الفيديو.
    """
    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Word,{font_name},96,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,0,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    def format_time(s: float) -> str:
        hours = int(s // 3600)
        minutes = int((s % 3600) // 60)
        seconds = s % 60
        return f"{hours}:{minutes:02d}:{seconds:05.2f}"

    events = []
    for w in word_timings:
        text = (w.get("word") or "").strip()
        if not text:
            continue
        start = max(0.0, float(w.get("start", 0)))
        end = max(start + 0.15, float(w.get("end", start + 0.3)))
        shaped = shape_arabic(text)
        events.append(f"Dialogue: 0,{format_time(start)},{format_time(end)},Word,,0,0,0,,{shaped}")

    Path(output_ass_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_ass_path, "w", encoding="utf-8-sig") as f:
        f.write(ass_header + "\n".join(events) + "\n")
    return output_ass_path


def save_timings_file(timings: Dict[str, Any], output_path: str) -> str:
    """حفظ توقيتات المشاهد والكلمات لاستخدامها لاحقاً (SRT وغيره)."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        import json as _json
        _json.dump(timings, f, ensure_ascii=False, indent=2)
    return output_path


def timings_to_srt(timings: Dict[str, Any]) -> str:
    """تحويل التوقيتات المحفوظة إلى صيغة SRT (للرفع اليدوي على تيك توك/يوتيوب)."""
    def srt_time(s: float) -> str:
        ms = int(round(s * 1000))
        h, ms = divmod(ms, 3600000)
        m, ms = divmod(ms, 60000)
        sec, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"

    lines = []
    idx = 1
    words = timings.get("words") or []
    if words:
        # Group words into ~6-word cues
        chunk: List[str] = []
        start = None
        for w in words:
            text = (w.get("word") or "").strip()
            if not text:
                continue
            if start is None:
                start = float(w.get("start", 0))
            chunk.append(text)
            if len(chunk) >= 6:
                lines.append(f"{idx}\n{srt_time(start)} --> {srt_time(float(w.get('end', start)))}\n{' '.join(chunk)}\n")
                idx += 1
                chunk = []
                start = None
        if chunk:
            lines.append(f"{idx}\n{srt_time(start or 0)} --> {srt_time(float(words[-1].get('end', 0)))}\n{' '.join(chunk)}\n")
    else:
        for item in timings.get("scenes", []):
            lines.append(f"{idx}\n{srt_time(float(item.get('start', 0)))} --> {srt_time(float(item.get('end', 0)))}\n{item.get('text', '')}\n")
            idx += 1
    return "\n".join(lines) + "\n"


def _clean_overlay_text(text: str, max_len: int = 60) -> str:
    """Strip emoji/symbols for drawtext overlay (font has no emoji glyphs)."""
    import re
    cleaned = re.sub(r"[^\w\s\u0600-\u06FF.,!?:-]", "", text or "")
    cleaned = " ".join(cleaned.split())
    return cleaned[:max_len] or "..."


def create_text_card(
    text: str,
    output_path: str,
    duration: float = 1.6,
    font_file_path: Optional[str] = None
) -> bool:
    """
    بطاقة عنوان/خاتمة: خلفية داكنة متدرجة + النص في المنتصف + صوت صامت.
    تُستخدم في بداية/نهاية الفيديو للهوية.
    """
    clean = _clean_overlay_text(text)
    shaped = shape_arabic(clean)
    work_dir = Path(output_path).parent
    work_dir.mkdir(parents=True, exist_ok=True)
    text_file = work_dir / f"card_{Path(output_path).stem}.txt"
    with open(text_file, "w", encoding="utf-8") as f:
        f.write(shaped)

    text_path = str(text_file.resolve()).replace("\\", "/").replace(":", "\\:")
    vf = (
        "scale=1080:1920,"
        f"drawtext=textfile='{text_path}':fontsize=76:fontcolor=white:"
        f"{('fontfile=' + str(Path(font_file_path).resolve()).replace(chr(92), '/') + ':') if font_file_path and Path(font_file_path).exists() else ''}"
        "x=(w-text_w)/2:y=(h-text_h)/2:borderw=3:bordercolor=black@0x88,"
        "vignette=PI/4.5"
    )
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=0x0d1326:s=1080x1920:d={duration:.3f}:r=25",
        "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo:d={duration:.3f}",
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "21",
        "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        output_path
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except subprocess.CalledProcessError as e:
        logger.warning(f"Text card creation failed: {e.stderr}")
        return False
    finally:
        try:
            if text_file.exists():
                text_file.unlink()
        except Exception:
            pass
