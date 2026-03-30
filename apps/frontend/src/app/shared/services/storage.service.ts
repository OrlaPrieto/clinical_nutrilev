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
    
    // If it's a simple string that doesn't start with { or [, it might not be JSON
    if (typeof data === 'string' && !data.startsWith('{') && !data.startsWith('[') && !data.startsWith('"')) {
      return data as unknown as T;
    }

    try {
      return JSON.parse(data) as T;
    } catch (e) {
      // Fallback: if JSON parse fails, return the raw string if possible
      return data as unknown as T;
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
