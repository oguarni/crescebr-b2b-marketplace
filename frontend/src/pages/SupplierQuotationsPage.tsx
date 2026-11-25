import React, { useState } from 'react';
import { Alert, Box, CircularProgress, Container, Tab, Tabs, Typography } from '@mui/material';
import { Quotation } from '@shared/types';
import { useT } from '../contexts/LanguageContext';
import { useSupplierQuotations } from '../hooks/useSupplierQuotations';
import { QuotationCard } from '../components/QuotationCard';
import { SupplierQuotationStats } from '../components/SupplierQuotationStats';
import { SupplierQuotationFilters } from '../components/SupplierQuotationFilters';
import { SupplierQuotationResponseDialog } from '../components/SupplierQuotationResponseDialog';
import { SupplierQuotationDetailsDialog } from '../components/SupplierQuotationDetailsDialog';
import { TAB_KEYS } from '../utils/quotationStatus';
import {
  EMPTY_QUOTATION_FILTERS,
  groupQuotationsByStatus,
  matchesQuotationFilters,
  type QuotationFilters,
} from '../utils/quotationFilters';
import {
  buildResponseDraft,
  EMPTY_QUOTATION_RESPONSE,
  type QuotationResponseDraft,
} from '../utils/quotationResponse';

interface ResponseDialogState {
  open: boolean;
  quotation: Quotation | null;
  draft: QuotationResponseDraft;
}

const CLOSED_RESPONSE_DIALOG: ResponseDialogState = {
  open: false,
  quotation: null,
  draft: EMPTY_QUOTATION_RESPONSE,
};

/**
 * Supplier's quotation queue: filterable, grouped by status into tabs, with
 * dialogs for responding to a request and for inspecting one read-only.
 *
 * Deliberately thin — data access lives in `useSupplierQuotations`, filter and
 * pricing rules in `utils/quotation*`, and each UI block in its own component.
 */
const SupplierQuotationsPage: React.FC = () => {
  const t = useT();
  const { quotations, loading, acceptQuotation, rejectQuotation, submitResponse } =
    useSupplierQuotations();

  const [selectedTab, setSelectedTab] = useState(0);
  const [filters, setFilters] = useState<QuotationFilters>(EMPTY_QUOTATION_FILTERS);
  const [responseDialog, setResponseDialog] = useState<ResponseDialogState>(CLOSED_RESPONSE_DIALOG);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const filteredQuotations = quotations.filter(quotation =>
    matchesQuotationFilters(quotation, filters)
  );
  const quotationsByStatus = groupQuotationsByStatus(filteredQuotations);

  const handleFilterChange = <K extends keyof QuotationFilters>(
    field: K,
    value: QuotationFilters[K]
  ) => setFilters(previous => ({ ...previous, [field]: value }));

  const handleViewDetails = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDetailsDialogOpen(true);
  };

  const handleRespond = (quotation: Quotation) =>
    setResponseDialog({ open: true, quotation, draft: buildResponseDraft(quotation) });

  const handleNotesChange = (notes: string) =>
    setResponseDialog(previous => ({ ...previous, draft: { ...previous.draft, notes } }));

  const handleSubmitResponse = async () => {
    const submitted = await submitResponse(
      responseDialog.draft.quotationId,
      responseDialog.draft.notes
    );
    // Keep the dialog open on failure so the priced draft is not thrown away.
    if (submitted) setResponseDialog(CLOSED_RESPONSE_DIALOG);
  };

  if (loading) {
    return (
      <Container>
        <Box display='flex' justifyContent='center' mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const activeTab = TAB_KEYS[selectedTab] ?? 'all';
  const displayQuotations = quotationsByStatus[activeTab];

  return (
    <Container maxWidth='xl' sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Typography variant='h4' component='h1' gutterBottom>
          {t('supplierQuotations.title')}
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          {t('supplierQuotations.subtitle')}
        </Typography>
      </Box>

      <SupplierQuotationStats
        totalCount={quotations.length}
        pendingCount={quotationsByStatus.pending.length}
        completedCount={quotationsByStatus.completed.length}
      />

      <SupplierQuotationFilters filters={filters} onChange={handleFilterChange} />

      {/* Driven from TAB_KEYS so the tab order and the grouped buckets cannot drift apart. */}
      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 2 }}>
        {TAB_KEYS.map(key => (
          <Tab
            key={key}
            label={`${t(`supplierQuotations.tabs.${key}`)} (${quotationsByStatus[key].length})`}
          />
        ))}
      </Tabs>

      {displayQuotations.length === 0 ? (
        <Alert severity='info' sx={{ mt: 2 }}>
          {t(`supplierQuotations.empty.${activeTab}`)}
        </Alert>
      ) : (
        displayQuotations.map(quotation => (
          <QuotationCard
            key={quotation.id}
            quotation={quotation}
            onViewDetails={handleViewDetails}
            onRespond={handleRespond}
            onAccept={acceptQuotation}
            onReject={rejectQuotation}
          />
        ))
      )}

      <SupplierQuotationResponseDialog
        open={responseDialog.open}
        quotation={responseDialog.quotation}
        notes={responseDialog.draft.notes}
        onNotesChange={handleNotesChange}
        onClose={() => setResponseDialog(CLOSED_RESPONSE_DIALOG)}
        onSubmit={handleSubmitResponse}
      />

      <SupplierQuotationDetailsDialog
        open={detailsDialogOpen}
        quotation={selectedQuotation}
        onClose={() => setDetailsDialogOpen(false)}
      />
    </Container>
  );
};

export default SupplierQuotationsPage;
