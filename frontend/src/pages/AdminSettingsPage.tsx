import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { RestartAlt } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useLanguage, useT } from '../contexts/LanguageContext';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { ErrorMessage } from '../components/ErrorMessage';
import { SettingsSection } from '../components/settings/SettingsSection';
import { SettingsNumberField } from '../components/settings/SettingsNumberField';
import { ShippingMethodsFields } from '../components/settings/ShippingMethodsFields';
import { PricingTiersFields } from '../components/settings/PricingTiersFields';
import { dateLocaleFor } from '../utils/supplierDashboard';

/**
 * Admin screen for the commercial parameters every quote is priced with: tax,
 * quotation validity, the freight table and the default volume discounts.
 *
 * State and the save cycle live in `useSystemSettings`; the rules come from
 * `utils/systemSettingsRules`, the same ones the API enforces.
 */
const AdminSettingsPage: React.FC = () => {
  const t = useT();
  const { language } = useLanguage();
  const {
    record,
    form,
    setForm,
    fieldErrors,
    dirty,
    loading,
    loadError,
    saving,
    conflict,
    reload,
    save,
    discardChanges,
    restoreDefaults,
  } = useSystemSettings();

  if (loading && !form) {
    return (
      <Container maxWidth='md'>
        <Box display='flex' justifyContent='center' alignItems='center' minHeight='50vh'>
          <CircularProgress aria-label={t('adminSettings.loading')} />
        </Box>
      </Container>
    );
  }

  if (!form || !record) {
    return (
      <Container maxWidth='md'>
        <ErrorMessage message={loadError ?? t('adminSettings.loadError')} onRetry={reload} />
      </Container>
    );
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;
  const editor = record.updatedBy?.companyName || record.updatedBy?.email;
  const lastUpdated =
    record.updatedAt && editor
      ? t('adminSettings.lastUpdated', {
          date: new Date(record.updatedAt).toLocaleString(dateLocaleFor(language), {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
          editor,
        })
      : t('adminSettings.neverUpdated');

  const handleRestoreDefaults = () => {
    restoreDefaults();
    toast(t('adminSettings.defaultsLoaded'));
  };

  return (
    <Container maxWidth='md'>
      <Box component='header' sx={{ mb: 3 }}>
        <Typography
          variant='h4'
          component='h1'
          sx={{ fontSize: { xs: '1.6rem', sm: '2.125rem' }, fontWeight: 700 }}
        >
          {t('adminSettings.title')}
        </Typography>
        <Typography color='text.secondary' sx={{ mt: 0.5 }}>
          {t('adminSettings.subtitle')}
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          {lastUpdated}
        </Typography>
      </Box>

      {conflict && (
        <Alert
          severity='warning'
          sx={{ mb: 2 }}
          action={
            <Button color='inherit' size='small' onClick={reload}>
              {t('adminSettings.actions.reload')}
            </Button>
          }
        >
          {t('adminSettings.conflict')}
        </Alert>
      )}

      <Box
        component='form'
        noValidate
        onSubmit={event => {
          event.preventDefault();
          save();
        }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <SettingsSection
          id='settings-general'
          title={t('adminSettings.sections.general')}
          hint={t('adminSettings.sections.generalHint')}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SettingsNumberField
                field='taxRatePercent'
                label={t('adminSettings.fields.taxRate')}
                helperText={t('adminSettings.fields.taxRateHelp')}
                suffix='%'
                value={form.taxRatePercent}
                issue={fieldErrors.taxRatePercent}
                onChange={value => setForm({ ...form, taxRatePercent: value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SettingsNumberField
                field='quotationValidityDays'
                label={t('adminSettings.fields.validity')}
                helperText={t('adminSettings.fields.validityHelp')}
                suffix={t('adminSettings.fields.days')}
                integer
                value={form.quotationValidityDays}
                issue={fieldErrors.quotationValidityDays}
                onChange={value => setForm({ ...form, quotationValidityDays: value })}
              />
            </Grid>
          </Grid>
        </SettingsSection>

        <SettingsSection
          id='settings-shipping'
          title={t('adminSettings.sections.shipping')}
          hint={t('adminSettings.sections.shippingHint')}
        >
          <ShippingMethodsFields
            value={form.shippingMethods}
            errors={fieldErrors}
            onChange={shippingMethods => setForm({ ...form, shippingMethods })}
          />
        </SettingsSection>

        <SettingsSection
          id='settings-tiers'
          title={t('adminSettings.sections.tiers')}
          hint={t('adminSettings.sections.tiersHint')}
        >
          <PricingTiersFields form={form} errors={fieldErrors} onChange={setForm} />
        </SettingsSection>

        {/* Sticky so the save action stays in reach on a long form on a phone. */}
        <Paper
          variant='outlined'
          sx={{
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
            p: 1.5,
            borderRadius: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            pb: 'calc(12px + env(safe-area-inset-bottom))',
          }}
        >
          <Typography
            variant='body2'
            role='status'
            color={hasErrors ? 'error' : 'text.secondary'}
            sx={{ flex: '1 1 100%', mb: { xs: 0.5, sm: 0 }, minWidth: 0 }}
          >
            {hasErrors
              ? t('adminSettings.invalidSummary')
              : dirty
                ? t('adminSettings.unsaved')
                : t('adminSettings.upToDate')}
          </Typography>
          <Button
            startIcon={<RestartAlt />}
            onClick={handleRestoreDefaults}
            disabled={saving}
            sx={{ minHeight: 44, mr: 'auto' }}
          >
            {t('adminSettings.actions.restoreDefaults')}
          </Button>
          <Button
            variant='outlined'
            onClick={discardChanges}
            disabled={!dirty || saving}
            sx={{ minHeight: 44 }}
          >
            {t('adminSettings.actions.discard')}
          </Button>
          <Button
            type='submit'
            variant='contained'
            disabled={!dirty || hasErrors || saving || conflict}
            sx={{ minHeight: 44 }}
          >
            {saving ? t('adminSettings.actions.saving') : t('adminSettings.actions.save')}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminSettingsPage;
