#!/usr/bin/env python3
import sys
import re
import os

def analyze_logs(log_content):
    lines = log_content.split('\n')
    
    # Mappings and metrics trackers
    norm_to_orig = {}
    uploads_by_email = {}
    generations_by_email = {}
    views_by_email = {}
    push_notifs = []
    skipped_events = []
    db_errors = []
    
    # Regex definitions
    upload_start_re = re.compile(r"Starting upload process for menu_(.+?)_\d+_\d+\.pdf")
    upload_to_re = re.compile(r"as (menu_.+?)\.pdf")
    pdf_url_re = re.compile(r"/menu_(.+?)\.pdf")
    push_sent_re = re.compile(r"\[Push Sent\] (?:30m )?Notification sent to (.+?) \((.+?)\) for appointment at (.+)|\[Push Sent\] Notified (.+?) \((.+?)\) for (.+)")
    skip_event_re = re.compile(r"Skipping event \"(.+?)\": (.+)")
    db_err_re = re.compile(r"Could not find patient in DB by email: (\S+?)\.\s*Fallback")

    current_orig = None
    
    # Pass 1: Parse uploads to build name normalizations mapping
    for line in lines:
        # Check upload starts
        m_start = upload_start_re.search(line)
        if m_start:
            current_orig = m_start.group(1)
            
        m_to = upload_to_re.search(line)
        if m_to and current_orig:
            key = m_to.group(1)
            norm_match = re.search(r"menu_(.+?)_[a-f0-9]{32}$", key)
            if norm_match:
                norm_name = norm_match.group(1)
                norm_to_orig[norm_name] = current_orig
                current_orig = None

    # Hardcoded/fallback overrides for michellehdez
    norm_to_orig['michellehdez__hotmail_com'] = 'michellehdez_@hotmail.com'

    def get_email(norm_name):
        if norm_name in norm_to_orig:
            return norm_to_orig[norm_name]
        # Fallback decoding heuristic
        email = norm_name.replace("_gmail_com", "@gmail.com").replace("_hotmail_com", "@hotmail.com").replace("_outlook_com", "@outlook.com")
        # clean trailing _ or duplicate chars if any
        return email

    # Pass 2: Main analysis
    for line in lines:
        # 1. Parse uploads (count them)
        m_start = upload_start_re.search(line)
        if m_start:
            email = m_start.group(1)
            uploads_by_email[email] = uploads_by_email.get(email, 0) + 1

        # 2. Parse Menu parsing/views
        if "[ParsedMenu]" in line:
            pdf_match = pdf_url_re.search(line)
            if pdf_match:
                pdf_key = "menu_" + pdf_match.group(1)
                norm_match = re.search(r"menu_(.+?)_[a-f0-9]{32}$", pdf_key)
                if norm_match:
                    norm_name = norm_match.group(1)
                    email = get_email(norm_name)
                    
                    if "Cache MISS" in line:
                        generations_by_email[email] = generations_by_email.get(email, 0) + 1
                        views_by_email[email] = views_by_email.get(email, 0) + 1
                    elif "Cache HIT" in line:
                        views_by_email[email] = views_by_email.get(email, 0) + 1

        # 3. Push notifications sent
        # Group 1: 30m name, 2: 30m email, 3: 30m time
        # Group 4: normal name, 5: normal email, 6: normal description/time
        m_push = push_sent_re.search(line)
        if m_push:
            if m_push.group(1): # 30m reminder
                name, email, time_info = m_push.group(1), m_push.group(2), m_push.group(3)
                push_notifs.append({"name": name, "email": email, "type": "Recordatorio 30m", "detail": f"Cita a las {time_info}"})
            else: # Daily reminder
                name, email, detail = m_push.group(4), m_push.group(5), m_push.group(6)
                push_notifs.append({"name": name, "email": email, "type": "Recordatorio Diario", "detail": detail})

        # 4. Skipped events
        m_skip = skip_event_re.search(line)
        if m_skip:
            event_name, reason = m_skip.group(1), m_skip.group(2)
            skipped_events.append({"event": event_name, "reason": reason})

        # 5. Database patient missing warning
        m_db = db_err_re.search(line)
        if m_db:
            email = m_db.group(1)
            db_errors.append(email)

    # Output formatting as Markdown
    print("## 📊 Análisis General de Logs de Menú IA\n")
    
    # AI Menu table
    print("### 📧 Actividad de Menús IA por Paciente")
    print("| Correo Electrónico | PDFs Subidos | Menú IA Generado (Cache MISS) | Visualizaciones (MISS + HIT) |")
    print("| :--- | :---: | :---: | :---: |")
    all_emails = set(list(uploads_by_email.keys()) + list(generations_by_email.keys()) + list(views_by_email.keys()))
    if not all_emails:
        print("| *Ningún evento de menú detectado* | - | - | - |")
    else:
        for email in sorted(all_emails):
            ups = uploads_by_email.get(email, 0)
            gens = generations_by_email.get(email, 0)
            views = views_by_email.get(email, 0)
            gen_str = f"Sí ({gens})" if gens > 0 else "No"
            print(f"| {email} | {ups} | {gen_str} | {views} |")
    print()

    # Push Notification Summary
    print("### 🔔 Notificaciones Push Enviadas")
    print("| Nombre | Correo Electrónico | Tipo de Notificación | Detalle |")
    print("| :--- | :--- | :--- | :--- |")
    if not push_notifs:
        print("| *Ninguna notificación enviada* | - | - | - |")
    else:
        for notif in push_notifs:
            print(f"| {notif['name']} | {notif['email']} | {notif['type']} | {notif['detail']} |")
    print()

    # Skipped & Missing events Summary
    print("### ⚠️ Eventos Omitidos y Advertencias de DB")
    if skipped_events:
        print("#### Eventos del Calendario Omitidos:")
        # Group duplicates to make it readable
        skips_counts = {}
        for ev in skipped_events:
            key = (ev['event'], ev['reason'])
            skips_counts[key] = skips_counts.get(key, 0) + 1
        for (event, reason), count in skips_counts.items():
            multiplier = f" (x{count} veces)" if count > 1 else ""
            print(f"- Evento **\"{event}\"** omitido porque: *{reason}*{multiplier}")
    if db_errors:
        print("\n#### Pacientes no encontrados en Base de Datos:")
        for email in sorted(set(db_errors)):
            print(f"- Correo: `{email}`")
    if not skipped_events and not db_errors:
        print("*No se encontraron advertencias ni eventos omitidos.*")

if __name__ == "__main__":
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            content = f.read()
    else:
        content = sys.stdin.read()
    analyze_logs(content)
