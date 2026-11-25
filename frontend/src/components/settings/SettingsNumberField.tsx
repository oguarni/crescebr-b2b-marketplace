import React from 'react';
import { InputAdornment, TextField } from '@mui/material';
import { useT } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../locales';
import type { SettingsIssue } from '../../utils/systemSettingsRules';

/** Fields whose rules are stated as fractions (0.5) but edited as percentages (50). */
const isPercentField = (field: string): boolean =>
  field === 'taxRatePercent' || field.endsWith('.discountPercent');

interface SettingsNumberFieldProps {
  /** Form address, e.g. `shippingMethods.express.baseRate`; also the input id. */
  field: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  issue?: SettingsIssue;
  helperText?: string;
  prefix?: string;
  suffix?: string;
  /** Whole numbers get the numeric keypad, others the decimal one. */
  integer?: boolean;
}

/**
 * A text input for one numeric setting. It accepts a comma or a dot as the
 * decimal separator, opens the right phone keypad, and states a rule violation
 * in the interface language instead of the API's English.
 *
 * @example
 * <SettingsNumberField field='taxRatePercent' label='Tax' suffix='%' value='18' onChange={set} />
 */
export const SettingsNumberField: React.FC<SettingsNumberFieldProps> = ({
  field,
  label,
  value,
  onChange,
  issue,
  helperText,
  prefix,
  suffix,
  integer = false,
}) => {
  const t = useT();

  const scale = isPercentField(field) ? 100 : 1;
  const params = Object.fromEntries(
    Object.entries(issue?.params ?? {}).map(([name, raw]) => [
      name,
      String(Math.round(raw * scale * 100) / 100),
    ])
  );
  const errorText = issue
    ? t(`adminSettings.errors.${issue.code}` as TranslationKey, params)
    : undefined;

  return (
    <TextField
      id={`settings-${field.replace(/\./g, '-')}`}
      label={label}
      value={value}
      onChange={event => onChange(event.target.value)}
      error={Boolean(issue)}
      helperText={errorText ?? helperText}
      fullWidth
      size='small'
      slotProps={{
        htmlInput: { inputMode: integer ? 'numeric' : 'decimal', autoComplete: 'off' },
        input: {
          ...(prefix
            ? { startAdornment: <InputAdornment position='start'>{prefix}</InputAdornment> }
            : {}),
          ...(suffix
            ? { endAdornment: <InputAdornment position='end'>{suffix}</InputAdornment> }
            : {}),
        },
      }}
    />
  );
};
