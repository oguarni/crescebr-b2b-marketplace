import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useT } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../locales';
import { categoryLabel } from '../../utils/catalogLabels';
import {
  PRODUCT_AVAILABILITIES,
  type ProductAvailability,
  type ProductFormData,
} from '../../utils/supplierProducts';

interface ProductFormDialogProps {
  open: boolean;
  isEditing: boolean;
  form: ProductFormData;
  categories: string[];
  onChange: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void;
  onClose: () => void;
  onSave: () => void;
}

/**
 * Uppercase group heading used to visually separate the product form into
 * logical sections (basic info, pricing, inventory, media).
 */
const SectionTitle: React.FC<{ titleKey: TranslationKey }> = ({ titleKey }) => {
  const t = useT();

  return (
    <Typography
      variant='subtitle2'
      sx={{
        display: 'block',
        mb: 2,
        fontWeight: 700,
        fontSize: '0.75rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {t(titleKey)}
    </Typography>
  );
};

/** Numeric fields differing only by label, adornment and which key they write. */
const NUMERIC_FIELDS: ReadonlyArray<{
  field: 'price' | 'unitPrice' | 'minimumOrderQuantity' | 'leadTime';
  labelKey: TranslationKey;
  adornmentKey?: TranslationKey;
}> = [
  { field: 'price', labelKey: 'supplierProducts.dialog.price' },
  { field: 'unitPrice', labelKey: 'supplierProducts.dialog.unitPrice' },
  {
    field: 'minimumOrderQuantity',
    labelKey: 'supplierProducts.dialog.minimumOrderQuantity',
    adornmentKey: 'supplierProducts.dialog.unitsAdornment',
  },
  {
    field: 'leadTime',
    labelKey: 'supplierProducts.dialog.leadTime',
    adornmentKey: 'supplierProducts.dialog.daysAdornment',
  },
];

const IMAGE_URL_PLACEHOLDER = 'https://example.com/product.jpg';

/**
 * Create/edit form for a catalogue product, grouped into four labelled sections.
 *
 * @example
 * <ProductFormDialog
 *   open={dialogOpen}
 *   isEditing={Boolean(editingProduct)}
 *   form={form}
 *   categories={categories}
 *   onChange={setFormField}
 *   onClose={closeDialog}
 *   onSave={save}
 * />
 */
export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  isEditing,
  form,
  categories,
  onChange,
  onClose,
  onSave,
}) => {
  const t = useT();

  const numericField = (spec: (typeof NUMERIC_FIELDS)[number]) => (
    <TextField
      fullWidth
      type='number'
      label={t(spec.labelKey)}
      value={form[spec.field]}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(spec.field, Number(e.target.value))
      }
      required
      slotProps={
        spec.adornmentKey
          ? {
              input: {
                endAdornment: (
                  <InputAdornment position='end'>{t(spec.adornmentKey)}</InputAdornment>
                ),
              },
            }
          : undefined
      }
    />
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component='span' variant='h6' sx={{ display: 'block', fontWeight: 600 }}>
          {t(
            isEditing ? 'supplierProducts.dialog.editTitle' : 'supplierProducts.dialog.createTitle'
          )}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {t(
            isEditing
              ? 'supplierProducts.dialog.editSubtitle'
              : 'supplierProducts.dialog.createSubtitle'
          )}
        </Typography>
      </DialogTitle>

      <DialogContent
        dividers
        sx={theme => ({
          // Unified rounded corners and a clear focus ring across every field.
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`,
            },
          },
        })}
      >
        <Stack spacing={3.5} sx={{ mt: 1 }}>
          <Box>
            <SectionTitle titleKey='supplierProducts.dialog.sectionBasic' />
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t('supplierProducts.dialog.name')}
                  value={form.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange('name', e.target.value)
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>{t('supplierProducts.filters.category')}</InputLabel>
                  <Select
                    value={form.category}
                    label={t('supplierProducts.filters.category')}
                    onChange={e => onChange('category', e.target.value)}
                  >
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>
                        {categoryLabel(t, category)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t('supplierProducts.dialog.description')}
                  value={form.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange('description', e.target.value)
                  }
                  required
                />
              </Grid>
            </Grid>
          </Box>

          <Box>
            <SectionTitle titleKey='supplierProducts.dialog.sectionPricing' />
            <Grid container spacing={2.5}>
              {NUMERIC_FIELDS.slice(0, 2).map(spec => (
                <Grid size={{ xs: 12, sm: 6 }} key={spec.field}>
                  {numericField(spec)}
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box>
            <SectionTitle titleKey='supplierProducts.dialog.sectionInventory' />
            <Grid container spacing={2.5}>
              {NUMERIC_FIELDS.slice(2).map(spec => (
                <Grid size={{ xs: 12, sm: 6 }} key={spec.field}>
                  {numericField(spec)}
                </Grid>
              ))}
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>{t('supplierProducts.filters.availability')}</InputLabel>
                  <Select
                    value={form.availability}
                    label={t('supplierProducts.filters.availability')}
                    onChange={e => onChange('availability', e.target.value as ProductAvailability)}
                  >
                    {PRODUCT_AVAILABILITIES.map(availability => (
                      <MenuItem key={availability} value={availability}>
                        {t(`supplierProducts.availability.${availability}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Box>
            <SectionTitle titleKey='supplierProducts.dialog.sectionImage' />
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={t('supplierProducts.dialog.imageUrl')}
                  placeholder={IMAGE_URL_PLACEHOLDER}
                  value={form.imageUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange('imageUrl', e.target.value)
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color='inherit'>
          {t('supplierProducts.dialog.cancel')}
        </Button>
        <Button onClick={onSave} variant='contained'>
          {t(isEditing ? 'supplierProducts.dialog.update' : 'supplierProducts.dialog.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
