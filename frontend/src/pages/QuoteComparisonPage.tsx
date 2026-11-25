import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Rating,
  Divider,
  Avatar,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Compare,
  Search,
  Business,
  ExpandMore,
  ExpandLess,
  ShoppingCart,
} from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { quotationsService } from '../services/quotationsService';
import { Product } from '@shared/types';
import { useProducts } from '../hooks';
import toast from 'react-hot-toast';
import { useT } from '../contexts/LanguageContext';
import { usePricingPolicy } from '../hooks/usePricingPolicy';
import { sectorLabel } from '../utils/companyVerification';
import type { TranslationKey } from '../locales';

const SHIPPING_LABEL_KEYS: Record<'standard' | 'express' | 'economy', TranslationKey> = {
  standard: 'quoteComparison.shippingStandard',
  express: 'quoteComparison.shippingExpress',
  economy: 'quoteComparison.shippingEconomy',
};

interface SupplierQuote {
  supplier: {
    id: number;
    companyName: string;
    corporateName: string;
    averageRating?: number;
    totalRatings?: number;
    industrySector: string;
  };
  quote: {
    productId: number;
    basePrice: number;
    quantity: number;
    tierDiscount: number;
    unitPriceAfterDiscount: number;
    subtotal: number;
    shippingCost: number;
    tax: number;
    total: number;
    savings: number;
    appliedTier: Record<string, unknown> | null;
  } | null;
  error?: string;
}

