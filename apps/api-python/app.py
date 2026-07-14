import sys
# Asegurar que stdout y stderr estén sin buffering en entornos como Render
try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except AttributeError:
    pass # Por si se ejecuta en un entorno que no lo soporte

from flask import Flask, jsonify
from flask_cors import CORS
import os
import traceback
from google import genai
from config import GEMINI_API_KEY, ALLOWED_ORIGINS, MAX_CONTENT_LENGTH
from routes.menu_routes import menu_bp
from routes.health_routes import health_bp
from utils.limiter import limiter

def create_app() -> Flask:
    app = Flask(__name__)
    
    # Initialize rate limiter
    limiter.init_app(app)
    
    # Configure CORS to only allow configured origins from .env
    CORS(app, resources={
        r"/api/*": {"origins": ALLOWED_ORIGINS},
        r"/process-menu": {"origins": ALLOWED_ORIGINS},
    })
    
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

    # Register Blueprints
    app.register_blueprint(menu_bp, url_prefix='/api')
    
    # Register endpoints lacking the /api prefix for backward compatibility
    app.register_blueprint(health_bp, url_prefix='/api')
    # Health routes without /api
    app.register_blueprint(health_bp, url_prefix='/', name='health_routes_root')

    @app.route('/api/debug-models', methods=['GET'])
    def debug_models():
        # Basic security: only allow if in debug mode or specific flag
        if not app.debug:
            return jsonify({"error": "Unauthorized"}), 401
            
        key = GEMINI_API_KEY
        client = genai.Client(api_key=key)
        try:
            models = [m.name for m in client.models.list()]
            return jsonify({
                "status": "ready",
                "key_prefix": key[:6] if key else "MISSING", 
                "models": models
            })
        except Exception as e:
            return jsonify({"error": str(e), "key_prefix": key[:6] if key else "MISSING"}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        # Log the error with full traceback on the server
        print(f"CRITICAL ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        
        return jsonify({
            "error": "Internal Server Error",
            "message": "Ocurrió un error inesperado en el servidor de IA"
        }), 500

    return app

app = create_app()

if __name__ == '__main__':
    # When running locally
    app.run(debug=True, port=8000)

# Triggering reload v2.5

# Server restart required for NutriArchitect v2.5
