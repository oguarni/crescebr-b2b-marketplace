import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import {
  ShoppingCart,
  AccountCircle,
  AdminPanelSettings,
  RequestQuote,
  Assignment,
  Compare,
  Receipt,
  Verified,
  Analytics,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useQuotationRequest } from '../contexts/QuotationContext';

import {
  AdminOnly,
  SupplierOnly,
  CustomerOnly,
  ApprovedSupplierOnly,
} from './PermissionGuard';
import toast from 'react-hot-toast';

const Navbar: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems, toggleCart } = useCart();
  const { totalItems: quotationItems } = useQuotationRequest();

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado com sucesso!');
    navigate('/');
    handleClose();
  };

  const handleAdminPanel = () => {
    navigate('/admin/products');
    handleClose();
  };

  const handleMyQuotations = () => {
    navigate('/my-quotations');
    handleClose();
  };

  const handleQuoteComparison = () => {
    navigate('/quote-comparison');
    handleClose();
  };

  const handleMyOrders = () => {
    navigate('/my-orders');
    handleClose();
  };

  const handleAnalytics = () => {
    navigate('/admin/analytics');
    handleClose();
  };

  const handleSupplierDashboard = () => {
    navigate('/supplier/dashboard');
    handleClose();
  };

  return (
    <AppBar position='sticky' elevation={1}>
      <Toolbar>
        <Typography
          variant='h6'
          component={Link}
          to='/'
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 'bold',
          }}
        >
          CresceBR
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Dynamic Action Buttons Based on Permissions */}
          <CustomerOnly>
            <IconButton
              color='inherit'
              onClick={() => navigate('/quotation-request')}
              aria-label='quotation request'
            >
              <Badge badgeContent={quotationItems} color='secondary'>
                <RequestQuote />
              </Badge>
            </IconButton>
          </CustomerOnly>

          <AdminOnly>
            <IconButton color='inherit' onClick={toggleCart} aria-label='shopping cart'>
              <Badge badgeContent={totalItems} color='secondary'>
                <ShoppingCart />
              </Badge>
            </IconButton>
          </AdminOnly>

          {!isAuthenticated && (
            <IconButton
              color='inherit'
              onClick={() => navigate('/quotation-request')}
              aria-label='quotation request'
            >
              <Badge badgeContent={quotationItems} color='secondary'>
                <RequestQuote />
              </Badge>
            </IconButton>
          )}

          {/* Authentication */}
          {isAuthenticated ? (
            <>
              <IconButton
                size='large'
                aria-label='account of current user'
                aria-controls='menu-appbar'
                aria-haspopup='true'
                onClick={handleMenu}
                color='inherit'
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id='menu-appbar'
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      {user?.email}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {user?.role === 'admin' && 'Administrador'}
                      {user?.role === 'supplier' &&
                        `Fornecedor ${user?.status === 'approved' ? '(Aprovado)' : '(Pendente)'}`}
                      {user?.role === 'customer' && 'Cliente'}
                    </Typography>
                  </Box>
                </MenuItem>

                <Divider />

                {/* Customer Menu Items */}
                <CustomerOnly>
                  <MenuItem onClick={handleMyQuotations}>
                    <Assignment sx={{ mr: 1 }} />
                    Minhas Cotações
                  </MenuItem>
                  <MenuItem onClick={handleMyOrders}>
                    <Receipt sx={{ mr: 1 }} />
                    Meus Pedidos
                  </MenuItem>
                  <MenuItem onClick={handleQuoteComparison}>
                    <Compare sx={{ mr: 1 }} />
                    Comparar Preços
                  </MenuItem>
                </CustomerOnly>

                {/* Supplier Menu Items */}
                <SupplierOnly>
                  <MenuItem onClick={handleSupplierDashboard}>
                    <Analytics sx={{ mr: 1 }} />
                    Dashboard Fornecedor
                  </MenuItem>
                  <ApprovedSupplierOnly>
                    <MenuItem
                      onClick={() => {
                        navigate('/supplier/products');
                        handleClose();
                      }}
                    >
                      <Receipt sx={{ mr: 1 }} />
                      Meus Produtos
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        navigate('/supplier/orders');
                        handleClose();
                      }}
                    >
                      <Assignment sx={{ mr: 1 }} />
                      Pedidos Recebidos
                    </MenuItem>
                  </ApprovedSupplierOnly>
                </SupplierOnly>

                {/* Admin Menu Items */}
                <AdminOnly>
                  <MenuItem onClick={handleAdminPanel}>
                    <AdminPanelSettings sx={{ mr: 1 }} />
                    Painel Admin
                  </MenuItem>
                  <MenuItem onClick={handleAnalytics}>
                    <Analytics sx={{ mr: 1 }} />
                    Analytics
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigate('/admin/company-verification');
                      handleClose();
                    }}
                  >
                    <Verified sx={{ mr: 1 }} />
                    Verificação de Empresas
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigate('/admin/settings');
                      handleClose();
                    }}
                  >
                    <Settings sx={{ mr: 1 }} />
                    Configurações
                  </MenuItem>
                </AdminOnly>

                <Divider />
                <MenuItem onClick={handleLogout}>Sair</MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!isMobile && (
                <Button color='inherit' component={Link} to='/login'>
                  Entrar
                </Button>
              )}
              <Button
                variant='outlined'
                color='inherit'
                component={Link}
                to='/register'
                sx={{
                  borderColor: 'currentColor',
                  '&:hover': {
                    borderColor: 'currentColor',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Cadastrar
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
