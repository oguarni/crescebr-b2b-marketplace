import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './Navbar';
import CartDrawer from './CartDrawer';
import { useT } from '../contexts/LanguageContext';
import type { TranslationKey } from '../locales';

// Route-specific document titles so browser tabs and history entries are
// distinguishable. Longest prefix is listed first; unknown routes keep the
// base title.
const TITLE_KEY_BY_PREFIX: [string, TranslationKey][] = [
  ['/admin/analytics', 'pageTitle.analytics'],
  ['/admin/company-verification', 'pageTitle.companyVerification'],
  ['/admin/quotations', 'pageTitle.adminQuotations'],
  ['/admin/products', 'pageTitle.adminProducts'],
  ['/admin/settings', 'pageTitle.settings'],
  ['/supplier/dashboard', 'pageTitle.supplierDashboard'],
  ['/supplier/products', 'pageTitle.supplierProducts'],
  ['/supplier/orders', 'pageTitle.supplierOrders'],
  ['/supplier/quotations', 'pageTitle.supplierQuotations'],
  ['/my-quotations', 'pageTitle.myQuotations'],
  ['/my-orders', 'pageTitle.myOrders'],
  ['/quote-comparison', 'pageTitle.quoteComparison'],
  ['/quotation-request', 'pageTitle.quotationRequest'],
  ['/quotations', 'pageTitle.quotationDetail'],
  ['/checkout', 'pageTitle.checkout'],
  ['/cart', 'pageTitle.cart'],
  ['/products/', 'pageTitle.productDetail'],
];

const BASE_TITLE = 'CresceBR - B2B Marketplace';

const Layout: React.FC = () => {
  const { pathname } = useLocation();
  const t = useT();

  useEffect(() => {
    const match = TITLE_KEY_BY_PREFIX.find(([prefix]) => pathname.startsWith(prefix));
    document.title = match ? `${t(match[1])} | CresceBR` : BASE_TITLE;
  }, [pathname, t]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component='main' sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Box>
      <CartDrawer />
    </Box>
  );
};

export default Layout;
