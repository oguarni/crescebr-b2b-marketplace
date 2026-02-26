import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { QuotationRequestProvider } from './contexts/QuotationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const QuotationRequestPage = lazy(() => import('./pages/QuotationRequestPage'));
const MyQuotationsPage = lazy(() => import('./pages/MyQuotationsPage'));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage'));
const AdminQuotationsPage = lazy(() => import('./pages/AdminQuotationsPage'));
const AdminCompanyVerificationPage = lazy(() => import('./pages/AdminCompanyVerificationPage'));
const AdminTransactionMonitoringPage = lazy(() => import('./pages/AdminTransactionMonitoringPage'));
const QuotationDetailPage = lazy(() => import('./pages/QuotationDetailPage'));
const QuoteComparisonPage = lazy(() => import('./pages/QuoteComparisonPage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const SupplierDashboardPage = lazy(() => import('./pages/SupplierDashboardPage'));
const SupplierProductsPage = lazy(() => import('./pages/SupplierProductsPage'));
const SupplierOrdersPage = lazy(() => import('./pages/SupplierOrdersPage'));
const SupplierQuotationsPage = lazy(() => import('./pages/SupplierQuotationsPage'));

const PageFallback = () => (
  <Box display='flex' justifyContent='center' alignItems='center' minHeight='200px'>
    <CircularProgress />
  </Box>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <QuotationRequestProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path='/login' element={<LoginPage />} />
              <Route path='/register' element={<RegisterPage />} />

              {/* Protected routes with layout */}
              <Route path='/' element={<Layout />}>
                <Route index element={<HomePage />} />

                {/* Customer routes */}
                <Route path='cart' element={<CartPage />} />
                <Route path='quotation-request' element={<QuotationRequestPage />} />
                <Route
                  path='my-quotations'
                  element={
                    <ProtectedRoute allowedRoles={['customer', 'admin']}>
                      <MyQuotationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='quote-comparison'
                  element={
                    <ProtectedRoute allowedRoles={['customer', 'admin']}>
                      <QuoteComparisonPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='my-orders'
                  element={
                    <ProtectedRoute allowedRoles={['customer', 'admin']}>
                      <MyOrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='quotations/:id'
                  element={
                    <ProtectedRoute>
                      <QuotationDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='checkout'
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin routes */}
                <Route
                  path='admin/products'
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminProductsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='admin/quotations'
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminQuotationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='admin/analytics'
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminTransactionMonitoringPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='admin/company-verification'
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminCompanyVerificationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='admin/settings'
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      {/* Settings page would go here */}
                      <div>System Settings (To be implemented)</div>
                    </ProtectedRoute>
                  }
                />

                {/* Supplier routes */}
                <Route
                  path='supplier/dashboard'
                  element={
                    <ProtectedRoute allowedRoles={['supplier']}>
                      <SupplierDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='supplier/products'
                  element={
                    <ProtectedRoute allowedRoles={['supplier']} requireApproved>
                      <SupplierProductsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='supplier/orders'
                  element={
                    <ProtectedRoute allowedRoles={['supplier']} requireApproved>
                      <SupplierOrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='supplier/quotations'
                  element={
                    <ProtectedRoute allowedRoles={['supplier']} requireApproved>
                      <SupplierQuotationsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch all - redirect to home */}
              <Route path='*' element={<Navigate to='/' replace />} />
            </Routes>
          </Suspense>
        </QuotationRequestProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
