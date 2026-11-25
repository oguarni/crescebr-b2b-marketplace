import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Quotation } from '@shared/types';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';
import { useDateFormat } from '../hooks/useDateFormat';
import type { TranslationKey } from '../locales';
import { formatBRL } from '../utils/currency';
import { responseLines } from '../utils/quotationResponse';

interface SupplierQuotationResponseDialogProps {
  open: boolean;
  quotation: Quotation | null;
  notes: string;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

/**
 * The supplier's review of a quotation request: their own lines at catalogue
 * price, the validity the platform set, and notes for the buyer. Sending it
 * marks the quotation processed, so the buyer can turn it into an order.
 *
 * Full-screen on phones, where a multi-column table would not fit.
 *
 * @example
 * <SupplierQuotationResponseDialog open quotation={q} notes={notes}
 *   onNotesChange={setNotes} onClose={close} onSubmit={send} />
 */
export const SupplierQuotationResponseDialog: React.FC<SupplierQuotationResponseDialogProps> = ({
  open,
  quotation,
  notes,
  onNotesChange,
  onClose,
  onSubmit,
}) => {
  const t = useT();
  const { user } = useAuth();
  const formatDate = useDateFormat();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const lines = quotation && user ? responseLines(quotation, user.id) : [];
  // The quotation's status is shared, so a request that also lists another
  // supplier's products is released by an administrator, not by one supplier.
  const mixedSuppliers = Boolean(quotation && lines.length < (quotation.items?.length ?? 0));
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth fullScreen={fullScreen}>
      <DialogTitle>
        {t('supplierQuotations.response.title', { id: quotation?.id ?? '' })}
      </DialogTitle>
      <DialogContent dividers>
        {quotation && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant='subtitle1' component='h3' sx={{ fontWeight: 700 }}>
                {t('supplierQuotations.customerInfo')}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {t('supplierQuotations.response.company', {
                  name: quotation.company?.companyName ?? '',
                })}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
                {t('supplierQuotations.response.email', { email: quotation.company?.email ?? '' })}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {t('supplierQuotations.requestedDelivery', {
                  date: quotation.requestedDeliveryDate
                    ? formatDate.date(quotation.requestedDeliveryDate)
                    : t('supplierQuotations.response.notSpecified'),
                })}
              </Typography>
            </Box>

            <Box>
              <Typography variant='subtitle1' component='h3' sx={{ fontWeight: 700, mb: 1 }}>
                {t('supplierQuotations.response.yourItems')}
              </Typography>
              <Box component='ul' sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {lines.map((line, index) => (
                  <Box component='li' key={line.productId}>
                    {index > 0 && <Divider sx={{ my: 1.25 }} />}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 2,
                        alignItems: 'baseline',
                      }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}
                      >
                        {line.name}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
                      >
                        {formatBRL(line.lineTotal)}
                      </Typography>
                    </Box>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                      {t('supplierQuotations.response.lineDetail', {
                        quantity: line.quantity,
                        price: formatBRL(line.unitPrice),
                      })}
                      {line.leadTime !== undefined &&
                        ` • ${t('supplierQuotations.response.days', { count: line.leadTime })}`}
                      {line.availability &&
                        ` • ${t(`supplierQuotations.availability.${line.availability}` as TranslationKey)}`}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Divider sx={{ my: 1.25 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant='body2' sx={{ fontWeight: 700 }}>
                  {t('supplierQuotations.response.catalogTotal')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatBRL(total)}
                </Typography>
              </Box>
            </Box>

            {mixedSuppliers && (
              <Alert severity='warning'>{t('supplierQuotations.response.mixedSuppliers')}</Alert>
            )}

            <Alert severity='info'>
              {t('supplierQuotations.response.pricingNote')}
              {quotation.validUntil &&
                ` ${t('supplierQuotations.response.validUntilNote', {
                  date: formatDate.date(quotation.validUntil),
                })}`}
            </Alert>

            <TextField
              fullWidth
              multiline
              minRows={3}
              label={t('supplierQuotations.response.additionalNotes')}
              helperText={t('supplierQuotations.response.notesHelp')}
              value={notes}
              onChange={event => onNotesChange(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>{t('supplierQuotations.response.cancel')}</Button>
        <Button onClick={onSubmit} variant='contained' disabled={mixedSuppliers}>
          {t('supplierQuotations.response.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
