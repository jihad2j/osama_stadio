import logging
from typing import Optional
import httpx
from app.services.settings_service import load_settings

logger = logging.getLogger(__name__)


def send_telegram(text: str, bot_token: Optional[str] = None, chat_id: Optional[str] = None) -> bool:
    """Send a Telegram message using saved (or provided) credentials. Never raises."""
    try:
        settings = load_settings()
        pub = settings.get("publishing", {})
        token = bot_token or pub.get("telegram_bot_token")
        chat = chat_id or pub.get("telegram_chat_id")
        if not token or not chat:
            return False
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json={"chat_id": chat, "text": text})
            if resp.status_code == 200:
                return True
            logger.warning(f"Telegram send failed ({resp.status_code}): {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"Telegram send error: {e}")
    return False


def notify_event(text: str) -> bool:
    """Fire-and-forget notification for background jobs (autopilot/queue)."""
    return send_telegram(text)
