import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
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
    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved) return saved === 'dark';
    
    // Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private updateTheme(isDark: boolean) {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(this.THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(this.THEME_KEY, 'light');
    }
  }
}
