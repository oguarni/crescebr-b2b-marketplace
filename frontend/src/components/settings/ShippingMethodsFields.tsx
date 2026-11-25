import React from 'react';
import { Alert, Box, Grid, Typography } from '@mui/material';
import type { ShippingMethod } from '@shared/types';
import { useT } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../locales';
import { SHIPPING_METHODS } from '../../utils/systemSettingsRules';
import type {
  SettingsFieldErrors,
  ShippingMethodForm,
  SystemSettingsForm,
} from '../../utils/systemSettingsForm';
import { SettingsNumberField } from './SettingsNumberField';

interface ShippingMethodsFieldsProps {
  value: SystemSettingsForm['shippingMethods'];
  errors: SettingsFieldErrors;
  onChange: (next: SystemSettingsForm['shippingMethods']) => void;
}

/**
 * The freight table: a flat fee, a per-kilogram rate and a delivery time for
 * each method, in the order a buyer would choose them (fastest first).
 */
export const ShippingMethodsFields: React.FC<ShippingMethodsFieldsProps> = ({
  value,
  errors,
  onChange,
}) => {
  const t = useT();

  const update = (method: ShippingMethod, field: keyof ShippingMethodForm, input: string) =>
    onChange({ ...value, [method]: { ...value[method], [field]: input } });

  const orderIssue = errors.shippingMethods;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {SHIPPING_METHODS.map(method => {
        const path = `shippingMethods.${method}`;
        return (
          <Box key={method} component='fieldset' sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
            <Typography
              component='legend'
              variant='subtitle2'
              sx={{ fontWeight: 700, mb: 1.25, p: 0 }}
            >
              {t(`adminSettings.methods.${method}`)}
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, sm: 4 }}>
                <SettingsNumberField
                  field={`${path}.baseRate`}
                  label={t('adminSettings.fields.baseRate')}
                  prefix='R$'
                  value={value[method].baseRate}
                  issue={errors[`${path}.baseRate`]}
                  onChange={input => update(method, 'baseRate', input)}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <SettingsNumberField
                  field={`${path}.perKgRate`}
                  label={t('adminSettings.fields.perKgRate')}
                  prefix='R$'
                  suffix='/kg'
                  value={value[method].perKgRate}
                  issue={errors[`${path}.perKgRate`]}
                  onChange={input => update(method, 'perKgRate', input)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SettingsNumberField
                  field={`${path}.deliveryDays`}
                  label={t('adminSettings.fields.deliveryDays')}
                  suffix={t('adminSettings.fields.days')}
                  integer
                  value={value[method].deliveryDays}
                  issue={errors[`${path}.deliveryDays`]}
                  onChange={input => update(method, 'deliveryDays', input)}
                />
              </Grid>
            </Grid>
          </Box>
        );
      })}
      {orderIssue && (
        <Alert severity='error' role='alert'>
          {t(`adminSettings.errors.${orderIssue.code}` as TranslationKey)}
        </Alert>
      )}
    </Box>
  );
};
