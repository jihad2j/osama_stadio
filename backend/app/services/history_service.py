import json
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.config import STORAGE_DIR

logger = logging.getLogger(__name__)

HISTORY_FILE = STORAGE_DIR / "history.json"

def load_history() -> List[Dict[str, Any]]:
    """
    تحميل سجل الفيديوهات التي تم إنتاجها
    """
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading history.json: {e}")
    return []

def save_history_item(item: Dict[str, Any]) -> None:
    """
    إضافة فيديو جديد للسجل
    """
    history = load_history()
    # Add timestamp if not present
    if "created_at" not in item:
        item["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # Prepend newest first
    history = [h for h in history if h.get("video_id") != item.get("video_id")]
    history.insert(0, item)

    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

def update_history_item(video_id: str, updates: Dict[str, Any]) -> bool:
    """
    تحديث حالة فيديو موجود في السجل (مثل حالة النشر)
    """
    history = load_history()
    updated = False
    for h in history:
        if h.get("video_id") == video_id:
            h.update(updates)
            updated = True
            break
    if updated:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    return updated

def delete_history_item(video_id: str) -> bool:
    """
    حذف فيديو من السجل ومن التخزين
    """
    history = load_history()
    history = [h for h in history if h.get("video_id") != video_id]
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
        
    # Also delete physical video file if exists
    video_path = STORAGE_DIR / "output" / f"{video_id}.mp4"
    if video_path.exists():
        try:
            video_path.unlink()
        except Exception as e:
            logger.warning(f"Could not delete physical video file: {e}")
    return True
