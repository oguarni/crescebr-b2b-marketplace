import React from 'react';
import { Alert, Box, Button, IconButton, Typography } from '@mui/material';
import { AddCircleOutline, DeleteOutline } from '@mui/icons-material';
import { useT } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../locales';
import { SETTINGS_LIMITS } from '../../utils/systemSettingsRules';
import {
  addPricingTier,
  removePricingTier,
  tierMinimums,
  type SettingsFieldErrors,
  type SystemSettingsForm,
} from '../../utils/systemSettingsForm';
import { SettingsNumberField } from './SettingsNumberField';

interface PricingTiersFieldsProps {
  form: SystemSettingsForm;
  errors: SettingsFieldErrors;
  onChange: (next: SystemSettingsForm) => void;
}

/**
 * The default volume discounts. Only each tier's upper bound is editable: its
 * lower bound follows from the tier before it, and the last tier is always
 * open-ended, so every quantity has exactly one tier.
 */
export const PricingTiersFields: React.FC<PricingTiersFieldsProps> = ({
  form,
  errors,
  onChange,
}) => {
  const t = useT();
  const tiers = form.pricingTiers;
  const minimums = tierMinimums(tiers);
  const lastIndex = tiers.length - 1;

  const updateTier = (index: number, field: 'maxQuantity' | 'discountPercent', input: string) =>
    onChange({
      ...form,
      pricingTiers: tiers.map((tier, position) =>
        position === index ? { ...tier, [field]: input } : tier
      ),
    });

  const countIssue = errors.pricingTiers;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box component='ol' sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5 }}>
        {tiers.map((tier, index) => {
          const isLast = index === lastIndex;
          return (
            <Box
              component='li'
              key={index}
              aria-label={t('adminSettings.fields.tierLabel', { index: index + 1 })}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1.25fr) minmax(0, 1fr) 44px',
                  sm: 'minmax(0, 1fr) minmax(0, 1fr) 44px',
                },
                gap: 1.25,
                alignItems: 'start',
              }}
            >
              {isLast ? (
                <Box sx={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {t('adminSettings.fields.tierAndAbove', { min: minimums[index] })}
                  </Typography>
                </Box>
              ) : (
                <SettingsNumberField
                  field={`pricingTiers.${index}.maxQuantity`}
                  label={t('adminSettings.fields.tierUpTo', { min: minimums[index] })}
                  integer
                  value={tier.maxQuantity}
                  issue={errors[`pricingTiers.${index}.maxQuantity`]}
                  onChange={input => updateTier(index, 'maxQuantity', input)}
                />
              )}
              <SettingsNumberField
                field={`pricingTiers.${index}.discountPercent`}
                label={t('adminSettings.fields.discount')}
                suffix='%'
                value={tier.discountPercent}
                issue={errors[`pricingTiers.${index}.discountPercent`]}
                onChange={input => updateTier(index, 'discountPercent', input)}
              />
              <IconButton
                aria-label={t('adminSettings.actions.removeTier', { index: index + 1 })}
                onClick={() => onChange(removePricingTier(form, index))}
                disabled={tiers.length <= SETTINGS_LIMITS.tiers.min}
                sx={{ width: 44, height: 44 }}
              >
                <DeleteOutline />
              </IconButton>
            </Box>
          );
        })}
      </Box>

      {countIssue && (
        <Alert severity='error' role='alert'>
          {t(`adminSettings.errors.${countIssue.code}` as TranslationKey, {
            min: SETTINGS_LIMITS.tiers.min,
            max: SETTINGS_LIMITS.tiers.max,
          })}
        </Alert>
      )}

      <Box>
        <Button
          startIcon={<AddCircleOutline />}
          onClick={() => onChange(addPricingTier(form))}
          disabled={tiers.length >= SETTINGS_LIMITS.tiers.max}
          sx={{ minHeight: 44 }}
        >
          {t('adminSettings.actions.addTier')}
        </Button>
      </Box>
    </Box>
  );
};
