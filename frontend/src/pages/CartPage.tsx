import React from 'react';
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
} from '@mui/material';
import {
  Remove,
  Add,
  Delete,
  ShoppingCartCheckout,
  ArrowBack,
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const CartPage: React.FC = () => {
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (items.length === 0) {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h4" gutterBottom>
            Seu carrinho está vazio
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Adicione alguns produtos ao seu carrinho para continuar
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/"
            startIcon={<ArrowBack />}
          >
            Continuar Comprando
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Carrinho de Compras
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {items.length} {items.length === 1 ? 'item' : 'itens'} no seu carrinho
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Cart Items */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              {items.map((item, index) => (
                <React.Fragment key={item.id}>
                  <Box sx={{ display: 'flex', py: 2, alignItems: 'center' }}>
                    <Avatar
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      variant="rounded"
                      sx={{ width: 80, height: 80, mr: 2 }}
                      imgProps={{
                        onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00MCAyNEw1NiA0MEg0OFY1NkgzMlY0MEgyNEw0MCAyNFoiIGZpbGw9IiM5MDkwOTAiLz4KPHN2Zz4K';
                        }
                      }}
                    />
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {item.product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {item.product.description.length > 100
                          ? `${item.product.description.substring(0, 100)}...`
                          : item.product.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Categoria: {item.product.category}
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                        {formatPrice(item.product.price)} cada
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        >
                          <Remove />
                        </IconButton>
                        <TextField
                          size="small"
                          value={item.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const qty = parseInt(e.target.value) || 0;
                            handleQuantityChange(item.id, qty);
                          }}
                          sx={{ width: 80, mx: 1 }}
                          inputProps={{ min: 0, style: { textAlign: 'center' } }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        >
                          <Add />
                        </IconButton>
                      </Box>
                      
                      <Typography variant="body1" fontWeight="bold">
                        {formatPrice(item.totalPrice)}
                      </Typography>
                      
                      <IconButton
                        color="error"
                        onClick={() => removeItem(item.id)}
                        sx={{ mt: 1 }}
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
            <Button
              variant="outlined"
              component={Link}
              to="/"
              startIcon={<ArrowBack />}
            >
              Continuar Comprando
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={clearCart}
              startIcon={<Delete />}
            >
              Limpar Carrinho
            </Button>
          </Box>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumo do Pedido
              </Typography>
              
              <Box sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal:</Typography>
                  <Typography>{formatPrice(totalPrice)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Frete:</Typography>
                  <Typography color="text.secondary">Calculado no checkout</Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary">
                  {formatPrice(totalPrice)}
                </Typography>
              </Box>

              {!isAuthenticated && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Faça login para finalizar a compra
                </Alert>
              )}

              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<ShoppingCartCheckout />}
                onClick={handleCheckout}
              >
                Finalizar Compra
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CartPage;