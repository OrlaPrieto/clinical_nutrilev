# Clinical Nutrilev - Arquitectura Híbrida 🚀

Este repositorio contiene la plataforma Clinical Nutrilev, organizada como un **Monorepo** con tres servicios principales que trabajan en conjunto.

## 🏗️ Estructura del Proyecto

- **`apps/frontend`**: Aplicación Angular (Interfaz de usuario).
- **`apps/api-main`**: Backend NestJS (TypeScript). Es el gateway principal que maneja Autenticación, Pacientes y actúa como puente.
- **`apps/api-python`**: Microservicio Flask (Python). Se encarga exclusivamente del procesamiento de IA (Gemini) y generación de documentos `.docx`.

---

## 🛠️ Configuración Paso a Paso

### 1. Requisitos Previos
- **Node.js**: v18 o superior.
- **Python**: v3.9 o superior.
- **Supabase**: Proyecto configurado con las tablas `patients` y `patient_progress`.

### 2. Variables de Entorno
Crea un archivo `.env` en la **raíz** del proyecto (fuera de la carpeta `apps`) con el siguiente contenido:

```env
# Supabase (Frontend & NestJS)
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_JWT_SECRET=tu_jwt_secret

# AI & Email (Python)
GEMINI_API_KEY=tu_api_key_de_gemini
OPENAI_API_KEY=tu_api_key_de_openai
RESEND_API_KEY=tu_api_key_de_resend
EMAIL_FROM=tu_correo_configurado
```

### 3. Instalación de Dependencias
Ejecuta los siguientes comandos desde la **raíz** del proyecto:

#### Dependencias de Node (Frontend y NestJS)
```bash
npm install
```
*Este comando instalará `concurrently` en la raíz y configurará los enlaces de los workspaces.*

#### Dependencias de Python
```bash
cd apps/api-python
python3 -m venv venv
source venv/bin/activate  # (En Windows: venv\Scripts\activate)
pip install -r requirements.txt
cd ../..
```

---

## 🚀 Ejecución del Proyecto

### Opción A: Arranque Unificado (Recomendado)
Desde la raíz del proyecto, ejecuta:
```bash
npm start
```
Este comando iniciará simultáneamente:
- **Frontend**: `http://localhost:4200`
- **NestJS Gateway**: `http://localhost:3000`
- **Python Flask**: `http://localhost:8000`

### Opción B: Arranque Individual
Si prefieres ver los logs por separado, puedes abrir 3 terminales:
1. **Frontend**: `npm start --workspace=apps/frontend`
2. **NestJS**: `npm run start:dev --workspace=apps/api-main`
3. **Python**: `cd apps/api-python && source venv/bin/activate && python3 app.py`

---

## 📝 Notas Adicionales
- La aplicación de Angular se comunica con NestJS (Puerto 3000).
- NestJS redirige las peticiones de IA a Python (Puerto 8000).
- Asegúrate de tener el bucket `patient_menus` creado en Supabase Storage para la subida de archivos.
