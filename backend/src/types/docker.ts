// Re-export shared types and add backend-specific types
export * from '../../shared/types';

// Backend-specific types that are not shared with frontend

export interface ProductCSVRow {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  category: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: {
    row: number;
    data: ProductCSVRow;
    error: string;
  }[];
}
