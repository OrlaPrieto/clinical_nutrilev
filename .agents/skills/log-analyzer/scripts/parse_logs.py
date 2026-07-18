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
    
    # New Telemetry Trackers
    auth_actions = {}          # email -> {'magic': 0, 'login': 0, 'role': 0, 'reset': 0}
    appointment_actions = {}   # email -> {'confirm': 0, 'cancel': 0}
    push_subscriptions = {}    # email -> count
    ai_durations = []          # list of floats
    progress_updates = {}      # patient_id -> {'add': 0, 'upd': 0, 'del': 0}

    # Regex definitions
    upload_start_re = re.compile(r"Starting upload process for menu_(.+?)_\d+_\d+\.pdf")
    upload_to_re = re.compile(r"as (menu_.+?)\.pdf")
    pdf_url_re = re.compile(r"/menu_(.+?)\.pdf")
    push_sent_re = re.compile(r"\[Push Sent\] (?:30m )?Notification sent to (.+?) \((.+?)\) for appointment at (.+)|\[Push Sent\] Notified (.+?) \((.+?)\) for (.+)")
    skip_event_re = re.compile(r"Skipping event \"(.+?)\": (.+)")
    db_err_re = re.compile(r"Could not find patient in DB by email: (\S+?)\.\s*Fallback")

    # New Telemetry Regexes
    auth_magic_re = re.compile(r"\[Auth\] Magic link requested for patient: (\S+)")
    auth_login_re = re.compile(r"\[Auth\] Successful login completed for patient: (\S+)")
    auth_role_re = re.compile(r"\[Auth\] Role requested for email: (\S+)")
    auth_reset_re = re.compile(r"\[Auth\] Password reset requested for email: (\S+)")
    
    appt_confirm_re = re.compile(r"\[Appointments\] Appointment confirmed by patient: (\S+) \(EventID: (\S+)\)")
    appt_cancel_re = re.compile(r"\[Appointments\] Appointment cancelled/rejected by patient: (\S+) \(EventID: (\S+)\)")
    
    push_sub_re = re.compile(r"\[Notifications\] Push subscription registered/updated for: (\S+)")
    
    parsed_menu_duration_re = re.compile(r"\[ParsedMenu\] Parse completed in ([\d\.]+) seconds for URL: (\S+)")
    
    progress_add_re = re.compile(r"\[PatientProgress\] Adding new measurements for patient ID: (\S+)")
    progress_upd_re = re.compile(r"\[PatientProgress\] Updating measurements ID: (\S+)")
    progress_del_re = re.compile(r"\[PatientProgress\] Removing measurements ID: (\S+)")

    current_orig = None
    
    # Pass 1: Parse uploads to build name normalizations mapping
    for line in lines:
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

    # Fallback overrides
    norm_to_orig['michellehdez__hotmail_com'] = 'michellehdez_@hotmail.com'

    def get_email(norm_name):
        if norm_name in norm_to_orig:
            return norm_to_orig[norm_name]
        return norm_name.replace("_gmail_com", "@gmail.com").replace("_hotmail_com", "@hotmail.com").replace("_outlook_com", "@outlook.com")

    # Pass 2: Main analysis
    for line in lines:
        # 1. Menu PDF Uploads
        m_start = upload_start_re.search(line)
        if m_start:
            email = m_start.group(1)
            uploads_by_email[email] = uploads_by_email.get(email, 0) + 1

        # 2. Menu Parsing via AI (Cache HIT / MISS)
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

        # 3. New Telemetry: Auth Actions
        m_magic = auth_magic_re.search(line)
        if m_magic:
            email = m_magic.group(1)
            auth_actions.setdefault(email, {'magic': 0, 'login': 0, 'role': 0, 'reset': 0})['magic'] += 1
            
        m_login = auth_login_re.search(line)
        if m_login:
            email = m_login.group(1)
            auth_actions.setdefault(email, {'magic': 0, 'login': 0, 'role': 0, 'reset': 0})['login'] += 1
            
        m_role = auth_role_re.search(line)
        if m_role:
            email = m_role.group(1)
            auth_actions.setdefault(email, {'magic': 0, 'login': 0, 'role': 0, 'reset': 0})['role'] += 1
            
        m_reset = auth_reset_re.search(line)
        if m_reset:
            email = m_reset.group(1)
            auth_actions.setdefault(email, {'magic': 0, 'login': 0, 'role': 0, 'reset': 0})['reset'] += 1

        # 4. New Telemetry: Appointment Actions
        m_appt_conf = appt_confirm_re.search(line)
        if m_appt_conf:
            email = m_appt_conf.group(1)
            appointment_actions.setdefault(email, {'confirm': 0, 'cancel': 0})['confirm'] += 1
            
        m_appt_canc = appt_cancel_re.search(line)
        if m_appt_canc:
            email = m_appt_canc.group(1)
            appointment_actions.setdefault(email, {'confirm': 0, 'cancel': 0})['cancel'] += 1

        # 5. New Telemetry: Push Notification Subscriptions
        m_push_sub = push_sub_re.search(line)
        if m_push_sub:
            email = m_push_sub.group(1)
            push_subscriptions[email] = push_subscriptions.get(email, 0) + 1

        # 6. New Telemetry: AI Menu Parsing Durations
        m_duration = parsed_menu_duration_re.search(line)
        if m_duration:
            duration = float(m_duration.group(1))
            url = m_duration.group(2)
            ai_durations.append(duration)
            
            pdf_match = pdf_url_re.search(url)
            if pdf_match:
                pdf_key = "menu_" + pdf_match.group(1)
                norm_match = re.search(r"menu_(.+?)_[a-f0-9]{32}$", pdf_key)
                if norm_match:
                    norm_name = norm_match.group(1)
                    email = get_email(norm_name)
                    # A completed parse counts as both a generation and a view (MISS)
                    generations_by_email[email] = generations_by_email.get(email, 0) + 1
                    views_by_email[email] = views_by_email.get(email, 0) + 1

        # 7. New Telemetry: Patient progress updates
        m_prog_add = progress_add_re.search(line)
        if m_prog_add:
            pid = m_prog_add.group(1)
            progress_updates.setdefault(pid, {'add': 0, 'upd': 0, 'del': 0})['add'] += 1
            
        m_prog_upd = progress_upd_re.search(line)
        if m_prog_upd:
            pid = m_prog_upd.group(1)
            progress_updates.setdefault(pid, {'add': 0, 'upd': 0, 'del': 0})['upd'] += 1
            
        m_prog_del = progress_del_re.search(line)
        if m_prog_del:
            pid = m_prog_del.group(1)
            progress_updates.setdefault(pid, {'add': 0, 'upd': 0, 'del': 0})['del'] += 1

        # 8. Standard push notification deliveries
        m_push = push_sent_re.search(line)
        if m_push:
            if m_push.group(1):
                name, email, time_info = m_push.group(1), m_push.group(2), m_push.group(3)
                push_notifs.append({"name": name, "email": email, "type": "Recordatorio 30m", "detail": f"Cita a las {time_info}"})
            else:
                name, email, detail = m_push.group(4), m_push.group(5), m_push.group(6)
                push_notifs.append({"name": name, "email": email, "type": "Recordatorio Diario", "detail": detail})

        # 9. Calendar skipped events
        m_skip = skip_event_re.search(line)
        if m_skip:
            event_name, reason = m_skip.group(1), m_skip.group(2)
            skipped_events.append({"event": event_name, "reason": reason})

        # 10. Database errors
        m_db = db_err_re.search(line)
        if m_db:
            email = m_db.group(1)
            db_errors.append(email)

    # Output formatting as Markdown
    print("## 📊 Análisis de Logs y Telemetría del Sistema\n")
    
    # 1. AI Menu Table
    print("### 📧 Actividad de Menús IA por Paciente")
    print("| Correo Electrónico | PDFs Subidos | Menú IA Generado (Cache MISS) | Visualizaciones (MISS + HIT) |")
    print("| :--- | :---: | :---: | :---: |")
    all_menu_emails = set(list(uploads_by_email.keys()) + list(generations_by_email.keys()) + list(views_by_email.keys()))
    if not all_menu_emails:
        print("| *Ningún evento de menú detectado* | - | - | - |")
    else:
        for email in sorted(all_menu_emails):
            ups = uploads_by_email.get(email, 0)
            gens = generations_by_email.get(email, 0)
            views = views_by_email.get(email, 0)
            gen_str = f"Sí ({gens})" if gens > 0 else "No"
            print(f"| {email} | {ups} | {gen_str} | {views} |")
    print()

    # 2. AI Metrics
    if ai_durations:
        avg_time = sum(ai_durations) / len(ai_durations)
        print("### ⚡ Métricas de Rendimiento de IA (Model Latency)")
        print(f"- **Total de parseos de menú por IA:** {len(ai_durations)}")
        print(f"- **Latencia de parseo promedio (Gemini):** `{avg_time:.2f}` segundos")
        print(f"- **Rango de latencias:** `{min(ai_durations):.2f}s` (mín) a `{max(ai_durations):.2f}s` (máx)")
        print()

    # 3. Auth Actions Table
    if auth_actions:
        print("### 🔑 Actividad de Autenticación y Accesos")
        print("| Correo Electrónico | Solicitudes Magic Link | Logins Completados | Roles Solicitados | Contraseñas Restablecidas |")
        print("| :--- | :---: | :---: | :---: | :---: |")
        for email, acts in sorted(auth_actions.items()):
            print(f"| {email} | {acts['magic']} | {acts['login']} | {acts['role']} | {acts['reset']} |")
        print()

    # 4. Appointments Table
    if appointment_actions:
        print("### 📅 Acciones de Citas por Pacientes")
        print("| Correo Electrónico | Citas Confirmadas | Citas Canceladas / Rechazadas |")
        print("| :--- | :---: | :---: |")
        for email, acts in sorted(appointment_actions.items()):
            print(f"| {email} | {acts['confirm']} | {acts['cancel']} |")
        print()

    # 5. Push Subscriptions Table
    if push_subscriptions:
        print("### 🔔 Nuevas Suscripciones Push Web")
        print("| Correo Electrónico | Suscripciones Registradas / Actualizadas |")
        print("| :--- | :---: |")
        for email, count in sorted(push_subscriptions.items()):
            print(f"| {email} | {count} |")
        print()

    # 6. Patient Progress Table
    if progress_updates:
        print("### 🏋️ Actividad de Medidas Corporales y Progreso")
        print("| ID del Paciente | Medidas Añadidas | Medidas Modificadas | Medidas Eliminadas |")
        print("| :--- | :---: | :---: | :---: |")
        for pid, acts in sorted(progress_updates.items()):
            print(f"| {pid} | {acts['add']} | {acts['upd']} | {acts['del']} |")
        print()

    # 7. Push Notification Summary
    print("### 📲 Notificaciones Push Enviadas")
    print("| Nombre | Correo Electrónico | Tipo de Notificación | Detalle |")
    print("| :--- | :--- | :--- | :--- |")
    if not push_notifs:
        print("| *Ninguna notificación enviada* | - | - | - |")
    else:
        for notif in push_notifs:
            print(f"| {notif['name']} | {notif['email']} | {notif['type']} | {notif['detail']} |")
    print()

    # 8. Skipped & Missing events Summary
    print("### ⚠️ Eventos Omitidos y Advertencias de DB")
    if skipped_events:
        print("#### Eventos del Calendario Omitidos:")
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
