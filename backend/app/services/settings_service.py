import json
import logging
from pathlib import Path
from typing import Dict, Any
from app.config import STORAGE_DIR, GEMINI_API_KEY, PEXELS_API_KEY

logger = logging.getLogger(__name__)

SETTINGS_FILE = STORAGE_DIR / "settings.json"

DEFAULT_SETTINGS: Dict[str, Any] = {
    "llm": {
        "provider": "gemini",  # gemini | openai | groq | openrouter
        "gemini_api_key": GEMINI_API_KEY,
        "openai_api_key": "",
        "groq_api_key": "",
        "openrouter_api_key": "",
        "model_name": "gemini-3.8-flash"
    },
    "voice": {
        "provider": "edge_tts",  # edge_tts | elevenlabs | openai_tts
        "elevenlabs_api_key": "",
        "elevenlabs_voice_id": "21m00Tcm4TlvDq8ikWAM",  # default Adam/Rachel
        "openai_api_key": "",
        "voice_name": "ar-SA-HamedNeural"
    },
    "media": {
        "provider": "pexels",  # pexels | pixabay
        "pexels_api_key": PEXELS_API_KEY,
        "pixabay_api_key": ""
    },
    "publishing": {
        "youtube_enabled": True,
        "tiktok_enabled": False,
        "telegram_bot_token": "",
        "telegram_chat_id": ""
    }
}

def load_settings() -> Dict[str, Any]:
    """
    قراءة الإعدادات الموحدة من ملف السيرفر المركزي storage/settings.json
    """
    merged = {**DEFAULT_SETTINGS}
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                for section in ["llm", "voice", "media", "publishing"]:
                    merged[section] = {**DEFAULT_SETTINGS.get(section, {}), **saved.get(section, {})}
        except Exception as e:
            logger.error(f"Error loading settings from {SETTINGS_FILE}: {e}")
    
    # Fallback to env vars if not stored yet
    if not merged["llm"].get("gemini_api_key") and GEMINI_API_KEY:
        merged["llm"]["gemini_api_key"] = GEMINI_API_KEY
    if not merged["media"].get("pexels_api_key") and PEXELS_API_KEY:
        merged["media"]["pexels_api_key"] = PEXELS_API_KEY

    # Auto-migrate deprecated models (e.g. gemini-2.5-flash) to gemini-3.8-flash
    current_model = merged.get("llm", {}).get("model_name", "")
    if current_model in ("gemini-2.5-flash", "gemini-2.0-flash-exp", ""):
        merged["llm"]["model_name"] = "gemini-3.8-flash"
        try:
            save_settings(merged)
        except Exception:
            pass

    return merged

def save_settings(new_settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    حفظ الإعدادات الموحدة على السيرفر لتكون سارية فوراً على كل العملاء
    """
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(new_settings, f, ensure_ascii=False, indent=2)
    logger.info("Unified server settings successfully persisted to disk.")
    return new_settings

def mask_key(key: str) -> str:
    if not key or len(key) < 8:
        return ""
    return f"{key[:4]}...{key[-4:]}"

def get_public_settings() -> Dict[str, Any]:
    """
    إرجاع الإعدادات الموحدة للواجهة مع حالة قناة يوتيوب المربوطة
    """
    s = load_settings()
    yt_auth = False
    yt_channel = None
    try:
        from app.services.youtube_service import check_youtube_auth_status
        yt_status = check_youtube_auth_status()
        yt_auth = yt_status.get("authenticated", False)
        yt_channel = yt_status.get("channel_name")
    except Exception:
        pass

    return {
        "llm": {
            "provider": s["llm"].get("provider", "gemini"),
            "has_gemini_key": bool(s["llm"].get("gemini_api_key")),
            "gemini_key_masked": mask_key(s["llm"].get("gemini_api_key", "")),
            "has_openai_key": bool(s["llm"].get("openai_api_key")),
            "openai_key_masked": mask_key(s["llm"].get("openai_api_key", "")),
            "has_groq_key": bool(s["llm"].get("groq_api_key")),
            "groq_key_masked": mask_key(s["llm"].get("groq_api_key", "")),
            "has_openrouter_key": bool(s["llm"].get("openrouter_api_key")),
            "openrouter_key_masked": mask_key(s["llm"].get("openrouter_api_key", "")),
            "model_name": s["llm"].get("model_name", "gemini-3.8-flash")
        },
        "voice": {
            "provider": s["voice"].get("provider", "edge_tts"),
            "has_elevenlabs_key": bool(s["voice"].get("elevenlabs_api_key")),
            "elevenlabs_key_masked": mask_key(s["voice"].get("elevenlabs_api_key", "")),
            "elevenlabs_voice_id": s["voice"].get("elevenlabs_voice_id", ""),
            "has_openai_tts_key": bool(s["voice"].get("openai_api_key") or s["llm"].get("openai_api_key")),
            "voice_name": s["voice"].get("voice_name", "ar-SA-HamedNeural")
        },
        "media": {
            "provider": s["media"].get("provider", "pexels"),
            "has_pexels_key": bool(s["media"].get("pexels_api_key")),
            "pexels_key_masked": mask_key(s["media"].get("pexels_api_key", "")),
            "has_pixabay_key": bool(s["media"].get("pixabay_api_key")),
            "pixabay_key_masked": mask_key(s["media"].get("pixabay_api_key", ""))
        },
        "publishing": {
            "youtube_enabled": s.get("publishing", {}).get("youtube_enabled", True),
            "tiktok_enabled": s.get("publishing", {}).get("tiktok_enabled", False),
            "has_telegram_token": bool(s.get("publishing", {}).get("telegram_bot_token")),
            "telegram_token_masked": mask_key(s.get("publishing", {}).get("telegram_bot_token", "")),
            "telegram_chat_id": s.get("publishing", {}).get("telegram_chat_id", ""),
            "youtube_authenticated": yt_auth,
            "youtube_channel_name": yt_channel,
        }
    }
