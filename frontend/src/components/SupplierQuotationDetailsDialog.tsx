import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Business, Email, Phone } from '@mui/icons-material';
import { Quotation } from '@shared/types';
import { useT } from '../contexts/LanguageContext';
import { useDateFormat } from '../hooks/useDateFormat';
import { getStatusColor, translateStatus } from '../utils/quotationStatus';

interface SupplierQuotationDetailsDialogProps {
  open: boolean;
  quotation: Quotation | null;
  onClose: () => void;
}

/** Renders a product's specification map, or a placeholder when it has none. */
const SpecificationList: React.FC<{ specifications?: Record<string, unknown> }> = ({
  specifications,
}) => {
  const t = useT();
  const entries = Object.entries(specifications ?? {});

  if (entries.length === 0) {
    return (
      <Typography variant='caption' color='text.secondary'>
        {t('supplierQuotations.detailsDialog.noSpecs')}
      </Typography>
    );
  }

  return (
    <Box>
      {entries.map(([key, value]) => (
        <Typography key={key} variant='caption' display='block'>
          {key}: {String(value)}
        </Typography>
      ))}
    </Box>
  );
};

/**
 * Read-only dialog showing the buyer's contact details and the requested items.
 *
 * @example
 * <SupplierQuotationDetailsDialog
 *   open={detailsOpen}
 *   quotation={selectedQuotation}
 *   onClose={() => setDetailsOpen(false)}
 * />
 */
export const SupplierQuotationDetailsDialog: React.FC<SupplierQuotationDetailsDialogProps> = ({
  open,
  quotation,
  onClose,
}) => {
  const t = useT();
  const formatDate = useDateFormat();

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        {t('supplierQuotations.detailsDialog.title', { id: quotation?.id ?? '' })}
      </DialogTitle>
      <DialogContent>
        {quotation && (
          <Box>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='h6' gutterBottom>
                  {t('supplierQuotations.customerInfo')}
                </Typography>
                <Box display='flex' alignItems='center' mb={1}>
                  <Business sx={{ mr: 1 }} />
                  <Typography>{quotation.company?.companyName}</Typography>
                </Box>
                <Box display='flex' alignItems='center' mb={1}>
                  <Email sx={{ mr: 1 }} />
                  <Typography>{quotation.company?.email}</Typography>
                </Box>
                {quotation.company?.phone && (
                  <Box display='flex' alignItems='center' mb={1}>
                    <Phone sx={{ mr: 1 }} />
                    <Typography>{quotation.company.phone}</Typography>
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='h6' gutterBottom>
                  {t('supplierQuotations.detailsDialog.requestInfo')}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {t('supplierQuotations.detailsDialog.created', {
                    date: formatDate.dateTime(quotation.createdAt!),
                  })}
                </Typography>
                {/* component='div': a Chip renders a <div>, which is invalid inside Typography's default <p>. */}
                <Typography variant='body2' color='text.secondary' component='div'>
                  {t('supplierQuotations.detailsDialog.statusLabel')}
                  <Chip
                    label={translateStatus(t, quotation.status)}
                    color={getStatusColor(quotation.status)}
                    size='small'
                  />
                </Typography>
                {quotation.requestedDeliveryDate && (
                  <Typography variant='body2' color='text.secondary'>
                    {t('supplierQuotations.requestedDelivery', {
                      date: formatDate.date(quotation.requestedDeliveryDate),
                    })}
                  </Typography>
                )}
                {quotation.adminNotes && (
                  <Typography variant='body2' color='text.secondary'>
                    {t('supplierQuotations.detailsDialog.notes', { notes: quotation.adminNotes })}
                  </Typography>
                )}
              </Grid>
            </Grid>

            <Typography variant='h6' gutterBottom>
              {t('supplierQuotations.detailsDialog.requestedItems')}
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('supplierQuotations.response.colProduct')}</TableCell>
                    <TableCell>{t('supplierQuotations.detailsDialog.colQuantity')}</TableCell>
                    <TableCell>{t('supplierQuotations.detailsDialog.colSpecs')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotation.items?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box>
                          <Typography variant='body2'>
                            {item.product?.name || t('supplierQuotations.productFallback')}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {item.product?.category}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <SpecificationList specifications={item.product?.specifications} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('supplierQuotations.detailsDialog.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};
