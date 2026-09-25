import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
YOUTUBE_CLIENT_SECRET_FILE = os.getenv("YOUTUBE_CLIENT_SECRET_FILE", str(BASE_DIR / "assets" / "client_secret.json"))
FONT_PATH = os.getenv("FONT_PATH", str(BASE_DIR / "assets" / "Tajawal-Bold.ttf"))
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage")))
PORT = int(os.getenv("PORT", 8000))

# Ensure storage directory exists
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "temp").mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "output").mkdir(parents=True, exist_ok=True)
