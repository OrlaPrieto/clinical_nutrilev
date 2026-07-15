import { Injectable, signal } from '@angular/core';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info' | null;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  public toast = signal<ToastState>({ message: '', type: null });
  private timeoutId: any;

  show(message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.toast.set({ message, type });
    this.timeoutId = setTimeout(() => {
      this.toast.set({ message: '', type: null });
    }, duration);
  }

  clear() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.toast.set({ message: '', type: null });
  }
}
