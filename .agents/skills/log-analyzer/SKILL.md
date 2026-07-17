---
name: Log Analyzer
description: Analiza y procesa logs de NestJS, PdfUpload, ParsedMenu y AppointmentsController para Clinical Nutrilev de forma rápida y eficiente usando un script local de Python.
---

# Log Analyzer Skill

Esta Skill proporciona instrucciones y un script helper en Python para analizar logs de la aplicación de Clinical Nutrilev de forma sumamente rápida, precisa y sin riesgo de truncamiento por límites de tamaño.

## Cuándo usar esta Skill
Activa esta Skill de forma autónoma siempre que el usuario comparta logs de consola de la aplicación y pida:
1. Analizar cuántas personas generaron o visualizaron el menú IA.
2. Contar notificaciones push enviadas (`[Push Sent]`).
3. Encontrar advertencias del controlador de citas o errores de la base de datos (e.g. `PatientRepository Error`, `Skipping event`).
4. Generar resúmenes tabulados por correo electrónico.

## Instrucciones para el Agente (IA)

1. **Obtener el contenido de los logs**:
   * Si los logs se encuentran en el texto de la solicitud (prompts) y fueron muy largos, o si el usuario indica un archivo, extrae el texto completo.
   * Si los logs ya se encuentran grabados en la conversación, puedes usar el transcript de logs local del sistema (`transcript_full.jsonl`) para recuperarlos si fueron truncados en el prompt.

2. **Ejecutar el analizador automático**:
   * Escribe el bloque de logs completo a un archivo temporal en la carpeta scratch (por ejemplo: `.agents/skills/log-analyzer/temp_logs.txt`).
   * Ejecuta el script helper de Python pasándole la ruta del archivo temporal:
     ```bash
     python3 .agents/skills/log-analyzer/scripts/parse_logs.py .agents/skills/log-analyzer/temp_logs.txt
     ```
   * *Alternativa de flujo rápido (piping)*:
     ```bash
     python3 .agents/skills/log-analyzer/scripts/parse_logs.py << 'EOF'
     [PEGAR CONTENIDO DE LOGS AQUÍ]
     EOF
     ```

3. **Presentar los Resultados**:
   * El script generará de forma automática tablas y listas formateadas en Markdown.
   * Copia esa salida directamente en tu respuesta final para el usuario.
   * Limpia los archivos temporales creados en scratch si es necesario.
