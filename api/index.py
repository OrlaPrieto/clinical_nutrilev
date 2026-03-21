import os
import sys

# Agrega la ruta base del backend de python al sys.path para que Vercel encuentre los modulos
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api-python'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Importa la aplicacion de Flask para que Vercel Serverless funcione
from app import app
