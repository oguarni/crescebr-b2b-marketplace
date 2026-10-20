import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { Search, ViewList, ViewModule } from '@mui/icons-material';
import { useT } from '../../contexts/LanguageContext';
import { PRODUCT_AVAILABILITIES, type ProductFilters } from '../../utils/supplierProducts';
import { categoryLabel } from '../../utils/catalogLabels';

export type ProductViewMode = 'grid' | 'table';

interface ProductFilterBarProps {
  filters: ProductFilters;
  categories: string[];
  viewMode: ProductViewMode;
  onFilterChange: <K extends keyof ProductFilters>(field: K, value: ProductFilters[K]) => void;
  onViewModeChange: (mode: ProductViewMode) => void;
}

/**
 * Search, category and availability filters, plus the grid/table toggle.
 *
 * @example
 * <ProductFilterBar
 *   filters={filters}
 *   categories={categories}
 *   viewMode={viewMode}
 *   onFilterChange={(field, value) => setFilters(prev => ({ ...prev, [field]: value }))}
 *   onViewModeChange={setViewMode}
 * />
 */
export const ProductFilterBar: React.FC<ProductFilterBarProps> = ({
  filters,
  categories,
  viewMode,
  onFilterChange,
  onViewModeChange,
}) => {
  const t = useT();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2} alignItems='center'>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              placeholder={t('supplierProducts.filters.searchPlaceholder')}
              value={filters.searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onFilterChange('searchTerm', e.target.value)
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth>
              <InputLabel>{t('supplierProducts.filters.category')}</InputLabel>
              <Select
                value={filters.category}
                label={t('supplierProducts.filters.category')}
                onChange={e => onFilterChange('category', e.target.value)}
              >
                <MenuItem value=''>{t('supplierProducts.filters.allCategories')}</MenuItem>
                {/* The seeded taxonomy shows a translated label and free-form
                    categories show as stored; the stored value is what is selected. */}
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {categoryLabel(t, category)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth>
              <InputLabel>{t('supplierProducts.filters.availability')}</InputLabel>
              <Select
                value={filters.availability}
                label={t('supplierProducts.filters.availability')}
                onChange={e => onFilterChange('availability', e.target.value)}
              >
                <MenuItem value=''>{t('supplierProducts.filters.allAvailability')}</MenuItem>
                {PRODUCT_AVAILABILITIES.map(availability => (
                  <MenuItem key={availability} value={availability}>
                    {t(`supplierProducts.availability.${availability}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 2 }}>
            <Box display='flex' justifyContent='flex-end'>
              <Button
                variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                aria-label={t('supplierProducts.filters.gridViewAria')}
                onClick={() => onViewModeChange('grid')}
                sx={{ mr: 1 }}
              >
                <ViewModule />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                aria-label={t('supplierProducts.filters.tableViewAria')}
                onClick={() => onViewModeChange('table')}
              >
                <ViewList />
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
