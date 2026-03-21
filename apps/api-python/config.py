import os
from dotenv import load_dotenv

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4200")
ALLOWED_ORIGINS = [FRONTEND_URL, "https://app.clinicanutrilev.com"]
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Security
MAX_CONTENT_LENGTH = 5 * 1024 * 1024
