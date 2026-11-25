import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, ButtonBase, Card, Chip, Skeleton, Typography } from '@mui/material';
import { ChevronRight, InboxOutlined } from '@mui/icons-material';
import type { Quotation } from '@shared/types';
import { useT } from '../../contexts/LanguageContext';
import { formatBRL } from '../../utils/currency';
import {
  quoteDisplayStatus,
  quoteTotalValue,
  QUOTE_STATUS_CHIP_STYLES,
} from '../../utils/supplierDashboard';
import { SECTION_TITLE_SX } from './sectionStyles';

interface SupplierQuoteQueueProps {
  quotes: Quotation[];
  supplierId: number;
  dateLocale: string;
  loading: boolean;
}

const ROW_SX = {
  width: '100%',
  minHeight: 64,
  p: 1.5,
  gap: 1,
  justifyContent: 'space-between',
  textAlign: 'left',
  '&:hover': { bgcolor: 'action.hover' },
  '&.Mui-focusVisible': { bgcolor: 'action.focus' },
} as const;

/**
 * Preview of the quotations waiting on this supplier. Each row is one link to
 * the quotation, so the whole row is the tap target and a keyboard reaches it.
 *
 * @example
 * <SupplierQuoteQueue quotes={pendingQuotes} supplierId={user.id} dateLocale='pt-BR' loading={false} />
 */
export const SupplierQuoteQueue: React.FC<SupplierQuoteQueueProps> = ({
  quotes,
  supplierId,
  dateLocale,
  loading,
}) => {
  const t = useT();

  return (
    <Box
      component='section'
      aria-labelledby='quote-queue-title'
      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography id='quote-queue-title' variant='subtitle2' component='h2' sx={SECTION_TITLE_SX}>
          {t('supplierDashboard.quotationQueue')}
        </Typography>
        <Button
          component={RouterLink}
          to='/supplier/quotations'
          size='small'
          sx={{ minHeight: 44, fontWeight: 600 }}
        >
          {t('supplierDashboard.viewAll')}
        </Button>
      </Box>

      <Card variant='outlined' sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading && quotes.length === 0 ? (
          <Box sx={{ p: 1.5 }}>
            <Skeleton variant='text' width='40%' />
            <Skeleton variant='text' width='70%' />
          </Box>
        ) : quotes.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <InboxOutlined aria-hidden />
            <Typography variant='body2'>{t('supplierDashboard.emptyQueue')}</Typography>
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
            {quotes.map(quote => {
              const status = quoteDisplayStatus(quote.status);
              const chip = QUOTE_STATUS_CHIP_STYLES[status];
              const buyer = quote.company?.companyName || t('supplierDashboard.fallbackBuyer');
              const itemCount = quote.items.length;

              return (
                <li key={quote.id}>
                  <ButtonBase
                    component={RouterLink}
                    to={`/supplier/quotations/${quote.id}`}
                    aria-label={t('supplierDashboard.quoteActionAria', { id: quote.id, buyer })}
                    sx={ROW_SX}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                        >
                          #QT-{quote.id}
                        </Typography>
                        <Chip
                          label={
                            status === 'Review'
                              ? t('supplierDashboard.statusReview')
                              : t('supplierDashboard.statusNew')
                          }
                          size='small'
                          sx={{
                            height: 20,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            bgcolor: chip.bgcolor,
                            color: chip.color,
                            border: 1,
                            borderColor: chip.borderColor,
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                      <Typography
                        variant='body2'
                        noWrap
                        sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}
                      >
                        {buyer}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary', display: 'block' }}
                      >
                        {itemCount === 1
                          ? t('supplierDashboard.itemsCountOne')
                          : t('supplierDashboard.itemsCount', { count: itemCount })}{' '}
                        • {new Date(quote.createdAt || Date.now()).toLocaleDateString(dateLocale)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatBRL(quoteTotalValue(quote, supplierId))}
                      </Typography>
                      <ChevronRight aria-hidden sx={{ color: 'text.secondary' }} />
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
