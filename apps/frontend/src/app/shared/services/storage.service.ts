import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  /**
   * Get an item from localStorage
   */
  getItem<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Error parsing storage key "${key}":`, e);
      return null;
    }
  }

  /**
   * Set an item in localStorage
   */
  setItem(key: string, value: any): void {
    try {
      const data = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, data);
    } catch (e) {
      console.error(`Error saving storage key "${key}":`, e);
    }
  }

  /**
   * Remove an item from localStorage
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all localStorage
   */
  clear(): void {
    localStorage.clear();
  }
}
