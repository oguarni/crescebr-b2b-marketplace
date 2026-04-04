import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ReactDOM before importing main
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({ render: mockRender }));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mockCreateRoot,
  },
}));

// Mock CSS and font imports that don't work in jsdom
vi.mock('./index.css', () => ({}));
vi.mock('@fontsource/inter/300.css', () => ({}));
vi.mock('@fontsource/inter/400.css', () => ({}));
vi.mock('@fontsource/inter/500.css', () => ({}));
vi.mock('@fontsource/inter/600.css', () => ({}));
vi.mock('@fontsource/inter/700.css', () => ({}));
vi.mock('@fontsource/open-sans/300.css', () => ({}));
vi.mock('@fontsource/open-sans/400.css', () => ({}));
vi.mock('@fontsource/open-sans/500.css', () => ({}));
vi.mock('@fontsource/open-sans/600.css', () => ({}));
vi.mock('@fontsource/open-sans/700.css', () => ({}));

// Mock App and other components to avoid full render
vi.mock('./App', () => ({ default: () => null }));
vi.mock('./theme', () => ({ default: {} }));

describe('main.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Create root element in document
    const existingRoot = document.getElementById('root');
    if (!existingRoot) {
      const root = document.createElement('div');
      root.id = 'root';
      document.body.appendChild(root);
    }
  });

  it('calls ReactDOM.createRoot with the root element and renders the app', async () => {
    await import('./main');

    expect(mockCreateRoot).toHaveBeenCalledWith(expect.any(HTMLElement));
    expect(mockRender).toHaveBeenCalled();
  });
});
