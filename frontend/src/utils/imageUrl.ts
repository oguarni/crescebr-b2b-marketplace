/**
 * Optimizes remote product image URLs for delivery on the web.
 *
 * Product images are seeded as bare Unsplash photo URLs
 * (https://images.unsplash.com/photo-...), which Unsplash serves at the
 * original full resolution — several megabytes each. Unsplash's image CDN
 * (Imgix) honours sizing/format params on the query string, so we append
 * sensible defaults to cap transfer size: an on-the-fly resize (`w`), modern
 * format negotiation (`auto=format` -> WebP/AVIF), a crop fit, and a quality
 * ceiling. A single full-resolution photo drops from megabytes to tens of KB.
 *
 * Only Unsplash CDN URLs are rewritten. Data URIs (the inline placeholder),
 * relative paths, and any other host are returned unchanged, and params the URL
 * already carries are preserved rather than overwritten.
 */
const UNSPLASH_CDN_PREFIX = 'https://images.unsplash.com/';

export interface ImageOptions {
  /** Target render width in CSS pixels (Unsplash resizes the source to this). */
  width?: number;
  /** Output quality, 1-100. Lower trades fidelity for fewer bytes. */
  quality?: number;
}

export const optimizeImageUrl = (
  url: string | null | undefined,
  { width = 640, quality = 70 }: ImageOptions = {}
): string => {
  if (!url) return '';
  if (!url.startsWith(UNSPLASH_CDN_PREFIX)) return url;
  try {
    const optimized = new URL(url);
    const params = optimized.searchParams;
    if (!params.has('w')) params.set('w', String(width));
    if (!params.has('q')) params.set('q', String(quality));
    if (!params.has('auto')) params.set('auto', 'format');
    if (!params.has('fit')) params.set('fit', 'crop');
    return optimized.toString();
  } catch {
    // Malformed URL — fall back to the original rather than dropping the image.
    return url;
  }
};
