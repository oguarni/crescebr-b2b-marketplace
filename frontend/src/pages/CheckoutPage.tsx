import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  CreditCard,
  LocalShipping,
  Security,
  CheckCircle,
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { ordersService } from '../services/ordersService';
import { viaCepService } from '../services/viaCepService';
import toast from 'react-hot-toast';

interface ShippingInfo {
  cost: number;
  days: number;
}

const CheckoutPage: React.FC = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Shipping Info
    cep: '',
    address: user?.address || '',
    
    // Payment Info
    paymentMethod: 'credit',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
    
    // PIX Info (for PIX payment simulation)
    pixEmail: user?.email || '',
  });

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !orderSuccess) {
      navigate('/');
    }
  }, [items, orderSuccess, navigate]);

  const handleCepChange = async (cep: string) => {
    setFormData(prev => ({ ...prev, cep }));
    
    if (viaCepService.isValidCep(cep)) {
      setIsCalculatingShipping(true);
      try {
        // Get address from CEP
        const addressData = await viaCepService.getAddressByCep(cep);
        const fullAddress = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade} - ${addressData.uf}`;
        setFormData(prev => ({ ...prev, address: fullAddress }));
        
        // Simulate shipping calculation based on CEP
        const shipping: ShippingInfo = {
          cost: totalPrice * 0.05,
          days: 5,
        };
        setShippingInfo(shipping);

        toast.success('Frete calculado com sucesso!');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao calcular frete';
        toast.error(message);
        setShippingInfo(null);
      } finally {
        setIsCalculatingShipping(false);
      }
    } else {
      setShippingInfo(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatCardExpiry = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d{2})/, '$1/$2');
  };

  const validateForm = (): boolean => {
    if (!formData.cep || !formData.address) {
      toast.error('Informações de entrega são obrigatórias');
      return false;
    }

    if (!shippingInfo) {
      toast.error('Por favor, calcule o frete primeiro');
      return false;
    }

    if (formData.paymentMethod === 'credit') {
      if (!formData.cardNumber || !formData.cardName || !formData.cardExpiry || !formData.cardCvv) {
        toast.error('Todos os campos do cartão são obrigatórios');
        return false;
      }

      const cleanCardNumber = formData.cardNumber.replace(/\s/g, '');
      if (cleanCardNumber.length !== 16) {
        toast.error('Número do cartão deve ter 16 dígitos');
        return false;
      }

      if (formData.cardCvv.length !== 3) {
        toast.error('CVV deve ter 3 dígitos');
        return false;
      }
    }

    if (formData.paymentMethod === 'pix' && !formData.pixEmail) {
      toast.error('Email para PIX é obrigatório');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // For checkout, we need a quotationId. Since cart items may not have a quotationId,
      // we use the first item's productId as a placeholder quotationId for now.
      // In a real scenario, a quotation would be created first.
      const quotationId = items[0]?.productId ?? 0;

      // Create order from quotation
      const orderResponse = await ordersService.createOrderFromQuotation({ quotationId });

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setOrderId(Number(orderResponse.id));
      setOrderSuccess(true);
      clearCart();

      toast.success('Pedido realizado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao processar pedido';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Pedido Realizado com Sucesso!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Seu pedido #{orderId} foi processado e você receberá um email de confirmação.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Prazo de entrega: {shippingInfo?.days} dias úteis
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            size="large"
          >
            Continuar Comprando
          </Button>
        </Box>
      </Container>
    );
  }

  const totalWithShipping = totalPrice + (shippingInfo?.cost || 0);

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Finalizar Compra
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Left Column - Shipping & Payment */}
          <Grid item xs={12} md={8}>
            {/* Shipping Information */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocalShipping sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Informações de Entrega</Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="CEP"
                      value={formData.cep}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      InputProps={{
                        endAdornment: isCalculatingShipping && (
                          <InputAdornment position="end">
                            <CircularProgress size={20} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Endereço Completo"
                      value={formData.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>

                {shippingInfo && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Frete: {formatPrice(shippingInfo.cost)} - Entrega em {shippingInfo.days} dias úteis
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CreditCard sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Informações de Pagamento</Typography>
                </Box>

                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <FormLabel component="legend">Método de Pagamento</FormLabel>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    row
                  >
                    <FormControlLabel value="credit" control={<Radio />} label="Cartão de Crédito" />
                    <FormControlLabel value="pix" control={<Radio />} label="PIX" />
                  </RadioGroup>
                </FormControl>

                {formData.paymentMethod === 'credit' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Número do Cartão"
                        value={formData.cardNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                          ...prev,
                          cardNumber: formatCardNumber(e.target.value)
                        }))}
                        placeholder="0000 0000 0000 0000"
                        inputProps={{ maxLength: 19 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nome no Cartão"
                        value={formData.cardName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, cardName: e.target.value }))}
                        placeholder="Nome como no cartão"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Validade"
                        value={formData.cardExpiry}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                          ...prev,
                          cardExpiry: formatCardExpiry(e.target.value)
                        }))}
                        placeholder="MM/AA"
                        inputProps={{ maxLength: 5 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="CVV"
                        value={formData.cardCvv}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, cardCvv: e.target.value }))}
                        placeholder="123"
                        inputProps={{ maxLength: 3 }}
                        type="password"
                      />
                    </Grid>
                  </Grid>
                )}

                {formData.paymentMethod === 'pix' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email para PIX"
                        value={formData.pixEmail}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, pixEmail: e.target.value }))}
                        placeholder="seu@email.com"
                        type="email"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Alert severity="info">
                        Após confirmar o pedido, você receberá o código PIX para pagamento.
                      </Alert>
                    </Grid>
                  </Grid>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Security sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Seus dados estão protegidos com criptografia SSL
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Order Summary */}
          <Grid item xs={12} md={4}>
            <Card sx={{ position: 'sticky', top: 20 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumo do Pedido
                </Typography>

                <List dense>
                  {items.map((item) => (
                    <ListItem key={item.id} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          variant="rounded"
                          sx={{ width: 40, height: 40 }}
                          imgProps={{
                            onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAxMkwyOCAyMEgyNFYyOEgxNlYyMEgxMkwyMCAxMloiIGZpbGw9IiM5MDkwOTAiLz4KPHN2Zz4K';
                            }
                          }}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>
                            {item.product.name}
                          </Typography>
                        }
                        secondary={`Qtd: ${item.quantity} × ${formatPrice(item.product.price)}`}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {formatPrice(item.totalPrice)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal:</Typography>
                  <Typography>{formatPrice(totalPrice)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Frete:</Typography>
                  <Typography>
                    {shippingInfo ? formatPrice(shippingInfo.cost) : 'A calcular'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    {formatPrice(totalWithShipping)}
                  </Typography>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={isSubmitting || !shippingInfo}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <Security />}
                >
                  {isSubmitting ? 'Processando...' : 'Finalizar Pedido'}
                </Button>

                <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
                  Ao finalizar, você concorda com nossos termos de uso
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};

export default CheckoutPage;