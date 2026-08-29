import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if root_env.exists():
    load_dotenv(root_env)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4200")
ALLOWED_ORIGINS = [FRONTEND_URL, "https://app.clinicanutrilev.com"]
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")

# Security
MAX_CONTENT_LENGTH = 5 * 1024 * 1024
