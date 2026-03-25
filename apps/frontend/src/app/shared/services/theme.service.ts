import { Injectable, signal, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private storage = inject(StorageService);
  private readonly THEME_KEY = 'nutrilev-theme';
  isDarkMode = signal<boolean>(this.getInitialTheme());

  constructor() {
    // Apply theme whenever isDarkMode changes
    effect(() => {
      this.updateTheme(this.isDarkMode());
    });
  }

  toggleTheme() {
    this.isDarkMode.update(prev => !prev);
  }

  private getInitialTheme(): boolean {
    const saved = this.storage.getItem<'dark' | 'light'>(this.THEME_KEY);
    if (saved) return saved === 'dark';
    
    // Forzar Light Mode por defecto
    return false;
  }

  private updateTheme(isDark: boolean) {
    if (isDark) {
      document.documentElement.classList.add('dark');
      this.storage.setItem(this.THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      this.storage.setItem(this.THEME_KEY, 'light');
    }
  }
}
