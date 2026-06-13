import { Injectable, signal, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

export type ThemeType = 'light' | 'dark' | 'vibrant' | 'purple' | 'ocean' | 'terracotta';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private storage = inject(StorageService);
  private readonly THEME_KEY = 'nutrilev-theme-v2';
  
  // Theme state
  theme = signal<ThemeType>(this.getInitialTheme());

  constructor() {
    // Apply theme whenever it changes
    effect(() => {
      this.updateTheme(this.theme());
    });
  }

  setTheme(newTheme: ThemeType) {
    this.theme.set(newTheme);
  }

  private getInitialTheme(): ThemeType {
    const saved = this.storage.getItem<ThemeType>(this.THEME_KEY);
    if (saved) return saved;
    
    // Default to light
    return 'light';
  }

  private updateTheme(newTheme: ThemeType) {
    const root = document.documentElement;
    
    // Disable transitions temporarily to prevent visual flashing
    root.classList.add('no-transitions');
    
    // Remove all theme classes
    root.classList.remove('dark', 'theme-vibrant', 'theme-purple', 'theme-soft', 'theme-ocean', 'theme-terracotta');
    
    // Add the selected one (unless it's light which is the default)
    if (newTheme !== 'light') {
      root.classList.add(newTheme === 'dark' ? 'dark' : `theme-${newTheme}`);
    }
    
    // Force browser reflow to apply classes instantly
    const _ = window.getComputedStyle(root).opacity;
    
    // Re-enable transitions on the next tick
    setTimeout(() => {
      root.classList.remove('no-transitions');
    }, 0);
    
    // Persist
    this.storage.setItem(this.THEME_KEY, newTheme);
  }

  // Helper for backward compatibility or simple toggles
  isDarkMode() {
    return this.theme() === 'dark';
  }
}