const QuoteComparisonPage: React.FC = () => {
  const t = useT();
  const productFilters = useMemo(() => ({ limit: 100 }), []);
  const {
    products,
    loading: loadingProducts,
    error: productsError,
  } = useProducts({
    filters: productFilters,
  });

  useEffect(() => {
    if (productsError) toast.error('Erro ao carregar produtos');
  }, [productsError]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [buyerLocation, setBuyerLocation] = useState<string>('');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'economy'>(
    'standard'
  );
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedQuote, setExpandedQuote] = useState<number | null>(null);

  const handleCompareQuotes = async () => {
    if (!selectedProduct) {
      toast.error('Por favor, selecione um produto');
      return;
    }

    if (quantity < 1) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (selectedProduct.minimumOrderQuantity && quantity < selectedProduct.minimumOrderQuantity) {
      toast.error(
        t('quoteComparison.toast.minQuantity', {
          quantity: selectedProduct.minimumOrderQuantity,
        })
      );
      return;
    }

    setLoading(true);
    try {
      const response = await quotationsService.compareSupplierQuotes({
        productId: selectedProduct.id,
        quantity,
        buyerLocation: buyerLocation || undefined,
        shippingMethod,
      });

      setQuotes(response.quotes);

      if (response.quotes.length === 0) {
        toast('Nenhum fornecedor encontrado para este produto');
      } else {
        toast.success(t('quoteComparison.toast.found', { count: response.quotes.length }));
      }
    } catch (_error) {
      toast.error(t('quoteComparison.toast.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Delivery times come from the admin-editable settings, so the label always
  // states the time the quote was priced with.
  const policy = usePricingPolicy();

  const getShippingMethodLabel = (method: 'standard' | 'express' | 'economy') => {
    const name = t(SHIPPING_LABEL_KEYS[method]);
    const days = policy?.shippingMethods[method].deliveryDays;
    return days ? t('quoteComparison.shippingWithDays', { name, days }) : name;
  };

  const getBestQuote = () => {
    const validQuotes = quotes.filter(q => q.quote !== null);
    if (validQuotes.length === 0) return null;

    return validQuotes.reduce((best, current) =>
      current.quote!.total < best.quote!.total ? current : best
    );
  };

  const bestQuote = getBestQuote();

  if (loadingProducts) {
    return (
      <Container maxWidth='lg'>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <CircularProgress />
          <Typography sx={{ mt: 2 }} color='text.secondary'>
            Carregando produtos...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='lg'>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' gutterBottom>
          {t('quoteComparison.title')}
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          {t('quoteComparison.subtitle')}
        </Typography>
      </Box>

      {/* Search Form */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Produto</InputLabel>
                <Select
                  value={selectedProduct?.id || ''}
                  label='Produto'
                  onChange={e => {
                    const product = products.find(p => p.id === e.target.value);
                    setSelectedProduct(product || null);
                    if (product?.minimumOrderQuantity && quantity < product.minimumOrderQuantity) {
                      setQuantity(product.minimumOrderQuantity);
                    }
                  }}
                  disabled={loadingProducts}
                >
                  {products.map(product => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                label='Quantidade'
                type='number'
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                inputProps={{
                  min: selectedProduct?.minimumOrderQuantity || 1,
                  step: 1,
                }}
              />
              {selectedProduct?.minimumOrderQuantity && (
                <Typography variant='caption' color='text.secondary'>
                  {t('quoteComparison.minQuantity', {
                    quantity: selectedProduct.minimumOrderQuantity,
                  })}
                </Typography>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                label={t('quoteComparison.locationLabel')}
                value={buyerLocation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBuyerLocation(e.target.value)
                }
                placeholder='Ex: Curitiba'
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel id='comparison-shipping-label'>
                  {t('quoteComparison.shippingMethod')}
                </InputLabel>
                <Select
                  labelId='comparison-shipping-label'
                  value={shippingMethod}
                  label={t('quoteComparison.shippingMethod')}
                  onChange={(e: SelectChangeEvent<string>) => {
                    switch (e.target.value) {
                      case 'standard':
                      case 'express':
                      case 'economy':
                        setShippingMethod(e.target.value);
                        break;
                    }
                  }}
                >
                  <MenuItem value='economy'>{getShippingMethodLabel('economy')}</MenuItem>
                  <MenuItem value='standard'>{getShippingMethodLabel('standard')}</MenuItem>
                  <MenuItem value='express'>{getShippingMethodLabel('express')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant='contained'
                size='large'
                startIcon={<Compare />}
                onClick={handleCompareQuotes}
                disabled={loading || !selectedProduct}
                sx={{ height: '56px' }}
              >
                {loading ? <CircularProgress size={20} /> : 'Comparar'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Selected Product Info */}
      {selectedProduct && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                variant='rounded'
                sx={{ width: 80, height: 80 }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant='h6'>{selectedProduct.name}</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  {selectedProduct.description}
                </Typography>
                <Chip label={selectedProduct.category} size='small' />
                {selectedProduct.minimumOrderQuantity && (
                  <Chip
                    label={`MOQ: ${selectedProduct.minimumOrderQuantity}`}
                    size='small'
                    sx={{ ml: 1 }}
                    color='info'
                  />
                )}
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant='h6' color='primary'>
                  {formatPrice(selectedProduct.price)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {t('quoteComparison.basePrice')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Quote Results */}
      {quotes.length > 0 && (
        <>
          {/* Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                {t('quoteComparison.summaryTitle')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='primary'>
                      {quotes.filter(q => q.quote !== null).length}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('quoteComparison.validQuotes')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='success.main'>
                      {bestQuote ? formatPrice(bestQuote.quote!.total) : 'N/A'}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('quoteComparison.bestPrice')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='info.main'>
                      {bestQuote ? formatPrice(bestQuote.quote!.savings) : 'N/A'}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Maior economia
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='warning.main'>
                      {getShippingMethodLabel(shippingMethod)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('quoteComparison.shippingMethod')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Quotes Table */}
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                {t('quoteComparison.supplierQuotes')}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('quoteComparison.supplierColumn')}</TableCell>
                      <TableCell align='center' sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('quoteComparison.ratingColumn')}
                      </TableCell>
                      <TableCell align='right' sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('quoteComparison.unitPriceColumn')}
                      </TableCell>
                      <TableCell align='right' sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('quoteComparison.discountColumn')}
                      </TableCell>
                      <TableCell align='right' sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('quoteComparison.subtotalColumn')}
                      </TableCell>
                      <TableCell align='right' sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('quoteComparison.shippingColumn')}
                      </TableCell>
                      <TableCell align='right'>{t('quoteComparison.totalColumn')}</TableCell>
                      <TableCell align='center'>{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quotes.map((supplierQuote, index) => (
                      <React.Fragment key={index}>
                        <TableRow
                          hover
                          sx={{
                            backgroundColor:
                              supplierQuote === bestQuote ? 'success.50' : 'transparent',
                            '&:hover': {
                              backgroundColor:
                                supplierQuote === bestQuote ? 'success.100' : 'grey.50',
                            },
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Business />
                              <Box>
                                <Typography variant='subtitle2'>
                                  {supplierQuote.supplier.companyName}
                                  {supplierQuote === bestQuote && (
                                    <Chip
                                      label={t('quoteComparison.bestOffer')}
                                      size='small'
                                      color='success'
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {supplierQuote.supplier.industrySector
                                    ? sectorLabel(t, supplierQuote.supplier.industrySector)
                                    : ''}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell
                            align='center'
                            sx={{ display: { xs: 'none', md: 'table-cell' } }}
                          >
                            {supplierQuote.supplier.averageRating ? (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 0.5,
                                }}
                              >
                                <Rating
                                  value={supplierQuote.supplier.averageRating}
                                  readOnly
                                  size='small'
                                />
                                <Typography variant='caption' color='text.secondary'>
                                  ({supplierQuote.supplier.totalRatings})
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant='caption' color='text.secondary'>
                                {t('quoteComparison.noRatings')}
                              </Typography>
                            )}
                          </TableCell>

                          {supplierQuote.quote ? (
                            <>
                              <TableCell
                                align='right'
                                sx={{ display: { xs: 'none', md: 'table-cell' } }}
                              >
                                {formatPrice(supplierQuote.quote.unitPriceAfterDiscount)}
                              </TableCell>
                              <TableCell
                                align='right'
                                sx={{ display: { xs: 'none', md: 'table-cell' } }}
                              >
                                <Chip
                                  label={formatPercentage(supplierQuote.quote.tierDiscount)}
                                  size='small'
                                  color={
                                    supplierQuote.quote.tierDiscount > 0 ? 'success' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell
                                align='right'
                                sx={{ display: { xs: 'none', md: 'table-cell' } }}
                              >
                                {formatPrice(supplierQuote.quote.subtotal)}
                              </TableCell>
                              <TableCell
                                align='right'
                                sx={{ display: { xs: 'none', md: 'table-cell' } }}
                              >
                                {formatPrice(supplierQuote.quote.shippingCost)}
                              </TableCell>
                              <TableCell align='right'>
                                <Typography
                                  variant='subtitle1'
                                  fontWeight='bold'
                                  color={supplierQuote === bestQuote ? 'success.main' : 'inherit'}
                                >
                                  {formatPrice(supplierQuote.quote.total)}
                                </Typography>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell align='center' {...{ colSpan: 5 }}>
                                <Alert severity='error' sx={{ width: 'fit-content', mx: 'auto' }}>
                                  {supplierQuote.error || t('quoteComparison.quoteError')}
                                </Alert>
                              </TableCell>
                            </>
                          )}

                          <TableCell align='center'>
                            <IconButton
                              onClick={() =>
                                setExpandedQuote(expandedQuote === index ? null : index)
                              }
                              disabled={!supplierQuote.quote}
                            >
                              {expandedQuote === index ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Details */}
                        <TableRow>
                          <TableCell {...{ colSpan: 8 }} sx={{ p: 0 }}>
                            <Collapse in={expandedQuote === index} timeout='auto' unmountOnExit>
                              {supplierQuote.quote && (
                                <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
                                  <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                      <Typography variant='caption' color='text.secondary'>
                                        {t('quoteComparison.basePriceTitle')}
                                      </Typography>
                                      <Typography variant='body2' fontWeight='medium'>
                                        {formatPrice(supplierQuote.quote.basePrice)}
                                      </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                      <Typography variant='caption' color='text.secondary'>
                                        Economia Total
                                      </Typography>
                                      <Typography
                                        variant='body2'
                                        fontWeight='medium'
                                        color='success.main'
                                      >
                                        {formatPrice(supplierQuote.quote.savings)}
                                      </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                      <Typography variant='caption' color='text.secondary'>
                                        Impostos
                                      </Typography>
                                      <Typography variant='body2' fontWeight='medium'>
                                        {formatPrice(supplierQuote.quote.tax)}
                                      </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                      <Typography variant='caption' color='text.secondary'>
                                        Faixa de Desconto
                                      </Typography>
                                      <Typography variant='body2' fontWeight='medium'>
                                        {supplierQuote.quote.appliedTier
                                          ? `${supplierQuote.quote.appliedTier.minQuantity}${supplierQuote.quote.appliedTier.maxQuantity ? `-${supplierQuote.quote.appliedTier.maxQuantity}` : '+'} unidades`
                                          : 'Nenhuma faixa aplicada'}
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                  <Divider sx={{ my: 2 }} />
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                      variant='contained'
                                      startIcon={<ShoppingCart />}
                                      size='small'
                                    >
                                      {t('quoteComparison.requestQuote')}
                                    </Button>
                                    <Button
                                      variant='outlined'
                                      startIcon={<Business />}
                                      size='small'
                                    >
                                      Ver Fornecedor
                                    </Button>
                                  </Box>
                                </Box>
                              )}
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {quotes.length === 0 && !loading && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant='h6' color='text.secondary' gutterBottom>
              {t('quoteComparison.emptyTitle')}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {t('quoteComparison.emptySubtitle')}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default QuoteComparisonPage;
