import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from app.config import YOUTUBE_CLIENT_SECRET_FILE, BASE_DIR

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly"
]

TOKEN_FILE = BASE_DIR / "assets" / "youtube_token.json"

def get_video_stats(video_ids: list) -> Dict[str, Any]:
    """
    جلب إحصائيات المشاهدات والإعجابات لفيديوهات منشورة (حتى 50 id دفعة واحدة).
    """
    youtube = get_youtube_client()
    if not youtube:
        raise ValueError("حساب يوتيوب غير موثق حالياً.")
    ids = [v for v in (video_ids or []) if v][:50]
    if not ids:
        return {}
    resp = youtube.videos().list(part="statistics", id=",".join(ids)).execute()
    out: Dict[str, Any] = {}
    for item in resp.get("items", []):
        stats = item.get("statistics", {}) or {}
        out[item.get("id", "")] = {
            "views": int(stats.get("viewCount", 0)),
            "likes": int(stats.get("likeCount", 0)),
            "comments": int(stats.get("commentCount", 0)),
        }
    return out


def get_youtube_client() -> Optional[Any]:
    """
    استرجاع عميل YouTube API موثوق عبر OAuth2 token المحفوظ.
    إذا لم يكن موجوداً أو كان منتهياً، يتم تجديده تلقائياً.
    """
    creds = None
    if TOKEN_FILE.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
        except Exception as e:
            logger.warning(f"Failed loading token: {e}")

    # If no valid credentials, refresh if possible
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            with open(TOKEN_FILE, "w") as token:
                token.write(creds.to_json())
        except Exception as e:
            logger.error(f"Failed to refresh YouTube token: {e}")
            creds = None

    if not creds or not creds.valid:
        return None

    return build("youtube", "v3", credentials=creds)

def check_youtube_auth_status() -> Dict[str, Any]:
    """
    التحقق مما إذا كان حساب يوتيوب مربوطاً وموثقاً.
    """
    client = get_youtube_client()
    if client:
        try:
            channels = client.channels().list(part="snippet", mine=True).execute()
            items = channels.get("items", [])
            if items:
                channel_title = items[0]["snippet"]["title"]
                return {"authenticated": True, "channel_name": channel_title}
        except Exception as e:
            logger.warning(f"Error checking channel: {e}")
    
    return {"authenticated": False, "channel_name": None}

def start_local_auth_flow() -> bool:
    """
    تشغيل تدفق التوثيق لأول مرة محلياً لإنشاء وتخزين token.json
    """
    secret_path = Path(YOUTUBE_CLIENT_SECRET_FILE)
    if not secret_path.exists():
        logger.error(f"client_secret.json not found at {secret_path}")
        return False

    flow = InstalledAppFlow.from_client_secrets_file(str(secret_path), SCOPES)
    # Run local server on an available port
    creds = flow.run_local_server(port=0)
    
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TOKEN_FILE, "w") as token:
        token.write(creds.to_json())
        
    return True

def generate_video_thumbnail(video_path: str, thumb_path: str) -> Optional[str]:
    """
    استخراج إطار مصغّرة (1080x1920) من منتصف الفيديو لاستخدامه كـ thumbnail.
    غير قاتل: يعيد None عند الفشل دون إيقاف النشر.
    """
    import subprocess
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", video_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        duration = float(probe.stdout.strip() or 0)
        ss = max(0.5, duration * 0.35) if duration > 0 else 2.0
        Path(thumb_path).parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["ffmpeg", "-y", "-ss", f"{ss:.2f}", "-i", video_path,
             "-frames:v", "1", "-vf", "scale=1080:1920", "-q:v", "3", thumb_path],
            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        if Path(thumb_path).exists() and Path(thumb_path).stat().st_size > 5_000:
            return thumb_path
    except Exception as e:
        logger.warning(f"Thumbnail generation failed: {e}")
    return None


def upload_short_to_youtube(
    video_path: str,
    title: str,
    description: str,
    tags: Optional[list] = None,
    privacy_status: str = "public",
    thumbnail_path: Optional[str] = None,
    publish_at: Optional[str] = None
) -> Dict[str, Any]:
    """
    رفع الفيديو إلى يوتيوب وضبطه كـ Short تلقائياً.
    publish_at: ISO datetime اختياري لجدولة النشر (يتحول الفيديو لخاص حتى الموعد).
    """
    youtube = get_youtube_client()
    if not youtube:
        raise ValueError("حساب يوتيوب غير موثق حالياً. يجب ربط الحساب أولاً عبر OAuth.")

    # Ensure title has #Shorts if not already present
    if "#Shorts" not in title and "#shorts" not in title:
        title = f"{title} #Shorts"

    body = {
        "snippet": {
            "title": title[:100],
            "description": f"{description}\n\n#Shorts #viral #trending",
            "tags": tags or ["Shorts", "Arabic"],
            "categoryId": "22"
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False
        }
    }

    # Scheduled publishing: YouTube requires private status + publishAt timestamp
    scheduled = False
    if publish_at:
        try:
            dt = datetime.fromisoformat(publish_at)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            body["status"]["privacyStatus"] = "private"
            body["status"]["publishAt"] = dt.isoformat().replace("+00:00", "Z")
            scheduled = True
        except Exception as e:
            logger.warning(f"Invalid publish_at '{publish_at}', publishing immediately: {e}")

    media = MediaFileUpload(
        video_path,
        mimetype="video/mp4",
        resumable=True,
        chunksize=1024 * 1024 * 5
    )

    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            logger.info(f"Uploaded {int(status.progress() * 100)}%")

    video_id = response.get("id")
    video_url = f"https://www.youtube.com/shorts/{video_id}"

    # Upload auto-generated thumbnail (best effort, never blocks publishing)
    thumbnail_uploaded = False
    if thumbnail_path and Path(thumbnail_path).exists():
        try:
            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(thumbnail_path, mimetype="image/jpeg", resumable=False)
            ).execute()
            thumbnail_uploaded = True
            logger.info(f"Thumbnail uploaded for {video_id}")
        except Exception as e:
            logger.warning(f"Thumbnail upload failed for {video_id}: {e}")

    return {
        "success": True,
        "video_id": video_id,
        "url": video_url,
        "status": body["status"]["privacyStatus"],
        "scheduled": scheduled,
        "thumbnail_uploaded": thumbnail_uploaded
    }
