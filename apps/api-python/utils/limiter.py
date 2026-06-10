from flask import request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

def get_rate_limit_key():
    # Retrieve the real client IP forwarded by NestJS
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        # Extract the client IP (first element in comma-separated list)
        return forwarded.split(',')[0].strip()
    return get_remote_address()

# Shared limiter instance
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=[]
)
