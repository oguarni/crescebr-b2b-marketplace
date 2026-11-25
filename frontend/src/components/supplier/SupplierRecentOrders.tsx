import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, ButtonBase, Card, LinearProgress, Skeleton, Typography } from '@mui/material';
import {
  Inventory2Outlined,
  LocalShipping,
  PrecisionManufacturingOutlined,
  ReceiptLongOutlined,
} from '@mui/icons-material';
import type { Order } from '@shared/types';
import { useT } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../locales';
import { formatBRL } from '../../utils/currency';
import { formatOrderNumber } from '../../utils/orderNumber';
import { orderProgressStyle } from '../../utils/supplierDashboard';
import { SECTION_TITLE_SX } from './sectionStyles';

interface SupplierRecentOrdersProps {
  orders: Order[];
  dateLocale: string;
  loading: boolean;
}

const STATUS_ICONS: Record<string, typeof LocalShipping> = {
  delivered: LocalShipping,
  processing: PrecisionManufacturingOutlined,
};

/**
 * Orders still to be prepared, with a fulfilment bar. Each row links to the
 * orders screen, where the order can be advanced.
 *
 * @example
 * <SupplierRecentOrders orders={recentOrders} dateLocale='pt-BR' loading={false} />
 */
export const SupplierRecentOrders: React.FC<SupplierRecentOrdersProps> = ({
  orders,
  dateLocale,
  loading,
}) => {
  const t = useT();

  return (
    <Box
      component='section'
      aria-labelledby='recent-orders-title'
      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <Typography
        id='recent-orders-title'
        variant='subtitle2'
        component='h2'
        sx={{ ...SECTION_TITLE_SX, minHeight: 44, display: 'flex', alignItems: 'center' }}
      >
        {t('supplierDashboard.recentOrders')}
      </Typography>

      <Card variant='outlined' sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading && orders.length === 0 ? (
          <Box sx={{ p: 1.5 }}>
            <Skeleton variant='text' width='50%' />
            <Skeleton variant='text' width='30%' />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <ReceiptLongOutlined aria-hidden />
            <Typography variant='body2'>{t('supplierDashboard.emptyOrders')}</Typography>
          </Box>
        ) : (
          <Box
            component='ul'
            sx={{
              listStyle: 'none',
              m: 0,
              p: 0,
              '& > li:not(:last-child)': { borderBottom: 1, borderColor: 'divider' },
            }}
          >
            {orders.map(order => {
              const style = orderProgressStyle(order.status);
              const Icon = STATUS_ICONS[order.status] ?? Inventory2Outlined;
              const statusLabel = t(
                `supplierDashboard.orderStatus.${order.status}` as TranslationKey
              );

              return (
                <li key={order.id}>
                  <ButtonBase
                    component={RouterLink}
                    to='/supplier/orders'
                    sx={{
                      width: '100%',
                      minHeight: 64,
                      p: 1.5,
                      gap: 1.5,
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&.Mui-focusVisible': { bgcolor: 'action.focus' },
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: style.iconBg,
                        color: style.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          gap: 1,
                        }}
                      >
                        <Typography
                          variant='body2'
                          noWrap
                          sx={{ fontWeight: 600, color: 'text.primary' }}
                        >
                          {t('supplierDashboard.orderLabel', { id: formatOrderNumber(order.id) })}
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{
                            color: 'text.primary',
                            fontVariantNumeric: 'tabular-nums',
                            flexShrink: 0,
                          }}
                        >
                          {formatBRL(order.totalAmount)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                          mt: 0.75,
                        }}
                      >
                        <Box sx={{ width: 120, maxWidth: '50%' }}>
                          <LinearProgress
                            variant='determinate'
                            value={style.progress}
                            aria-label={statusLabel}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': { bgcolor: style.color },
                            }}
                          />
                          <Typography
                            variant='caption'
                            sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}
                          >
                            {statusLabel}
                          </Typography>
                        </Box>
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                          {new Date(order.createdAt || Date.now()).toLocaleDateString(dateLocale)}
                        </Typography>
                      </Box>
                    </Box>
                  </ButtonBase>
                </li>
              );
            })}
          </Box>
        )}
      </Card>
    </Box>
  );
};
