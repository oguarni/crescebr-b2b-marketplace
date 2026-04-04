import { describe, it, expect } from 'vitest';

// Importing from the barrel index exercises all the re-exports,
// which is the only executable line (the export statements themselves).
import * as ComponentsIndex from './index';

describe('components/index barrel exports', () => {
  it('exports Navbar', () => {
    expect(ComponentsIndex.Navbar).toBeDefined();
  });

  it('exports Layout', () => {
    expect(ComponentsIndex.Layout).toBeDefined();
  });

  it('exports ProtectedRoute', () => {
    expect(ComponentsIndex.ProtectedRoute).toBeDefined();
  });

  it('exports PermissionGuard', () => {
    expect(ComponentsIndex.PermissionGuard).toBeDefined();
  });

  it('exports CartDrawer', () => {
    expect(ComponentsIndex.CartDrawer).toBeDefined();
  });

  it('exports LoadingSpinner', () => {
    expect(ComponentsIndex.LoadingSpinner).toBeDefined();
  });

  it('exports ErrorMessage', () => {
    expect(ComponentsIndex.ErrorMessage).toBeDefined();
  });

  it('exports EmptyState', () => {
    expect(ComponentsIndex.EmptyState).toBeDefined();
  });
});
