import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardActionArea, Skeleton, Typography } from '@mui/material';
import { LocalShipping, PendingActions, TrendingUp } from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import type { SupplierDashboardSummary } from '@shared/types';
import { useT } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../locales';
import { formatBRL } from '../../utils/currency';

interface SupplierMetricCardsProps {
  /** Null while the first load is in flight. */
  summary: SupplierDashboardSummary | null;
}

interface MetricTile {
  id: 'pending' | 'active' | 'volume';
  labelKey: TranslationKey;
  to: string;
  Icon: SvgIconComponent;
  iconColor: string;
  value: (summary: SupplierDashboardSummary) => string;
  caption: (summary: SupplierDashboardSummary, t: ReturnType<typeof useT>) => string;
}

const METRIC_TILES: readonly MetricTile[] = [
  {
    id: 'pending',
    labelKey: 'supplierDashboard.metrics.pending',
    to: '/supplier/quotations',
    Icon: PendingActions,
    iconColor: 'warning.main',
    value: summary => String(summary.pendingQuotations),
    caption: (_summary, t) => t('supplierDashboard.metrics.pendingSub'),
  },
  {
    id: 'active',
    labelKey: 'supplierDashboard.metrics.active',
    to: '/supplier/orders',
    Icon: LocalShipping,
    iconColor: 'info.main',
    value: summary => String(summary.activeOrders),
    caption: (_summary, t) => t('supplierDashboard.metrics.activeSub'),
  },
  {
    id: 'volume',
    labelKey: 'supplierDashboard.metrics.volume',
    to: '/supplier/orders',
    Icon: TrendingUp,
    iconColor: 'success.main',
    value: summary => formatBRL(summary.orderVolume),
    caption: (summary, t) =>
      summary.billableOrders === 1
        ? t('supplierDashboard.metrics.volumeSubOne')
        : t('supplierDashboard.metrics.volumeSub', { count: summary.billableOrders }),
  },
];

/**
 * The three headline figures, each a link to the list behind it.
 *
 * Two columns on a phone with the money figure on its own full-width row, three
 * from `sm` up. Labels wrap instead of truncating, and the amount has the whole
 * card width, so "R$ 1.234.567,89" fits a 320px screen.
 *
 * @example
 * <SupplierMetricCards summary={summary} />
 */
export const SupplierMetricCards: React.FC<SupplierMetricCardsProps> = ({ summary }) => {
  const t = useT();

  return (
    <Box
      component='ul'
      aria-label={t('supplierDashboard.metrics.label')}
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: 1.5,
      }}
    >
      {METRIC_TILES.map(tile => (
        <Box
          component='li'
          key={tile.id}
          sx={tile.id === 'volume' ? { gridColumn: { xs: '1 / -1', sm: 'auto' } } : undefined}
        >
          <Card variant='outlined' sx={{ height: '100%', borderRadius: 2 }}>
            <CardActionArea
              component={RouterLink}
              to={tile.to}
              data-testid={`metric-${tile.id}`}
              sx={{
                height: '100%',
                minHeight: 104,
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 1,
                }}
              >
                <Typography
                  variant='body2'
                  component='span'
                  sx={{ fontWeight: 600, color: 'text.secondary', lineHeight: 1.3 }}
                >
                  {t(tile.labelKey)}
                </Typography>
                <tile.Icon
                  aria-hidden
                  sx={{ color: tile.iconColor, fontSize: 20, flexShrink: 0 }}
                />
              </Box>
              <Box>
                {summary ? (
                  <Typography
                    component='span'
                    sx={{
                      display: 'block',
                      fontSize: { xs: '1.5rem', sm: '1.375rem', md: '1.5rem' },
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: 'text.primary',
                      fontVariantNumeric: 'tabular-nums',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {tile.value(summary)}
                  </Typography>
                ) : (
                  <Skeleton variant='text' width='60%' sx={{ fontSize: '1.5rem' }} />
                )}
                <Typography
                  variant='caption'
                  component='span'
                  sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}
                >
                  {summary ? tile.caption(summary, t) : <Skeleton variant='text' width='80%' />}
                </Typography>
              </Box>
            </CardActionArea>
          </Card>
        </Box>
      ))}
    </Box>
  );
};
