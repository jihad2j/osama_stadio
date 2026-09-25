import json
import logging
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.config import STORAGE_DIR

logger = logging.getLogger(__name__)

SCHEDULES_FILE = STORAGE_DIR / "schedules.json"


def load_schedules() -> List[Dict[str, Any]]:
    if SCHEDULES_FILE.exists():
        try:
            with open(SCHEDULES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception as e:
            logger.error(f"Error reading schedules: {e}")
    return []


def save_schedules(items: List[Dict[str, Any]]) -> None:
    SCHEDULES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SCHEDULES_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


def get_schedule(schedule_id: str) -> Optional[Dict[str, Any]]:
    return next((s for s in load_schedules() if s.get("id") == schedule_id), None)


def upsert_schedule(item: Dict[str, Any]) -> Dict[str, Any]:
    items = load_schedules()
    if not item.get("id"):
        item["id"] = str(uuid.uuid4())[:8]
    if "created_at" not in item:
        item["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    items = [s for s in items if s.get("id") != item["id"]]
    items.insert(0, item)
    save_schedules(items)
    return item


def delete_schedule(schedule_id: str) -> bool:
    items = load_schedules()
    kept = [s for s in items if s.get("id") != schedule_id]
    if len(kept) == len(items):
        return False
    save_schedules(kept)
    return True


def is_due(schedule: Dict[str, Any], now: Optional[datetime] = None) -> bool:
    """True if enabled, time matches HH:MM now, and not already run today."""
    if not schedule.get("enabled"):
        return False
    now = now or datetime.now()
    if (schedule.get("time") or "") != now.strftime("%H:%M"):
        return False
    return schedule.get("last_run") != now.strftime("%Y-%m-%d")
