import React from 'react';
import { Alert, Box, Container, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, useT } from '../contexts/LanguageContext';
import { useSupplierDashboard } from '../hooks/useSupplierDashboard';
import { ErrorMessage } from '../components/ErrorMessage';
import { SupplierMetricCards } from '../components/supplier/SupplierMetricCards';
import { SupplierQuoteQueue } from '../components/supplier/SupplierQuoteQueue';
import { SupplierRecentOrders } from '../components/supplier/SupplierRecentOrders';
import { dateLocaleFor } from '../utils/supplierDashboard';

/**
 * The supplier's landing screen: headline figures, the quotations waiting on
 * them and the orders still to prepare.
 *
 * It sits under the app's single header like every other page; on phones the
 * role's bottom navigation (rendered by Layout) moves between the supplier
 * screens. Data loading lives in `useSupplierDashboard`.
 */
const SupplierDashboardPage: React.FC = () => {
  const t = useT();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { summary, pendingQuotes, recentOrders, loading, error, reload } = useSupplierDashboard();

  const dateLocale = dateLocaleFor(language);

  return (
    <Container maxWidth='md' sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box component='header'>
        <Typography
          variant='h4'
          component='h1'
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, fontWeight: 700 }}
        >
          {t('supplierDashboard.title')}
        </Typography>
        <Typography color='text.secondary' sx={{ mt: 0.5 }}>
          {user?.companyName || t('supplierDashboard.fallbackCompany')}
        </Typography>
      </Box>

      {user?.status && user.status !== 'approved' && (
        <Alert severity='info'>{t('access.supplierPending')}</Alert>
      )}

      {error && !summary ? (
        <ErrorMessage message={t('supplierDashboard.loadError')} onRetry={reload} />
      ) : (
        <>
          <SupplierMetricCards summary={summary} />
          <SupplierQuoteQueue
            quotes={pendingQuotes}
            supplierId={user?.id ?? 0}
            dateLocale={dateLocale}
            loading={loading}
          />
          <SupplierRecentOrders orders={recentOrders} dateLocale={dateLocale} loading={loading} />
        </>
      )}
    </Container>
  );
};

export default SupplierDashboardPage;
