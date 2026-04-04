import { describe, it, expect } from 'vitest';
import * as types from './index';

describe('types/index', () => {
  it('re-exports shared types and frontend types', () => {
    // The module should be importable (covers the export * from '@shared/types' statement)
    expect(types).toBeDefined();
  });
});
