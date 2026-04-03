import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../services/auth.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { ButtonComponent } from '../../atoms/button/button';
import { IconComponent } from '../../atoms/icon/icon';
import { DashboardHeaderComponent } from '../dashboard-header/dashboard-header';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-o-menu-automation',
  standalone: true,
  imports: [
    CommonModule, 
    HttpClientModule, 
    FormsModule, 
    RouterModule, 
    MatIconModule, 
    ButtonComponent, 
    IconComponent, 
    DashboardHeaderComponent
  ],
  templateUrl: './menu-automation-organism.html',
  styleUrl: './menu-automation-organism.css'
})
export class MenuAutomationOrganism {
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);

  selectedFile = signal<File | null>(null);
  processing = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<boolean>(false);

  // AI Menu Generation
  isAiMode = signal<boolean>(true); // Default to true now
  patients = signal<any[]>([]);
  searchQuery = signal<string>('');
  selectedPatientEmail = signal<string>('');
  extraNotes = signal<string>('');
  totalCalories = signal<number>(2000);
  generatedMenu = signal<string>('');
  latestProgress = signal<any>(null);

  filteredPatients = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.patients().filter(p => 
      p.nombre.toLowerCase().includes(query) || 
      p.email.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    const token = this.authService.accessToken;
    const headers: { [header: string]: string } = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    this.http.get<any>('/api/patients', { headers })
      .subscribe({
        next: (data) => this.patients.set(data as any[]),
        error: (err) => console.error('Error loading patients', err)
      });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      this.selectedFile.set(file);
      this.error.set(null);
      this.success.set(false);
    } else {
      this.error.set('Por favor selecciona un archivo .docx válido.');
      this.selectedFile.set(null);
    }
  }

  processMenu() {
    if (this.isAiMode()) {
      this.generateAiMenu();
      return;
    }

    const file = this.selectedFile();
    if (!file) return;

    this.processing.set(true);
    this.error.set(null);
    this.success.set(false);

    const formData = new FormData();
    formData.append('file', file);

    const token = this.authService.accessToken;
    const headers: { [header: string]: string } = token ? { 'Authorization': `Bearer ${token}` } : {};

    this.http.post('/api/process-menu', formData, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob as Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `menu_procesado_${file.name}`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.processing.set(false);
        this.success.set(true);
      },
      error: (err) => {
        console.error('Error processing menu', err);
        this.error.set('Error al procesar el menú. Verifica tu API Key y el formato del archivo.');
        this.processing.set(false);
      }
    });
  }

  onPatientSelected(email: string) {
    this.selectedPatientEmail.set(email);
    this.loadPatientProgress(email);
  }

  loadPatientProgress(email: string) {
    const token = this.authService.accessToken;
    const headers: { [header: string]: string } = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    this.http.get<any[]>(`/api/patients/${email}/progress`, { headers })
      .subscribe({
        next: (data) => {
          this.latestProgress.set(data.length > 0 ? data[0] : null);
        },
        error: (err) => console.error('Error loading progress', err)
      });
  }

  generateAiMenu() {
    if (!this.selectedPatientEmail()) {
      this.error.set('Por favor selecciona un paciente.');
      return;
    }

    this.processing.set(true);
    this.error.set(null);
    this.success.set(false);

    const token = this.authService.accessToken;
    const headers: { [header: string]: string } = token ? { 'Authorization': `Bearer ${token}` } : {};

    const body = {
      patient_email: this.selectedPatientEmail(),
      extra_notes: this.extraNotes(),
      calories: this.totalCalories()
    };

    this.http.post('/api/patients/generate-ai-menu', body, { 
      headers,
      responseType: 'blob' 
    }).subscribe({
        next: (blob: any) => {
          const url = window.URL.createObjectURL(blob as Blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Menu_IA_${this.selectedPatientEmail()}.docx`;
          link.click();
          window.URL.revokeObjectURL(url);
          
          this.processing.set(false);
          this.success.set(true);
        },
        error: (err) => {
          console.error('Error generating AI menu', err);
          this.error.set('Error al generar el menú con IA. Inténtalo de nuevo.');
          this.processing.set(false);
        }
      });
  }

  copyToClipboard() {
    // No longer needed for docx, but keeping empty to avoid template errors if not removed yet
  }
}
