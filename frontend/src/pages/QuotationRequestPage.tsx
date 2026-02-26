import React, { useState, useEffect } from 'react';
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
import toast from 'react-hot-toast';

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
  totalSavings: number;
  grandTotal: number;
}

const QuotationRequestPage: React.FC = () => {
  const { items, totalItems, updateQuantity, removeItem, clearRequest } = useQuotationRequest();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceCalculations, setPriceCalculations] = useState<QuoteComparisonResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateRealTimePricing = async () => {
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
      console.error('Failed to calculate pricing:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    calculateRealTimePricing();
  }, [items]);

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
      toast.error('Apenas clientes podem solicitar cotações');
      return;
    }

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à solicitação de cotação');
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
      toast.success('Solicitação de cotação enviada com sucesso!');
      clearRequest();
      navigate('/my-quotations');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao enviar solicitação de cotação';
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
            Sua solicitação de cotação está vazia
          </Typography>
          <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
            Adicione alguns produtos à sua solicitação de cotação para continuar
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
          Solicitação de Cotação
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          {totalItems} {totalItems === 1 ? 'item' : 'itens'} na sua solicitação
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Quotation Items */}
        <Grid item xs={12} lg={8}>
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
                <Typography variant='h6'>Itens da Cotação</Typography>
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
              {items.map((item, index) => (
                <React.Fragment key={item.id}>
                  <Box sx={{ display: 'flex', py: 2, alignItems: 'center' }}>
                    <Avatar
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      variant='rounded'
                      sx={{ width: 80, height: 80, mr: 2 }}
                      imgProps={{
                        onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                          e.currentTarget.src =
                            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00MCAyNEw1NiA0MEg0OFY1NkgzMlY0MEgyNEw0MCAyNFoiIGZpbGw9IiM5MDkwOTAiLz4KPHN2Zz4K';
                        },
                      }}
                    />

                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant='h6' gutterBottom>
                        {item.product.name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' gutterBottom>
                        {item.product.description.length > 100
                          ? `${item.product.description.substring(0, 100)}...`
                          : item.product.description}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Categoria: {item.product.category}
                      </Typography>
                      {(() => {
                        const calculation = getItemCalculation(item.productId);
                        return (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant='body2' color='text.secondary'>
                              Preço base:{' '}
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(item.product.price)}
                            </Typography>
                            {calculation && (
                              <>
                                {calculation.tierDiscount > 0 && (
                                  <Box
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
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
                                  Preço unitário:{' '}
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
                                  Subtotal:{' '}
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(calculation.subtotal)}
                                </Typography>
                                {calculation.savings > 0 && (
                                  <Typography variant='caption' color='success.main'>
                                    Economia:{' '}
                                    {new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    }).format(calculation.savings)}
                                  </Typography>
                                )}
                              </>
                            )}
                            {isCalculating && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <CircularProgress size={16} />
                                <Typography variant='caption'>Calculando preços...</Typography>
                              </Box>
                            )}
                          </Box>
                        );
                      })()}
                    </Box>

                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 2 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <IconButton
                          size='small'
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          aria-label='remove'
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
                          sx={{ width: 80, mx: 1 }}
                          inputProps={{ min: 0, style: { textAlign: 'center' } }}
                        />
                        <IconButton
                          size='small'
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          aria-label='add'
                        >
                          <Add />
                        </IconButton>
                      </Box>

                      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        {item.quantity} unidade{item.quantity !== 1 ? 's' : ''}
                      </Typography>

                      <IconButton
                        color='error'
                        onClick={() => removeItem(item.id)}
                        aria-label='delete'
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                  {index < items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </CardContent>
          </Card>

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant='outlined' component={Link} to='/' startIcon={<ArrowBack />}>
              Continuar Navegando
            </Button>
            <Button variant='outlined' color='error' onClick={clearRequest} startIcon={<Delete />}>
              Limpar Solicitação
            </Button>
          </Box>
        </Grid>

        {/* Quotation Summary */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Resumo da Solicitação
              </Typography>

              {priceCalculations && (
                <Box sx={{ py: 2 }}>
                  <TableContainer component={Paper} variant='outlined' sx={{ mb: 2 }}>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <Typography variant='caption'>Métricas</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='caption'>Valores</Typography>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Total de itens</TableCell>
                          <TableCell align='right'>
                            <strong>{totalItems}</strong>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Subtotal</TableCell>
                          <TableCell align='right'>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(priceCalculations.totalSubtotal)}
                          </TableCell>
                        </TableRow>
                        {priceCalculations.totalSavings > 0 && (
                          <TableRow>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <TrendingDown color='success' fontSize='small' />
                                Economia Total
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
                            <strong>Total Estimado</strong>
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
                      <strong>Preços com desconto por volume aplicado!</strong>
                      <br />
                      Os valores incluem descontos automáticos baseados na quantidade solicitada.
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
                    * Calculando preços com descontos por volume...
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {!isAuthenticated && (
                <Alert severity='info' sx={{ mb: 2 }}>
                  Faça login para enviar a solicitação de cotação
                </Alert>
              )}

              {isAuthenticated && user?.role !== 'customer' && (
                <Alert severity='warning' sx={{ mb: 2 }}>
                  Apenas clientes podem solicitar cotações
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
                {isSubmitting ? 'Enviando...' : 'Solicitar Cotação'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default QuotationRequestPage;
