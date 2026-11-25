import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  TextField,
  Divider,
  Avatar,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import { Remove, Add, Delete, Send, ArrowBack, Info, TrendingDown } from '@mui/icons-material';
import { useQuotationRequest } from '../contexts/QuotationContext';
import { useAuth } from '../contexts/AuthContext';
import { quotationsService } from '../services/quotationsService';
import { getOrderStep } from '../utils/orderQuantity';
import { categoryLabel } from '../utils/catalogLabels';
import toast from 'react-hot-toast';
import { useLanguage, useT } from '../contexts/LanguageContext';
import { formatBRL, formatPercent } from '../utils/currency';
import { browserLogger } from '../utils/browserLogger';

interface QuoteCalculation {
  productId: number;
  basePrice: number;
  quantity: number;
  tierDiscount: number;
  unitPriceAfterDiscount: number;
  subtotal: number;
  savings: number;
  appliedTier: {
    minQuantity: number;
    maxQuantity: number | null;
    discount: number;
  } | null;
}

interface QuoteComparisonResult {
  items: QuoteCalculation[];
  totalSubtotal: number;
  totalShipping: number;
  totalTax: number;
  /** The rate the API priced the tax with, from the admin-editable settings. */
  taxRate: number;
  totalSavings: number;
  grandTotal: number;
}

