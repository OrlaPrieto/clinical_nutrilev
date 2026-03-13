---
description: Como instalar dependencias y correr el backend de Python localmente
---

Para configurar y ejecutar el servidor de Flask que procesa los menús, sigue estos pasos:

1. **Crear un entorno virtual (Recomendado)**:
   Esto mantiene las dependencias de Python aisladas del sistema.
   ```bash
   python3 -m venv venv
   ```

2. **Activar el entorno virtual**:
   ```bash
   source venv/bin/activate
   ```

// turbo
3. **Instalar las dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno**:
   Asegúrate de tener un archivo `.env` en la raíz del proyecto con tu API Key:
   ```env
   GEMINI_API_KEY=tu_api_key_aqui
   ```

5. **Ejecutar el backend**:
   ```bash
   python api/index.py
   ```

El servidor estará disponible en `http://127.0.0.1:5000`. El frontend ya está configurado para redirigir las peticiones `/api/*` a este servidor local si usas `vercel dev` o si el proxy de desarrollo está activo.
