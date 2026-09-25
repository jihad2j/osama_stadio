import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
import httpx
import edge_tts
from app.services.settings_service import load_settings

logger = logging.getLogger(__name__)

ARABIC_VOICES = {
    "ar-SA-Hamed": "ar-SA-HamedNeural",     # سعودي رجالي
    "ar-SA-Zariyah": "ar-SA-ZariyahNeural", # سعودي نسائي
    "ar-EG-Shakir": "ar-EG-ShakirNeural",   # مصري رجالي
    "ar-EG-Salma": "ar-EG-SalmaNeural",     # مصري نسائي
    "ar-AE-Hamdan": "ar-AE-HamdanNeural",   # إماراتي رجالي
}

DEFAULT_VOICE = "ar-SA-HamedNeural"

async def generate_speech_edge_tts(text: str, output_path: str, voice: str, rate: str = "+4%") -> Tuple[float, List[Dict[str, Any]]]:
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)
    word_timings: List[Dict[str, Any]] = []
    audio_data = bytearray()

    async for chunk in communicate.stream():
        chunk_type = chunk.get("type")
        if chunk_type == "audio":
            audio_data.extend(chunk.get("data", b""))
        elif chunk_type == "WordBoundary":
            offset_sec = chunk.get("offset", 0) / 10_000_000.0
            duration_sec = chunk.get("duration", 0) / 10_000_000.0
            word_text = chunk.get("text", "")
            word_timings.append({
                "word": word_text,
                "start": round(offset_sec, 3),
                "end": round(offset_sec + duration_sec, 3),
                "duration": round(duration_sec, 3)
            })

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(audio_data)

    total_duration = word_timings[-1]["end"] + 0.25 if word_timings else max(3.0, len(text.split()) * 0.5)
    return total_duration, word_timings

async def generate_speech_elevenlabs(text: str, output_path: str, api_key: str, voice_id: str) -> Tuple[float, List[Dict[str, Any]]]:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id or '21m00Tcm4TlvDq8ikWAM'}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.8
        }
    }
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            raise ValueError(f"ElevenLabs error ({resp.status_code}): {resp.text}")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(resp.content)

    # Estimate duration based on word count
    estimated_duration = max(3.0, len(text.split()) * 0.48)
    return estimated_duration, []

async def generate_speech_openai(text: str, output_path: str, api_key: str, voice: str = "onyx") -> Tuple[float, List[Dict[str, Any]]]:
    url = "https://api.openai.com/v1/audio/speech"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "tts-1",
        "input": text,
        "voice": voice or "onyx"
    }
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            raise ValueError(f"OpenAI TTS error ({resp.status_code}): {resp.text}")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(resp.content)

    estimated_duration = max(3.0, len(text.split()) * 0.48)
    return estimated_duration, []

async def generate_speech_for_scene(
    text: str, 
    output_audio_path: str, 
    voice: str = DEFAULT_VOICE,
    rate: str = "+4%"
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    توليد ملف صوتي بناءً على مزود الصوت المختار في الإعدادات
    """
    settings = load_settings()
    voice_conf = settings.get("voice", {})
    provider = voice_conf.get("provider", "edge_tts")

    if provider == "elevenlabs" and voice_conf.get("elevenlabs_api_key"):
        return await generate_speech_elevenlabs(
            text=text,
            output_path=output_audio_path,
            api_key=voice_conf["elevenlabs_api_key"],
            voice_id=voice_conf.get("elevenlabs_voice_id", "")
        )

    elif provider == "openai_tts" and (voice_conf.get("openai_api_key") or settings.get("llm", {}).get("openai_api_key")):
        api_key = voice_conf.get("openai_api_key") or settings.get("llm", {}).get("openai_api_key")
        return await generate_speech_openai(
            text=text,
            output_path=output_audio_path,
            api_key=api_key
        )

    else:
        # Default: Edge TTS (Free, fast, natural Arabic)
        return await generate_speech_edge_tts(
            text=text,
            output_path=output_audio_path,
            voice=voice or DEFAULT_VOICE,
            rate=rate
        )
