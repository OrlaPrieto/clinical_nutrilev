from flask import Flask, jsonify
from flask_cors import CORS

from config import ALLOWED_ORIGINS, MAX_CONTENT_LENGTH
from routes.menu_routes import menu_bp
from routes.health_routes import health_bp

def create_app() -> Flask:
    app = Flask(__name__)
    
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

    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        import sys
        # Log the error with full traceback on the server
        print(f"ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        
        return jsonify({
            "error": "Internal Server Error",
            "message": str(e)
        }), 500

    return app

app = create_app()

if __name__ == '__main__':
    # When running locally
    app.run(debug=True, port=8000)
