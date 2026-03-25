import { Component, inject, signal } from '@angular/core';
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
export class MenuAutomationOrganism {
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);

  selectedFile = signal<File | null>(null);
  processing = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<boolean>(false);

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
    const file = this.selectedFile();
    if (!file) return;

    this.processing.set(true);
    this.error.set(null);
    this.success.set(false);

    const formData = new FormData();
    formData.append('file', file);

    const token = this.authService.accessToken;
    let headers = {};
    if (token) {
      headers = { 'Authorization': `Bearer ${token}` };
    }

    this.http.post('/api/process-menu', formData, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
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
}
