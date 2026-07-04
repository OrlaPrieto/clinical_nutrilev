import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type FontSizeOption = 'normal' | 'large' | 'extra-large';
export type ColorblindOption = 'default' | 'high-contrast' | 'protanopia' | 'deuteranopia';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private readonly FONT_SIZE_KEY = 'nutrilev-font-size';
  private readonly COLORBLIND_KEY = 'nutrilev-colorblind-mode';

  private fontSizeSubject: BehaviorSubject<FontSizeOption>;
  private colorblindSubject: BehaviorSubject<ColorblindOption>;

  public fontSize$: Observable<FontSizeOption>;
  public colorblindMode$: Observable<ColorblindOption>;

  constructor() {
    // Cargar preferencias iniciales de localStorage o usar por defecto
    const savedFontSize = (localStorage.getItem(this.FONT_SIZE_KEY) as FontSizeOption) || 'normal';
    const savedColorblind = (localStorage.getItem(this.COLORBLIND_KEY) as ColorblindOption) || 'default';

    this.fontSizeSubject = new BehaviorSubject<FontSizeOption>(savedFontSize);
    this.colorblindSubject = new BehaviorSubject<ColorblindOption>(savedColorblind);

    this.fontSize$ = this.fontSizeSubject.asObservable();
    this.colorblindMode$ = this.colorblindSubject.asObservable();

    // Aplicar las clases iniciales
    this.applyFontSize(savedFontSize);
    this.applyColorblindMode(savedColorblind);
  }

  // Actualizar tamaño de letra
  setFontSize(size: FontSizeOption): void {
    localStorage.setItem(this.FONT_SIZE_KEY, size);
    this.fontSizeSubject.next(size);
    this.applyFontSize(size);
  }

  // Actualizar modo de color / daltonismo
  setColorblindMode(mode: ColorblindOption): void {
    localStorage.setItem(this.COLORBLIND_KEY, mode);
    this.colorblindSubject.next(mode);
    this.applyColorblindMode(mode);
  }

  // Obtener valores actuales de forma sincrónica
  getCurrentFontSize(): FontSizeOption {
    return this.fontSizeSubject.value;
  }

  getCurrentColorblindMode(): ColorblindOption {
    return this.colorblindSubject.value;
  }
  private applyFontSize(size: FontSizeOption): void {
    const html = document.documentElement;
    html.classList.remove('accessibility-font-normal', 'accessibility-font-large', 'accessibility-font-xlarge');
    
    if (size === 'large') {
      html.classList.add('accessibility-font-large');
    } else if (size === 'extra-large') {
      html.classList.add('accessibility-font-xlarge');
    } else {
      html.classList.add('accessibility-font-normal');
    }
  }

  private applyColorblindMode(mode: ColorblindOption): void {
    const html = document.documentElement;
    html.classList.remove(
      'accessibility-color-default',
      'accessibility-high-contrast',
      'accessibility-protanopia',
      'accessibility-deuteranopia'
    );

    if (mode === 'high-contrast') {
      html.classList.add('accessibility-high-contrast');
    } else if (mode === 'protanopia') {
      html.classList.add('accessibility-protanopia');
    } else if (mode === 'deuteranopia') {
      html.classList.add('accessibility-deuteranopia');
    } else {
      html.classList.add('accessibility-color-default');
    }
  }
}
