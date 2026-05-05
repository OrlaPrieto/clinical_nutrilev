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
export class MenuAutomationOrganism implements OnInit {
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);

  selectedFile = signal<File | null>(null);
  processing = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<boolean>(false);

  // AI Menu Generation
  isAiMode = signal<boolean>(true);
  patients = signal<any[]>([]);
  searchQuery = signal<string>('');
  selectedPatientEmail = signal<string>('');
  extraNotes = signal<string>('');
  totalCalories = signal<number>(2000);
  generatedMenu = signal<string>('');
  latestProgress = signal<any>(null);
  
  // Progress Steps v3.2
  currentStep = signal<number>(0);
  generationSteps = signal<string[]>([
    'Analizando historial y progreso clínico...',
    'Consultando a NutriArchitect AI (Gemini 2.5)...',
    'Validando equivalencias y raciones clínicas...',
    'Normalizando estructura de menús (v3.2)...',
    'Generando reporte DOCX final...'
  ]);
  private stepInterval: any;

  patientData = computed(() => {
    const email = this.selectedPatientEmail();
    const patient = this.patients().find(p => p.email === email);
    if (!patient) return {};
    return {
      ...patient,
      latest_progress: this.latestProgress()
    };
  });

  filteredPatients = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.patients()
      .filter(p => 
        p.nombre.toLowerCase().includes(query) || 
        p.email.toLowerCase().includes(query)
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
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
    if (!file) {
      this.error.set('Por favor selecciona una plantilla base.');
      return;
    }

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
        this.error.set('Error al procesar el menú. Verifica la conexión con el servidor.');
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
    this.currentStep.set(0);

    // Simular progreso de pasos
    this.stepInterval = setInterval(() => {
      if (this.currentStep() < this.generationSteps().length - 1) {
        this.currentStep.update(s => s + 1);
      }
    }, 4000); // 4 segundos por paso aprox. para 20s totales

    const token = this.authService.accessToken;
    const headers: { [header: string]: string } = token ? { 'Authorization': `Bearer ${token}` } : {};

    const formData = new FormData();
    formData.append('patient_context', JSON.stringify(this.patientData()));
    formData.append('calories', this.totalCalories().toString());
    formData.append('extra_notes', this.extraNotes());
    
    const file = this.selectedFile();
    if (file) {
      formData.append('file', file);
    }

    this.http.post('/api/generate-ai-menu', formData, { 
      headers,
      responseType: 'blob' 
    }).subscribe({
        next: (blob: any) => {
          clearInterval(this.stepInterval);
          this.currentStep.set(this.generationSteps().length); // All done
          
          const url = window.URL.createObjectURL(blob as Blob);
          const link = document.createElement('a');
          link.href = url;
          const patientName = this.patientData()?.nombre?.replace(/\s+/g, '_') || this.selectedPatientEmail();
          link.download = `Menu_NutriArchitect_${patientName}_${new Date().toISOString().split('T')[0]}.docx`;
          link.click();
          window.URL.revokeObjectURL(url);
          
          setTimeout(() => {
            this.processing.set(false);
            this.success.set(true);
          }, 1000);
        },
        error: (err) => {
          clearInterval(this.stepInterval);
          console.error('Error generating AI menu', err);
          this.error.set('Error al generar el menú. Verifica la conexión con el servidor.');
          this.processing.set(false);
        }
      });
  }

  copyToClipboard() {
    // No longer needed for docx
  }
}
