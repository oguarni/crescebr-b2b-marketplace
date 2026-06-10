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
import { useT } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

import { AdminOnly, SupplierOnly, CustomerOnly, ApprovedSupplierOnly } from './PermissionGuard';
import toast from 'react-hot-toast';

const Navbar: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems, toggleCart } = useCart();
  // The quote badge counts distinct line items (one per product), not total
  // units. Quantities step in whole multiples of each product's MOQ, so a unit
  // total (10, 20, 30…) would misrepresent how many products are in the request.
  const { items: quotationItems } = useQuotationRequest();
  const t = useT();

  const navigate = useNavigate();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    toast.success(t('nav.logoutSuccess'));
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
        <Box
          component={Link}
          to='/'
          sx={{
            flexGrow: 1,
            // Let the logo shrink on narrow screens instead of pushing the
            // action buttons past the viewport edge.
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
            gap: 1.5,
            '& img': {
              height: { xs: 34, sm: 46 },
              maxWidth: '100%',
              width: 'auto',
              display: 'block',
            },
          }}
        >
          <img src='/logo-crescebr.png' alt='CresceBR' />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LanguageSwitcher />

          {/* Dynamic Action Buttons Based on Permissions */}
          <CustomerOnly>
            <IconButton
              color='inherit'
              onClick={() => navigate('/quotation-request')}
              aria-label='quotation request'
            >
              <Badge badgeContent={quotationItems.length} color='secondary'>
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
              <Badge badgeContent={quotationItems.length} color='secondary'>
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
                      {user?.role === 'admin' && t('nav.roleAdmin')}
                      {user?.role === 'supplier' &&
                        `${t('nav.roleSupplier')} ${
                          user?.status === 'approved'
                            ? t('nav.supplierApproved')
                            : t('nav.supplierPending')
                        }`}
                      {user?.role === 'customer' && t('nav.roleCustomer')}
                    </Typography>
                  </Box>
                </MenuItem>

                <Divider />

                {/* Customer Menu Items */}
                <CustomerOnly>
                  <MenuItem onClick={handleMyQuotations}>
                    <Assignment sx={{ mr: 1 }} />
                    {t('nav.myQuotations')}
                  </MenuItem>
                  <MenuItem onClick={handleMyOrders}>
                    <Receipt sx={{ mr: 1 }} />
                    {t('nav.myOrders')}
                  </MenuItem>
                  <MenuItem onClick={handleQuoteComparison}>
                    <Compare sx={{ mr: 1 }} />
                    {t('nav.comparePrices')}
                  </MenuItem>
                </CustomerOnly>

                {/* Supplier Menu Items */}
                <SupplierOnly>
                  <MenuItem onClick={handleSupplierDashboard}>
                    <Analytics sx={{ mr: 1 }} />
                    {t('nav.supplierDashboard')}
                  </MenuItem>
                  <ApprovedSupplierOnly>
                    <MenuItem
                      onClick={() => {
                        navigate('/supplier/products');
                        handleClose();
                      }}
                    >
                      <Receipt sx={{ mr: 1 }} />
                      {t('nav.myProducts')}
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        navigate('/supplier/orders');
                        handleClose();
                      }}
                    >
                      <Assignment sx={{ mr: 1 }} />
                      {t('nav.receivedOrders')}
                    </MenuItem>
                  </ApprovedSupplierOnly>
                </SupplierOnly>

                {/* Admin Menu Items */}
                <AdminOnly>
                  <MenuItem onClick={handleAdminPanel}>
                    <AdminPanelSettings sx={{ mr: 1 }} />
                    {t('nav.adminPanel')}
                  </MenuItem>
                  <MenuItem onClick={handleAnalytics}>
                    <Analytics sx={{ mr: 1 }} />
                    {t('nav.analytics')}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigate('/admin/company-verification');
                      handleClose();
                    }}
                  >
                    <Verified sx={{ mr: 1 }} />
                    {t('nav.companyVerification')}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigate('/admin/settings');
                      handleClose();
                    }}
                  >
                    <Settings sx={{ mr: 1 }} />
                    {t('nav.settings')}
                  </MenuItem>
                </AdminOnly>

                <Divider />
                <MenuItem onClick={handleLogout}>{t('nav.logout')}</MenuItem>
              </Menu>
            </>
          ) : (
            /* Account creation is under construction, so registration is not
               offered here — only a login button. The login page hosts the
               one-click demo accounts, the fastest path for new visitors. */
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant='contained' color='primary' component={Link} to='/login'>
                {t('nav.login')}
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
