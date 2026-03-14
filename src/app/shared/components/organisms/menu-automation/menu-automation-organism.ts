import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-menu-automation',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './menu-automation-organism.html',
  styleUrl: './menu-automation-organism.css'
})
export class MenuAutomationOrganism {
  selectedFile: File | null = null;
  processing: boolean = false;
  error: string | null = null;
  success: boolean = false;
  apiKey: string = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      this.selectedFile = file;
      this.error = null;
      this.success = false;
    } else {
      this.error = 'Por favor selecciona un archivo .docx válido.';
      this.selectedFile = null;
    }
  }

  processMenu() {
    if (!this.selectedFile) return;

    this.processing = true;
    this.error = null;
    this.success = false;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    if (this.apiKey) {
      formData.append('api_key', this.apiKey);
    }

    const token = this.authService.user?.idToken;
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
        link.download = `menu_procesado_${this.selectedFile?.name}`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.processing = false;
        this.success = true;
      },
      error: (err) => {
        console.error('Error processing menu', err);
        this.error = 'Error al procesar el menú. Verifica tu API Key y el formato del archivo.';
        this.processing = false;
      }
    });
  }
}
