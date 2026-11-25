import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Fab,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Add, FileDownload, FileUpload } from '@mui/icons-material';
import toast from 'react-hot-toast';
import type { Product } from '@shared/types';
import { useT } from '../contexts/LanguageContext';
import { useSupplierProductCatalog } from '../hooks/useSupplierProductCatalog';
import { ProductStatsCards } from '../components/products/ProductStatsCards';
import { ProductFilterBar, type ProductViewMode } from '../components/products/ProductFilterBar';
import { ProductCardGrid } from '../components/products/ProductCardGrid';
import { ProductTable } from '../components/products/ProductTable';
import { ProductFormDialog } from '../components/products/ProductFormDialog';
import {
  EMPTY_PRODUCT_FILTERS,
  EMPTY_PRODUCT_FORM,
  groupProductsByStock,
  matchesProductFilters,
  productFormFromProduct,
  PRODUCT_TAB_KEYS,
  type ProductFilters,
  type ProductFormData,
} from '../utils/supplierProducts';
import { downloadCsv, toProductsCsv } from '../utils/productCsv';

/**
 * The supplier's catalogue: filterable, viewable as cards or a table, grouped by
 * stock status into tabs, with a create/edit dialog.
 *
 * Data access lives in `useSupplierProductCatalog`, filter and status rules in
 * `utils/supplierProducts`, and each UI block in its own component.
 */
const SupplierProductsPage: React.FC = () => {
  const t = useT();
  const { products, categories, loading, saveProduct, deleteProduct, importProducts } =
    useSupplierProductCatalog();

  const [viewMode, setViewMode] = useState<ProductViewMode>('grid');
  const [selectedTab, setSelectedTab] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);

  const productsByStock = groupProductsByStock(
    products.filter(product => matchesProductFilters(product, filters))
  );
  const activeTab = PRODUCT_TAB_KEYS[selectedTab] ?? 'all';
  const displayProducts = productsByStock[activeTab];

  const handleFilterChange = <K extends keyof ProductFilters>(field: K, value: ProductFilters[K]) =>
    setFilters(previous => ({ ...previous, [field]: value }));

  const handleFormChange = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) =>
    setForm(previous => ({ ...previous, [field]: value }));

  const handleExport = () => {
    downloadCsv(toProductsCsv(products), 'produtos-crescebr.csv');
    toast.success(t('supplierProducts.toast.exported', { count: products.length }));
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setForm(EMPTY_PRODUCT_FORM);
    setDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setForm(productFormFromProduct(product));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Keep the dialog open on failure so the entered details are not lost.
    if (await saveProduct(form, editingProduct)) setDialogOpen(false);
  };

  const handleDelete = (productId: number) => {
    if (!window.confirm(t('supplierProducts.toast.deleteConfirm'))) return;
    deleteProduct(productId);
  };

  // The export writes the importer's own columns, so it doubles as a template
  // and a backup. Import always creates new products: editing an exported row
  // and importing it adds a copy rather than updating the original.
  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file again still fires onChange.
    event.target.value = '';
    if (file) importProducts(file);
  };

  return (
    <Container maxWidth='xl' sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 4,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant='h4'
            component='h1'
            gutterBottom
            sx={{ fontSize: { xs: '1.6rem', sm: '2.125rem' } }}
          >
            {t('supplierProducts.title')}
          </Typography>
          <Typography variant='subtitle1' color='text.secondary'>
            {t('supplierProducts.subtitle')}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, auto)' },
            gap: 1.5,
            '& > :last-child': { gridColumn: { xs: '1 / -1', sm: 'auto' } },
          }}
        >
          <Button
            variant='outlined'
            startIcon={<FileDownload />}
            onClick={handleExport}
            disabled={products.length === 0}
          >
            {t('supplierProducts.exportCsv')}
          </Button>
          <input
            type='file'
            accept='.csv'
            onChange={handleCsvImport}
            style={{ display: 'none' }}
            id='csv-import'
          />
          <label htmlFor='csv-import' style={{ display: 'flex' }}>
            <Button variant='outlined' component='span' startIcon={<FileUpload />} fullWidth>
              {t('supplierProducts.importCsv')}
            </Button>
          </label>
          <Button variant='contained' startIcon={<Add />} onClick={handleCreate}>
            {t('supplierProducts.addProduct')}
          </Button>
        </Box>
      </Box>

      <ProductStatsCards products={products} />

      <ProductFilterBar
        filters={filters}
        categories={categories}
        viewMode={viewMode}
        onFilterChange={handleFilterChange}
        onViewModeChange={setViewMode}
      />

      {loading ? (
        <Box display='flex' justifyContent='center' mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Driven from PRODUCT_TAB_KEYS so the tabs and the grouped buckets cannot drift apart. */}
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
            variant='scrollable'
            allowScrollButtonsMobile
            sx={{ mb: 2 }}
          >
            {PRODUCT_TAB_KEYS.map(key => (
              <Tab
                key={key}
                label={`${t(`supplierProducts.tabs.${key}`)} (${productsByStock[key].length})`}
              />
            ))}
          </Tabs>

          {displayProducts.length === 0 ? (
            <Alert severity='info' sx={{ mt: 2 }}>
              {t(`supplierProducts.empty.${activeTab}`)}
            </Alert>
          ) : viewMode === 'grid' ? (
            <ProductCardGrid
              products={displayProducts}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <ProductTable products={displayProducts} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </>
      )}

      <ProductFormDialog
        open={dialogOpen}
        isEditing={Boolean(editingProduct)}
        form={form}
        categories={categories}
        onChange={handleFormChange}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      <Fab
        color='primary'
        aria-label={t('supplierProducts.addProductAria')}
        sx={{
          position: 'fixed',
          right: 16,
          // Clear of the phone bottom navigation.
          bottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 16 },
        }}
        onClick={handleCreate}
      >
        <Add />
      </Fab>
    </Container>
  );
};

export default SupplierProductsPage;
