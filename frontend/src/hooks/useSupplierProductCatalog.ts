import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Product } from '@shared/types';
import { productsService } from '../services/productsService';
import { useProducts } from './useProducts';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';
import { browserLogger } from '../utils/browserLogger';
import { getErrorMessage } from '../utils/errorHandler';
import type { ProductFormData } from '../utils/supplierProducts';

interface UseSupplierProductCatalogResult {
  products: Product[];
  categories: string[];
  loading: boolean;
  saveProduct: (form: ProductFormData, editingProduct: Product | null) => Promise<boolean>;
  deleteProduct: (productId: number) => Promise<void>;
  /** Imports a CSV file and reloads the catalogue; reports the outcome itself. */
  importProducts: (file: File) => Promise<void>;
}

/**
 * The supplier's catalogue plus the category list its dropdowns need, with
 * create, update and delete on top.
 *
 * `saveProduct` returns whether it succeeded so the caller can keep the dialog
 * open — and the user's typing — when the server rejects the product.
 *
 * @example
 * const { products, categories, saveProduct } = useSupplierProductCatalog();
 */
export const useSupplierProductCatalog = (): UseSupplierProductCatalogResult => {
  const t = useT();
  const { user } = useAuth();
  const { products, loading, refetch } = useProducts();
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategories(await productsService.getCategories());
      } catch (error) {
        // Non-fatal: the catalogue still renders, only the filter loses its options.
        browserLogger.error('Failed to load categories', { error });
      }
    };

    loadCategories();
  }, []);

  const saveProduct = useCallback(
    async (form: ProductFormData, editingProduct: Product | null): Promise<boolean> => {
      const supplierId = user?.id;
      if (!supplierId) {
        toast.error(t('supplierProducts.toast.notAuthenticated'));
        return false;
      }

      try {
        const payload = { ...form, supplierId };

        if (editingProduct) {
          await productsService.updateProduct(editingProduct.id, payload);
          toast.success(t('supplierProducts.toast.updateSuccess'));
        } else {
          await productsService.createProduct(payload);
          toast.success(t('supplierProducts.toast.createSuccess'));
        }

        await refetch();
        return true;
      } catch (error) {
        browserLogger.error('Failed to save product', { error });
        toast.error(t('supplierProducts.toast.saveError'));
        return false;
      }
    },
    [refetch, t, user?.id]
  );

  const deleteProduct = useCallback(
    async (productId: number) => {
      try {
        await productsService.deleteProduct(productId);
        toast.success(t('supplierProducts.toast.deleteSuccess'));
        await refetch();
      } catch (error) {
        browserLogger.error('Failed to delete product', { error });
        toast.error(t('supplierProducts.toast.deleteError'));
      }
    },
    [refetch, t]
  );

  const importProducts = useCallback(
    async (file: File): Promise<void> => {
      try {
        const result = await productsService.importProductsCsv(file);
        if (result.failed === 0) {
          toast.success(t('supplierProducts.toast.imported', { count: result.imported }));
        } else {
          const [first] = result.errors;
          toast.error(
            t('supplierProducts.toast.importedWithErrors', {
              imported: result.imported,
              failed: result.failed,
              row: first?.row ?? '-',
              error: first?.error ?? '',
            }),
            { duration: 10000 }
          );
        }
        if (result.imported > 0) await refetch();
      } catch (error) {
        browserLogger.error('CSV import failed', { error });
        toast.error(t('supplierProducts.toast.importError', { reason: getErrorMessage(error) }));
      }
    },
    [refetch, t]
  );

  return { products, categories, loading, saveProduct, deleteProduct, importProducts };
};
