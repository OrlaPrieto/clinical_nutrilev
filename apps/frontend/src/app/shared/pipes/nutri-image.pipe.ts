import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'nutriImage',
  standalone: true
})
export class NutriImagePipe implements PipeTransform {
  private readonly supabaseUrl = environment.supabaseUrl;

  transform(url: string | null | undefined, width?: number, height?: number): string {
    if (!url) return '';

    // If it's a Supabase Storage URL, we can use the transformation API
    if (url.includes(this.supabaseUrl) && url.includes('/storage/v1/object/public/')) {
      // Convert standard object URL to render URL
      // From: .../storage/v1/object/public/bucket/path
      // To:   .../storage/v1/render/image/public/bucket/path
      let renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
      
      const params = new URLSearchParams();
      if (width) params.set('width', width.toString());
      if (height) params.set('height', height.toString());
      params.set('format', 'webp');
      params.set('quality', '80');

      return `${renderUrl}?${params.toString()}`;
    }

    return url;
  }
}
