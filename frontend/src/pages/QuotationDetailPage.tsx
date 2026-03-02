import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Storefront,
  InfoOutlined,
  MoreVert,
  LocalShipping,
  Inventory2,
  ArrowForward,
  LocationOn,
  Check,
} from '@mui/icons-material';
import { Quotation } from '@shared/types';
import { quotationsService } from '../services/quotationsService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const QuotationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchQuotation = async () => {
      if (!id) return;

      try {
        const data = await quotationsService.getQuotationById(parseInt(id));
        setQuotation(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar cotação';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const calculateTotalReferenceValue = () => {
    if (!quotation) return 0;
    return quotation.items.reduce((total, item) => 
      total + (item.product.price * item.quantity), 0
    );
  };

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !quotation) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
        <Alert severity="error" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
          {error || 'Cotação não encontrada.'}
        </Alert>
        <Button
          variant="contained"
          component={Link}
          to="/"
          startIcon={<ArrowBack />}
        >
          Voltar para Início
        </Button>
      </Box>
    );
  }

  const baseTotal = calculateTotalReferenceValue();
  const taxAmount = baseTotal * 0.15;
  const freight = 850;
  const packaging = 120;
  const grandTotal = baseTotal + taxAmount + freight + packaging;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 30, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Box sx={{ px: 2, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              component={Link}
              to={isAdmin ? '/admin/quotations' : '/my-quotations'}
              edge="start"
              sx={{ '&:hover': { bgcolor: 'action.hover' } }}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" noWrap sx={{ fontWeight: 500, color: 'text.primary', fontSize: '1.125rem' }}>
              Quotation #QT-{quotation.id}
            </Typography>
          </Box>
          <Button color="primary" sx={{ fontWeight: 500, textTransform: 'none', fontSize: '0.875rem' }}>
            Save Draft
          </Button>
        </Box>

        {/* Progress Stepper */}
        <Box sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, opacity: 0.6 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'success.light', color: 'success.dark', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check fontSize="small" />
              </Box>
              <Typography variant="caption">Select Items</Typography>
            </Box>

            <Box sx={{ flex: 1, height: 1, bgcolor: 'divider', mx: 2, mt: -2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, color: 'primary.main' }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 2 }}>
                2
              </Box>
              <Typography variant="caption">Review Pricing</Typography>
            </Box>

            <Box sx={{ flex: 1, height: 1, bgcolor: 'divider', mx: 2, mt: -2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, opacity: 0.6 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                3
              </Box>
              <Typography variant="caption">Confirm</Typography>
            </Box>

          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flex: 1, overflowY: 'auto', pb: 24, pt: 2, px: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Company Info */}
        <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
          <CardContent sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'primary.50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', flexShrink: 0 }}>
              <Storefront />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {quotation.company?.name || 'Empresa Desconhecida'}
                </Typography>
                <Chip
                  label="Verified"
                  size="small"
                  sx={{ height: 20, fontSize: '0.625rem', bgcolor: '#d1fae5', color: '#065f46', fontWeight: 500, borderRadius: 1 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                CNPJ: {quotation.company?.cnpj || 'N/A'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <LocationOn sx={{ fontSize: 14 }} />
                <Typography variant="caption">{quotation.company?.address || 'N/A'}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Alert
          icon={<InfoOutlined fontSize="inherit" />}
          severity="info"
          sx={{
            borderRadius: 1,
            bgcolor: 'primary.50',
            color: 'primary.dark',
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            '& .MuiAlert-icon': { color: 'primary.main' },
            '& .MuiAlert-message': { fontSize: '0.875rem' }
          }}
        >
          Tier discounts applied automatically based on total volume. Taxes calculated for ICMS-ST.
        </Alert>

        {/* Items List */}
        {quotation.items.map((item, index) => {
          const basePrice = item.product.price;
          const qty = item.quantity;
          const volDiscount = basePrice * qty * 0.05;
          const tax = basePrice * qty * 0.15;
          const subtotal = (basePrice * qty) - volDiscount + tax;

          return (
            <Card key={index} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
              <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 32, height: 32, bgcolor: 'grey.200', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'text.secondary' }}>
                    #{index + 1}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ lineHeight: 1.2, fontWeight: 500, color: 'text.primary' }}>
                      {item.product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      SKU: {item.product.id || `SKU-${index+100}`}
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <MoreVert fontSize="small" />
                </IconButton>
              </Box>

              <Table size="small">
                <TableBody sx={{ '& .MuiTableCell-root': { py: 1, px: 2, fontSize: '0.75rem', borderBottom: '1px solid', borderColor: 'divider' } }}>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>Base Price</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{formatPrice(basePrice)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{qty} un</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#ecfdf5' }}>
                    <TableCell sx={{ color: '#059669', fontWeight: 500 }}>Vol. Discount (5%)</TableCell>
                    <TableCell align="right" sx={{ color: '#059669', fontFamily: 'monospace' }}>
                      - {formatPrice(volDiscount)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>Tax (IPI + ICMS)</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                      {formatPrice(tax)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'grey.50', '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                    <TableCell sx={{ fontWeight: 500, color: 'text.primary' }}>Subtotal</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'text.primary' }}>
                      {formatPrice(subtotal)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          );
        })}

        {/* Logistics & Fees */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1, mb: 1, display: 'block', px: 0.5 }}>
            Logistics & Fees
          </Typography>
          <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalShipping sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="body2" color="text.primary">Freight (FOB)</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{formatPrice(freight)}</Typography>
              </Box>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory2 sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="body2" color="text.primary">Packaging</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{formatPrice(packaging)}</Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Admin Notes */}
        {quotation.adminNotes && (
          <Box sx={{ mt: 2 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'grey.50' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Observações do Administrador
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {quotation.adminNotes}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

      </Box>

      {/* Fixed Bottom Action Bar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          zIndex: 40,
          pb: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.1)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5 }}>
          <Box sx={{ width: 40, height: 4, bgcolor: 'grey.300', borderRadius: 2 }} />
        </Box>
        <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Total Items ({quotation.items.reduce((acc, item) => acc + item.quantity, 0)})
              </Typography>
              <Typography variant="caption" color="text.secondary">Total Taxes</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5, color: 'text.primary' }}>Grand Total</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {formatPrice(baseTotal)}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {formatPrice(taxAmount)}
              </Typography>
              <Typography variant="h6" color="primary" sx={{ fontFamily: 'monospace', fontWeight: 'bold', lineHeight: 1.2 }}>
                {formatPrice(grandTotal)}
              </Typography>
            </Box>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={isAdmin ? 4 : 12}>
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 500,
                  color: 'text.primary',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'grey.50', borderColor: 'divider' }
                }}
              >
                Export PDF
              </Button>
            </Grid>
            {isAdmin && (
              <Grid item xs={8}>
                <Button
                  fullWidth
                  variant="contained"
                  component={Link}
                  to={`/admin/quotations`}
                  endIcon={<ArrowForward />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 500,
                    textTransform: 'none',
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  Edit Quotation
                </Button>
              </Grid>
            )}
          </Grid>
        </Box>
      </Box>

    </Box>
  );
};

export default QuotationDetailPage;
