import React from 'react';
import { Box, Button, Card, CardActions, CardContent, Chip, Typography } from '@mui/material';
import {
  Cancel,
  CheckCircle,
  Info,
  PlayArrow,
  Schedule,
  Send,
  Visibility,
} from '@mui/icons-material';
import { Quotation } from '@shared/types';
import { useT } from '../contexts/LanguageContext';
import { useDateFormat } from '../hooks/useDateFormat';
import { formatBRL } from '../utils/currency';
import {
  getPriorityColor,
  getPriorityKey,
  getStatusColor,
  translateStatus,
} from '../utils/quotationStatus';

// Lives here rather than in utils/quotationStatus.ts because it returns JSX and
// the card is its only consumer; keeping it out lets that module stay pure .ts.
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Schedule />;
    case 'processed':
      return <PlayArrow />;
    case 'completed':
      return <CheckCircle />;
    case 'rejected':
      return <Cancel />;
    default:
      return <Info />;
  }
};

const MAX_PREVIEW_ITEMS = 3;

interface QuotationCardProps {
  quotation: Quotation;
  onViewDetails: (quotation: Quotation) => void;
  onRespond: (quotation: Quotation) => void;
  onAccept: (quotationId: number) => void;
  onReject: (quotationId: number, reason: string) => void;
}

/**
 * Summary card for a single quotation request in the supplier queue.
 *
 * Declared at module scope on purpose: defining it inside SupplierQuotationsPage
 * gave React a new component type on every render, remounting each card and
 * discarding its DOM state (and focus) on any parent state change.
 *
 * @example
 * <QuotationCard
 *   quotation={quotation}
 *   onViewDetails={handleViewDetails}
 *   onRespond={handleRespond}
 *   onAccept={handleAcceptQuotation}
 *   onReject={handleRejectQuotation}
 * />
 */
export const QuotationCard: React.FC<QuotationCardProps> = ({
  quotation,
  onViewDetails,
  onRespond,
  onAccept,
  onReject,
}) => {
  const t = useT();
  const formatDate = useDateFormat();
  const itemCount = quotation.items?.length || 0;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='start' mb={2}>
          <Box>
            <Typography variant='h6'>
              {t('supplierQuotations.card.quoteRequest', { id: quotation.id })}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {quotation.company?.companyName}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {formatDate.date(quotation.createdAt!)}
            </Typography>
          </Box>
          <Box display='flex' gap={1} flexDirection='column' alignItems='flex-end'>
            <Chip
              label={translateStatus(t, quotation.status)}
              color={getStatusColor(quotation.status)}
              icon={getStatusIcon(quotation.status)}
            />
            {quotation.requestedDeliveryDate && (
              <Chip
                label={t(
                  `supplierQuotations.priority.${getPriorityKey(quotation.requestedDeliveryDate)}`
                )}
                color={getPriorityColor(quotation.requestedDeliveryDate)}
                size='small'
              />
            )}
          </Box>
        </Box>

        <Box mb={2}>
          <Typography variant='body2' color='text.secondary'>
            {t('supplierQuotations.card.items', { count: itemCount })}
          </Typography>
          {quotation.totalAmount && (
            <Typography variant='body2' color='text.secondary'>
              {t('supplierQuotations.card.estimatedValue', {
                value: formatBRL(quotation.totalAmount),
              })}
            </Typography>
          )}
          {quotation.requestedDeliveryDate && (
            <Typography variant='body2' color='text.secondary'>
              {t('supplierQuotations.requestedDelivery', {
                date: formatDate.date(quotation.requestedDeliveryDate),
              })}
            </Typography>
          )}
        </Box>

        <Box display='flex' alignItems='center' gap={1}>
          {quotation.items?.slice(0, MAX_PREVIEW_ITEMS).map((item, index) => (
            <Chip
              key={index}
              label={`${item.quantity}x ${item.product?.name || t('supplierQuotations.productFallback')}`}
              size='small'
              variant='outlined'
            />
          ))}
          {itemCount > MAX_PREVIEW_ITEMS && (
            <Chip
              label={t('supplierQuotations.card.moreItems', {
                count: itemCount - MAX_PREVIEW_ITEMS,
              })}
              size='small'
              variant='outlined'
            />
          )}
        </Box>
      </CardContent>

      <CardActions>
        <Button size='small' startIcon={<Visibility />} onClick={() => onViewDetails(quotation)}>
          {t('supplierQuotations.card.details')}
        </Button>
        {quotation.status === 'pending' && (
          <>
            <Button
              size='small'
              variant='contained'
              startIcon={<Send />}
              onClick={() => onRespond(quotation)}
            >
              {t('supplierQuotations.card.respond')}
            </Button>
            <Button
              size='small'
              variant='outlined'
              color='success'
              startIcon={<CheckCircle />}
              onClick={() => onAccept(quotation.id)}
            >
              {t('supplierQuotations.card.accept')}
            </Button>
            <Button
              size='small'
              variant='outlined'
              color='error'
              startIcon={<Cancel />}
              onClick={() => onReject(quotation.id, t('supplierQuotations.declineReason'))}
            >
              {t('supplierQuotations.card.decline')}
            </Button>
          </>
        )}
      </CardActions>
    </Card>
  );
};
