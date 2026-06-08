import { describe, it, expect } from 'vitest';

import { optimizeImageUrl } from './imageUrl';

describe('optimizeImageUrl', () => {
  it('appends sizing, format, fit and quality params to bare Unsplash URLs', () => {
    const url = new URL(optimizeImageUrl('https://images.unsplash.com/photo-123'));
    expect(url.searchParams.get('w')).toBe('640');
    expect(url.searchParams.get('q')).toBe('70');
    expect(url.searchParams.get('auto')).toBe('format');
    expect(url.searchParams.get('fit')).toBe('crop');
  });

  it('honours explicit width and quality options', () => {
    const url = new URL(
      optimizeImageUrl('https://images.unsplash.com/photo-123', { width: 96, quality: 50 })
    );
    expect(url.searchParams.get('w')).toBe('96');
    expect(url.searchParams.get('q')).toBe('50');
  });

  it('preserves params the URL already carries', () => {
    const url = new URL(optimizeImageUrl('https://images.unsplash.com/photo-123?w=1200&q=90'));
    expect(url.searchParams.get('w')).toBe('1200');
    expect(url.searchParams.get('q')).toBe('90');
  });

  it('leaves non-Unsplash URLs unchanged', () => {
    expect(optimizeImageUrl('https://example.com/pump.jpg')).toBe('https://example.com/pump.jpg');
    expect(optimizeImageUrl('/img/local.png')).toBe('/img/local.png');
    expect(optimizeImageUrl('data:image/svg+xml,abc')).toBe('data:image/svg+xml,abc');
  });

  it('returns an empty string for nullish input', () => {
    expect(optimizeImageUrl('')).toBe('');
    expect(optimizeImageUrl(null)).toBe('');
    expect(optimizeImageUrl(undefined)).toBe('');
  });
});