const QuotationRequestPage: React.FC = () => {
  const t = useT();
  const { language } = useLanguage();
  const { items, totalItems, updateQuantity, removeItem, clearRequest } = useQuotationRequest();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceCalculations, setPriceCalculations] = useState<QuoteComparisonResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateRealTimePricing = useCallback(async () => {
    if (items.length === 0) {
      setPriceCalculations(null);
      return;
    }

    setIsCalculating(true);
    try {
      const calculationItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const response = await quotationsService.calculateQuote(calculationItems);
      setPriceCalculations(response.calculations);
    } catch (error) {
      browserLogger.error('Failed to calculate pricing', { error });
    } finally {
      setIsCalculating(false);
    }
  }, [items]);

  useEffect(() => {
    calculateRealTimePricing();
  }, [calculateRealTimePricing]);

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const getItemCalculation = (productId: number): QuoteCalculation | null => {
    return priceCalculations?.items.find(calc => calc.productId === productId) || null;
  };

  const handleSubmitQuotationRequest = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/quotation-request' } } });
      return;
    }

    if (user?.role !== 'customer') {
      toast.error(t('quotationRequest.toast.customersOnly'));
      return;
    }

    if (items.length === 0) {
      toast.error(t('quotationRequest.toast.addAtLeastOne'));
      return;
    }

    setIsSubmitting(true);
    try {
      const quotationData = {
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      await quotationsService.createQuotation(quotationData);
      toast.success(t('quotationRequest.toast.success'));
      clearRequest();
      navigate('/my-quotations');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('quotationRequest.toast.error');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Container maxWidth='md'>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant='h4' gutterBottom>
            {t('quotationRequest.emptyTitle')}
          </Typography>
          <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
            {t('quotationRequest.emptySubtitle')}
          </Typography>
          <Button variant='contained' component={Link} to='/' startIcon={<ArrowBack />}>
            Navegar Produtos
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='lg'>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' gutterBottom>
          {t('quotationRequest.title')}
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          {totalItems === 1
            ? t('quotationRequest.itemCountOne', { count: totalItems })
            : t('quotationRequest.itemCountOther', { count: totalItems })}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Quotation Items */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant='h6'>{t('quotationRequest.itemsTitle')}</Typography>
                {priceCalculations && priceCalculations.totalSavings > 0 && (
                  <Tooltip title='Economia total com descontos por volume'>
                    <Chip
                      icon={<TrendingDown />}
                      label={`Economia: ${new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(priceCalculations.totalSavings)}`}
                      color='success'
                      variant='outlined'
                    />
                  </Tooltip>
                )}
              </Box>
              {items.map((item, index) => {
                // Step the quantity in whole multiples of the product's MOQ.
                const step = getOrderStep(item.product);
                return (
                  <React.Fragment key={item.id}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        py: 2,
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: { xs: 1.5, sm: 0 },
                      }}
                    >
                      <Avatar
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        variant='rounded'
                        sx={{
                          width: { xs: 64, sm: 80 },
                          height: { xs: 64, sm: 80 },
                          mr: { sm: 2 },
                        }}
                        imgProps={{
                          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00MCAyNEw1NiA0MEg0OFY1NkgzMlY0MEgyNEw0MCAyNFoiIGZpbGw9IiM5MDkwOTAiLz4KPHN2Zz4K';
                          },
                        }}
                      />

                      <Box sx={{ flex: { xs: '1 1 0', sm: '1 1 auto' }, minWidth: 0 }}>
                        <Typography
                          variant='h6'
                          gutterBottom
                          sx={{
                            fontSize: { xs: '1rem', sm: '1.125rem' },
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {item.product.name}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' gutterBottom>
                          {item.product.description.length > 100
                            ? `${item.product.description.substring(0, 100)}...`
                            : item.product.description}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {t('common.categoryValue', {
                            category: categoryLabel(t, item.product.category),
                          })}
                        </Typography>
                        {(() => {
                          const calculation = getItemCalculation(item.productId);
                          return (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant='body2' color='text.secondary'>
                                {t('quotationRequest.basePrice')}{' '}
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(item.product.price)}
                              </Typography>
                              {calculation && (
                                <>
                                  {calculation.tierDiscount > 0 && (
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mt: 0.5,
                                      }}
                                    >
                                      <Chip
                                        icon={<TrendingDown />}
                                        label={`${(calculation.tierDiscount * 100).toFixed(1)}% OFF`}
                                        color='success'
                                        size='small'
                                      />
                                      <Typography variant='caption' color='text.secondary'>
                                        Desconto por volume
                                      </Typography>
                                    </Box>
                                  )}
                                  <Typography
                                    variant='body2'
                                    color='primary'
                                    sx={{ fontWeight: 'bold', mt: 0.5 }}
                                  >
                                    {t('quotationRequest.unitPrice')}{' '}
                                    {new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    }).format(calculation.unitPriceAfterDiscount)}
                                  </Typography>
                                  <Typography
                                    variant='body2'
                                    color='success.main'
                                    sx={{ fontWeight: 'medium' }}
                                  >
                                    {t('quotationRequest.subtotalLabel')}{' '}
                                    {new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    }).format(calculation.subtotal)}
                                  </Typography>
                                  {calculation.savings > 0 && (
                                    <Typography variant='caption' color='success.main'>
                                      {t('quotationRequest.savingsLabel')}{' '}
                                      {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                      }).format(calculation.savings)}
                                    </Typography>
                                  )}
                                </>
                              )}
                              {isCalculating && (
                                <Box
                                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
                                >
                                  <CircularProgress size={16} />
                                  <Typography variant='caption'>
                                    {t('quotationRequest.calculating')}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          );
                        })()}
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'row', sm: 'column' },
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: { xs: 'space-between', sm: 'center' },
                          width: { xs: '100%', sm: 'auto' },
                          columnGap: 1,
                          ml: { sm: 2 },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: { sm: 1 } }}>
                          <IconButton
                            size='small'
                            onClick={() => handleQuantityChange(item.id, item.quantity - step)}
                            aria-label={t('quotationRequest.decreaseAria', {
                              product: item.product.name,
                            })}
                          >
                            <Remove />
                          </IconButton>
                          <TextField
                            size='small'
                            value={item.quantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const qty = parseInt(e.target.value) || 0;
                              handleQuantityChange(item.id, qty);
                            }}
                            sx={{ width: 72, mx: 1 }}
                            inputProps={{
                              min: step,
                              step,
                              inputMode: 'numeric',
                              'aria-label': t('quotationRequest.quantityAria', {
                                product: item.product.name,
                              }),
                              style: { textAlign: 'center' },
                            }}
                          />
                          <IconButton
                            size='small'
                            onClick={() => handleQuantityChange(item.id, item.quantity + step)}
                            aria-label={t('quotationRequest.increaseAria', {
                              product: item.product.name,
                            })}
                          >
                            <Add />
                          </IconButton>
                        </Box>

                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{
                            mb: { sm: step > 1 ? 0.5 : 2 },
                            order: { xs: 3, sm: 0 },
                            flexBasis: { xs: '100%', sm: 'auto' },
                          }}
                        >
                          {item.quantity === 1
                            ? t('quotationRequest.unitsOne')
                            : t('quotationRequest.unitsOther', { count: item.quantity })}
                        </Typography>
                        {step > 1 && (
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{
                              mb: { sm: 2 },
                              order: { xs: 4, sm: 0 },
                              flexBasis: { xs: '100%', sm: 'auto' },
                            }}
                          >
                            {t('quotationRequest.minimumOrder', { step })}
                          </Typography>
                        )}

                        <IconButton
                          color='error'
                          onClick={() => removeItem(item.id)}
                          aria-label={t('quotationRequest.removeAria', {
                            product: item.product.name,
                          })}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                    {index < items.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </CardContent>
          </Card>

          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button variant='outlined' component={Link} to='/' startIcon={<ArrowBack />}>
              {t('quotationRequest.continueBrowsing')}
            </Button>
            <Button variant='outlined' color='error' onClick={clearRequest} startIcon={<Delete />}>
              {t('quotationRequest.clearRequest')}
            </Button>
          </Box>
        </Grid>

        {/* Quotation Summary */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                {t('quotationRequest.summaryTitle')}
              </Typography>

              {priceCalculations && (
                <Box sx={{ py: 2 }}>
                  <TableContainer component={Paper} variant='outlined' sx={{ mb: 2 }}>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <Typography variant='caption'>
                              {t('quotationRequest.metrics')}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='caption'>
                              {t('quotationRequest.values')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>{t('quotationRequest.totalItems')}</TableCell>
                          <TableCell align='right'>
                            <strong>{totalItems}</strong>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>{t('quotationRequest.subtotal')}</TableCell>
                          <TableCell align='right'>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(priceCalculations.totalSubtotal)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>{t('quotationRequest.estimatedShipping')}</TableCell>
                          <TableCell align='right'>
                            {formatBRL(priceCalculations.totalShipping)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            {t('quotationRequest.estimatedTax', {
                              rate: formatPercent(priceCalculations.taxRate, language),
                            })}
                          </TableCell>
                          <TableCell align='right'>
                            {formatBRL(priceCalculations.totalTax)}
                          </TableCell>
                        </TableRow>
                        {priceCalculations.totalSavings > 0 && (
                          <TableRow>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <TrendingDown color='success' fontSize='small' />
                                {t('quotationRequest.totalSavings')}
                              </Box>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography color='success.main' fontWeight='bold'>
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(priceCalculations.totalSavings)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell>
                            <strong>{t('quotationRequest.estimatedTotal')}</strong>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='h6' color='primary.main'>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(priceCalculations.grandTotal)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Alert severity='info' icon={<Info />} sx={{ mb: 2 }}>
                    <Typography variant='body2'>
                      <strong>{t('quotationRequest.volumeDiscountTitle')}</strong>
                      <br />
                      {t('quotationRequest.volumeDiscountBody')}
                    </Typography>
                  </Alert>
                </Box>
              )}

              {!priceCalculations && items.length > 0 && (
                <Box sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Total de itens:</Typography>
                    <Typography fontWeight='medium'>{totalItems}</Typography>
                  </Box>
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    * {t('quotationRequest.calculatingVolume')}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {!isAuthenticated && (
                <Alert severity='info' sx={{ mb: 2 }}>
                  {t('quotationRequest.loginToSubmit')}
                </Alert>
              )}

              {isAuthenticated && user?.role !== 'customer' && (
                <Alert severity='warning' sx={{ mb: 2 }}>
                  {t('quotationRequest.customersOnly')}
                </Alert>
              )}

              <Button
                variant='contained'
                fullWidth
                size='large'
                startIcon={isSubmitting ? <CircularProgress size={20} color='inherit' /> : <Send />}
                onClick={handleSubmitQuotationRequest}
                disabled={isSubmitting || !isAuthenticated || user?.role !== 'customer'}
              >
                {isSubmitting ? t('quotationRequest.submitting') : t('quotationRequest.submit')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default QuotationRequestPage;
