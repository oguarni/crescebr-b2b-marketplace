import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './Navbar';
import CartDrawer from './CartDrawer';

// Route-specific document titles so browser tabs and history entries are
// distinguishable. Longest prefix is listed first; unknown routes keep the
// base title.
const TITLE_BY_PREFIX: [string, string][] = [
  ['/admin/analytics', 'Análises'],
  ['/admin/company-verification', 'Verificação de Empresas'],
  ['/admin/quotations', 'Cotações (Admin)'],
  ['/admin/products', 'Produtos (Admin)'],
  ['/admin/settings', 'Configurações'],
  ['/supplier/dashboard', 'Painel do Fornecedor'],
  ['/supplier/products', 'Meus Produtos'],
  ['/supplier/orders', 'Pedidos Recebidos'],
  ['/supplier/quotations', 'Cotações Recebidas'],
  ['/my-quotations', 'Minhas Cotações'],
  ['/my-orders', 'Meus Pedidos'],
  ['/quote-comparison', 'Comparar Cotações'],
  ['/quotation-request', 'Solicitar Cotação'],
  ['/quotations', 'Detalhes da Cotação'],
  ['/checkout', 'Checkout'],
  ['/cart', 'Carrinho'],
];

const BASE_TITLE = 'CresceBR - B2B Marketplace';

const Layout: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = TITLE_BY_PREFIX.find(([prefix]) => pathname.startsWith(prefix));
    document.title = match ? `${match[1]} | CresceBR` : BASE_TITLE;
  }, [pathname]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Box>
      <CartDrawer />
    </Box>
  );
};

export default Layout;