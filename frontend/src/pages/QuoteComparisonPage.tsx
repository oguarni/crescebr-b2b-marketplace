import React, { useState, useEffect } from 'react';
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
  Paper,
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
  LocalShipping,
  Business,
  Star,
  ExpandMore,
  ExpandLess,
  ShoppingCart,
  Savings,
} from '@mui/icons-material';
import { quotationsService } from '../services/quotationsService';
import { productsService } from '../services/productsService';
import { Product } from '@shared/types';
import toast from 'react-hot-toast';

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
    appliedTier: any;
  } | null;
  error?: string;
}

const QuoteComparisonPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [buyerLocation, setBuyerLocation] = useState<string>('');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'economy'>(
    'standard'
  );
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedQuote, setExpandedQuote] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productsService.getAllProducts({ limit: 100 });
      setProducts(response.products);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoadingProducts(false);
    }
  };

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
      toast.error(`Quantidade mínima é ${selectedProduct.minimumOrderQuantity} unidades`);
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
        toast.info('Nenhum fornecedor encontrado para este produto');
      } else {
        toast.success(`${response.quotes.length} cotações encontradas`);
      }
    } catch (error) {
      toast.error('Erro ao buscar cotações');
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

  const getShippingMethodLabel = (method: string) => {
    switch (method) {
      case 'standard':
        return 'Padrão (5 dias)';
      case 'express':
        return 'Expressa (2 dias)';
      case 'economy':
        return 'Econômica (10 dias)';
      default:
        return method;
    }
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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
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
          Comparar Cotações de Fornecedores
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          Compare preços, prazos e condições de diferentes fornecedores para o mesmo produto
        </Typography>
      </Box>

      {/* Search Form */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
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

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label='Quantidade'
                type='number'
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{
                  min: selectedProduct?.minimumOrderQuantity || 1,
                  step: 1,
                }}
              />
              {selectedProduct?.minimumOrderQuantity && (
                <Typography variant='caption' color='text.secondary'>
                  Mín: {selectedProduct.minimumOrderQuantity} unidades
                </Typography>
              )}
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label='Sua Localização'
                value={buyerLocation}
                onChange={e => setBuyerLocation(e.target.value)}
                placeholder='Ex: Curitiba'
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Entrega</InputLabel>
                <Select
                  value={shippingMethod}
                  label='Entrega'
                  onChange={e => setShippingMethod(e.target.value as any)}
                >
                  <MenuItem value='economy'>Econômica</MenuItem>
                  <MenuItem value='standard'>Padrão</MenuItem>
                  <MenuItem value='express'>Expressa</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
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
                  Preço base
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
                Resumo da Comparação
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='primary'>
                      {quotes.filter(q => q.quote !== null).length}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Cotações válidas
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='success.main'>
                      {bestQuote ? formatPrice(bestQuote.quote!.total) : 'N/A'}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Melhor preço
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='info.main'>
                      {bestQuote ? formatPrice(bestQuote.quote!.savings) : 'N/A'}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Maior economia
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='warning.main'>
                      {getShippingMethodLabel(shippingMethod)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Método de entrega
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
                Cotações dos Fornecedores
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fornecedor</TableCell>
                      <TableCell align='center'>Avaliação</TableCell>
                      <TableCell align='right'>Preço Unit.</TableCell>
                      <TableCell align='right'>Desconto</TableCell>
                      <TableCell align='right'>Subtotal</TableCell>
                      <TableCell align='right'>Frete</TableCell>
                      <TableCell align='right'>Total</TableCell>
                      <TableCell align='center'>Ações</TableCell>
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
                                      label='Melhor Oferta'
                                      size='small'
                                      color='success'
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {supplierQuote.supplier.industrySector}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell align='center'>
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
                                Sem avaliações
                              </Typography>
                            )}
                          </TableCell>

                          {supplierQuote.quote ? (
                            <>
                              <TableCell align='right'>
                                {formatPrice(supplierQuote.quote.unitPriceAfterDiscount)}
                              </TableCell>
                              <TableCell align='right'>
                                <Chip
                                  label={formatPercentage(supplierQuote.quote.tierDiscount)}
                                  size='small'
                                  color={
                                    supplierQuote.quote.tierDiscount > 0 ? 'success' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell align='right'>
                                {formatPrice(supplierQuote.quote.subtotal)}
                              </TableCell>
                              <TableCell align='right'>
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
                              <TableCell align='center' colSpan={5}>
                                <Alert severity='error' sx={{ width: 'fit-content', mx: 'auto' }}>
                                  {supplierQuote.error || 'Erro ao calcular cotação'}
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
                          <TableCell colSpan={8} sx={{ p: 0 }}>
                            <Collapse in={expandedQuote === index} timeout='auto' unmountOnExit>
                              {supplierQuote.quote && (
                                <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6} md={3}>
                                      <Typography variant='caption' color='text.secondary'>
                                        Preço Base
                                      </Typography>
                                      <Typography variant='body2' fontWeight='medium'>
                                        {formatPrice(supplierQuote.quote.basePrice)}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
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
                                    <Grid item xs={12} sm={6} md={3}>
                                      <Typography variant='caption' color='text.secondary'>
                                        Impostos
                                      </Typography>
                                      <Typography variant='body2' fontWeight='medium'>
                                        {formatPrice(supplierQuote.quote.tax)}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
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
                                      Solicitar Cotação
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
              Nenhuma cotação encontrada
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Selecione um produto e clique em "Comparar" para ver as cotações dos fornecedores
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default QuoteComparisonPage;
