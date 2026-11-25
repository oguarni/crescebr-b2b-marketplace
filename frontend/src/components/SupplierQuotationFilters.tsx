import React from 'react';
import {
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
import { Search } from '@mui/icons-material';
import { useT } from '../contexts/LanguageContext';
import type { TranslationKey } from '../locales';
import type { QuotationFilters } from '../utils/quotationFilters';

interface SupplierQuotationFiltersProps {
  filters: QuotationFilters;
  onChange: <K extends keyof QuotationFilters>(field: K, value: QuotationFilters[K]) => void;
}

interface SelectFilterSpec {
  field: keyof Omit<QuotationFilters, 'searchTerm'>;
  labelKey: TranslationKey;
  allKey: TranslationKey;
  optionKeys: Array<{ value: string; labelKey: TranslationKey }>;
}

// Each spec's `value` is the stable key the predicate compares against, kept
// deliberately separate from the translated label rendered beside it.
const SELECT_FILTERS: SelectFilterSpec[] = [
  {
    field: 'status',
    labelKey: 'supplierQuotations.filters.status',
    allKey: 'supplierQuotations.filters.allStatus',
    optionKeys: [
      { value: 'pending', labelKey: 'supplierQuotations.status.pending' },
      { value: 'processed', labelKey: 'supplierQuotations.status.processed' },
      { value: 'completed', labelKey: 'supplierQuotations.status.completed' },
      { value: 'rejected', labelKey: 'supplierQuotations.status.rejected' },
    ],
  },
  {
    field: 'priority',
    labelKey: 'supplierQuotations.filters.priority',
    allKey: 'supplierQuotations.filters.allPriority',
    optionKeys: [
      { value: 'urgent', labelKey: 'supplierQuotations.priority.urgent' },
      { value: 'high', labelKey: 'supplierQuotations.priority.high' },
      { value: 'medium', labelKey: 'supplierQuotations.priority.medium' },
      { value: 'low', labelKey: 'supplierQuotations.priority.low' },
    ],
  },
  {
    field: 'dateRange',
    labelKey: 'supplierQuotations.filters.dateRange',
    allKey: 'supplierQuotations.filters.allTime',
    optionKeys: [
      { value: 'today', labelKey: 'supplierQuotations.filters.today' },
      { value: 'week', labelKey: 'supplierQuotations.filters.thisWeek' },
      { value: 'month', labelKey: 'supplierQuotations.filters.thisMonth' },
    ],
  },
];

/**
 * Search box plus the status, priority and date-range selects above the queue.
 *
 * @example
 * <SupplierQuotationFilters
 *   filters={filters}
 *   onChange={(field, value) => setFilters(prev => ({ ...prev, [field]: value }))}
 * />
 */
export const SupplierQuotationFilters: React.FC<SupplierQuotationFiltersProps> = ({
  filters,
  onChange,
}) => {
  const t = useT();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2} alignItems='center'>
          {/* Full row on tablets, so each filter below gets a third of it and its label fits. */}
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              placeholder={t('supplierQuotations.filters.searchPlaceholder')}
              value={filters.searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange('searchTerm', e.target.value)
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
          {SELECT_FILTERS.map(spec => (
            <Grid size={{ xs: 12, sm: 4, md: 2 }} key={spec.field}>
              <FormControl fullWidth>
                <InputLabel>{t(spec.labelKey)}</InputLabel>
                <Select
                  value={filters[spec.field]}
                  label={t(spec.labelKey)}
                  onChange={e => onChange(spec.field, e.target.value)}
                >
                  <MenuItem value=''>{t(spec.allKey)}</MenuItem>
                  {spec.optionKeys.map(option => (
                    <MenuItem value={option.value} key={option.value}>
                      {t(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
