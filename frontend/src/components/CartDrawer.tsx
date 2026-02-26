import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  TextField,
  Alert,
} from '@mui/material';
import {
  Close,
  Remove,
  Add,
  Delete,
  ShoppingCartCheckout,
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const CartDrawer: React.FC = () => {
  const { isOpen, items, totalPrice, toggleCart, updateQuantity, removeItem, clearCart } = useCart();
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
    toggleCart();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <Drawer anchor="right" open={isOpen} onClose={toggleCart}>
      <Box sx={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Carrinho de Compras</Typography>
            <IconButton onClick={toggleCart}>
              <Close />
            </IconButton>
          </Box>
        </Box>

        {/* Cart Items */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {items.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Seu carrinho está vazio
              </Typography>
              <Button
                variant="outlined"
                component={Link}
                to="/"
                onClick={toggleCart}
                sx={{ mt: 2 }}
              >
                Continuar Comprando
              </Button>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {items.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem sx={{ py: 2, alignItems: 'flex-start' }}>
                    <ListItemAvatar>
                      <Avatar
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        variant="rounded"
                        sx={{ width: 60, height: 60 }}
                        imgProps={{
                          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0zMCAxOEw0MiAzMEgzNlY0MkgyNFYzMEgxOEwzMCAxOFoiIGZpbGw9IiM5MDkwOTAiLz4KPHN2Zz4K';
                          }
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" noWrap>
                          {item.product.name}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatPrice(item.product.price)} cada
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            >
                              <Remove fontSize="small" />
                            </IconButton>
                            <TextField
                              size="small"
                              value={item.quantity}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const qty = parseInt(e.target.value) || 0;
                                handleQuantityChange(item.id, qty);
                              }}
                              sx={{ width: 60 }}
                              inputProps={{ min: 0, style: { textAlign: 'center' } }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeItem(item.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                            Subtotal: {formatPrice(item.totalPrice)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {items.length > 0 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">
                Total: {formatPrice(totalPrice)}
              </Typography>
            </Box>

            {!isAuthenticated && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Faça login para finalizar a compra
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<ShoppingCartCheckout />}
                onClick={handleCheckout}
              >
                Finalizar Compra
              </Button>
              <Button
                variant="outlined"
                fullWidth
                color="error"
                onClick={clearCart}
              >
                Limpar Carrinho
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default CartDrawer;