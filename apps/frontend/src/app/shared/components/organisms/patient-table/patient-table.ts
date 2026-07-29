import { Component, input, output, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patient } from '../../../../models/patient.model';
import { ButtonComponent } from '../../atoms/button/button';
import { BadgeComponent } from '../../atoms/badge/badge';
import { IconComponent } from '../../atoms/icon/icon';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-o-patient-table',
  standalone: true,
  imports: [CommonModule, ButtonComponent, BadgeComponent, IconComponent],
  templateUrl: './patient-table.html',
  styleUrl: './patient-table.css'
})
export class PatientTableOrganism {
  patients = input.required<Patient[]>();
  activeTooltipId = signal<string | null>(null);
  expandedPatientId = signal<string | null>(null);

  view = output<Patient>();
  delete = output<Patient>();
  editObjetivo = output<Patient>();
  editPaquete = output<Patient>();

  onObjetivoClick(patient: Patient, event: Event) {
    event.stopPropagation();
    this.editObjetivo.emit(patient);
  }

  onPaqueteClick(patient: Patient, event: Event) {
    event.stopPropagation();
    this.editPaquete.emit(patient);
  }

  toggleExpand(patientId: string, event: Event) {
    event.stopPropagation();
    if (this.expandedPatientId() === patientId) {
      this.expandedPatientId.set(null);
    } else {
      this.expandedPatientId.set(patientId);
    }
  }

  toggleTooltip(id: string, event: Event) {
    event.stopPropagation();
    if (this.activeTooltipId() === id) {
      this.activeTooltipId.set(null);
    } else {
      this.activeTooltipId.set(id);
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activeTooltipId.set(null);
  }

  getMenuStatus(patient: Patient): 'active' | 'expired' | 'none' {
    if (!patient.menu_url || !patient.menu_created_at) return 'none';
    const createdAt = new Date(patient.menu_created_at).getTime();
    const now = Date.now();
    const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    const limit = patient.plan_duration_days != null ? Number(patient.plan_duration_days) : environment.menuDurationDays;
    return diffDays <= limit ? 'active' : 'expired';
  }

  openMenu(url: string, event: Event) {
    event.stopPropagation();
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  formatLastLoginDate(isoDate?: string | null): string {
    if (!isoDate) return 'Nunca ha accedido';
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return 'Nunca ha accedido';
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
      if (isToday) {
        return `Hoy ${timeStr}`;
      }
      
      const dateStr = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return 'Nunca ha accedido';
    }
  }

  getLatestNoteInfo(patient: Patient): { text: string; category?: string; dateStr?: string; isRecent: boolean; count: number } | null {
    if (!patient || !patient.notas) return null;
    const raw = patient.notas.trim();
    if (!raw) return null;

    let latestNoteText = raw;
    let category = 'general';
    let dateStr: string | undefined = undefined;
    let isRecent = false;
    let count = 1;

    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          count = parsed.length;
          const sorted = [...parsed].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          const latest = sorted[0];
          latestNoteText = latest.text;
          category = latest.category || 'general';
          if (latest.created_at) {
            const created = new Date(latest.created_at);
            const diffHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
            isRecent = diffHours <= 48;
            dateStr = created.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          }
        }
      } catch {}
    } else if (patient.ultima_actualizacion) {
      const updated = new Date(patient.ultima_actualizacion);
      const diffHours = (Date.now() - updated.getTime()) / (1000 * 60 * 60);
      isRecent = diffHours <= 48;
      dateStr = updated.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    }

    return { text: latestNoteText, category, dateStr, isRecent, count };
  }
}
