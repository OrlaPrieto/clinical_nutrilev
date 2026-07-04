#!/bin/bash

# =========================================================================
# CLINICAL NUTRILEV - SCRIPT DE RESPALDO AUTOMÁTICO DE BASE DE DATOS
# =========================================================================
# Este script realiza un volcado (dump) completo de la base de datos de
# Supabase (PostgreSQL), lo guarda localmente y elimina copias antiguas.
# =========================================================================

# --- CONFIGURACIÓN DE PARÁMETROS ---

# 1. Identificador de tu proyecto de Supabase.
# Por defecto se usa fhzoyojghnaimmczefyc (Staging). 
# Cambiar por tu ID de producción cuando corresponda.
PROJECT_REF="fhzoyojghnaimmczefyc"

# 2. Contraseña de tu base de datos de Supabase.
# Escribe la contraseña que definiste al crear el proyecto.
DB_PASSWORD="TU_CONTRASEÑA_DE_SUPABASE"

# 3. Directorio de destino del respaldo.
# Recomiendo cambiar esto a tu carpeta local de Google Drive, por ejemplo:
# BACKUP_DIR="/Users/orla09i/Library/CloudStorage/GoogleDrive-tu_correo@gmail.com/Mi unidad/Backups/Nutrilev"
BACKUP_DIR="$HOME/Backups/Clinical_Nutrilev"

# 4. Retención de respaldos (cuántos días guardar copias antiguas)
RETENTION_DAYS=30

# =========================================================================

# Crear el directorio si no existe
mkdir -p "$BACKUP_DIR"

# Nombre del archivo con marca de tiempo
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="backup_nutrilev_${TIMESTAMP}.sql"
OUTPUT_FILE="${BACKUP_DIR}/${FILENAME}"

# Verificar si pg_dump está instalado
if ! command -v pg_dump &> /dev/null; then
    echo "❌ ERROR: 'pg_dump' no está instalado en este sistema."
    echo "👉 En macOS, puedes instalarlo usando Homebrew corriendo:"
    echo "   brew install libpq"
    echo "   echo 'export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\"' >> ~/.zshrc"
    echo "   source ~/.zshrc"
    echo "   (O bien instalando Postgres.app desde https://postgresapp.com/)"
    exit 1
fi

echo "🚀 Iniciando respaldo de Supabase ($PROJECT_REF)..."

# Ejecutar pg_dump pasando la contraseña de forma segura
export PGPASSWORD="$DB_PASSWORD"
pg_dump \
  -h "db.${PROJECT_REF}.supabase.co" \
  -U "postgres" \
  -d "postgres" \
  -p "5432" \
  -F p \
  -f "$OUTPUT_FILE"

# Verificar si el comando se ejecutó correctamente
if [ $? -eq 0 ]; then
    echo "✅ Respaldo completado con éxito."
    echo "archivo guardado en: $OUTPUT_FILE"
    
    # Comprimir el archivo para ahorrar espacio (opcional, recomendado)
    gzip "$OUTPUT_FILE"
    echo "📦 Archivo comprimido: ${OUTPUT_FILE}.gz"
    
    # Limpiar archivos más antiguos que los días definidos
    echo "🧹 Limpiando respaldos antiguos (mayores a $RETENTION_DAYS días)..."
    find "$BACKUP_DIR" -name "backup_nutrilev_*.sql.gz" -mtime +$RETENTION_DAYS -exec rm {} \;
    echo "✨ Todo al día."
else
    echo "❌ ERROR: No se pudo realizar el respaldo de la base de datos."
    exit 1
fi
