import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-menu-automation',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: './menu-automation.html',
  styleUrl: './menu-automation.css'
})
export class MenuAutomationComponent {
  selectedFile: File | null = null;
  processing: boolean = false;
  error: string | null = null;
  success: boolean = false;
  apiKey: string = '';

  constructor(private http: HttpClient) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && file.name.endsWith('.docx')) {
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

    this.http.post('/api/process-menu', formData, {
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
