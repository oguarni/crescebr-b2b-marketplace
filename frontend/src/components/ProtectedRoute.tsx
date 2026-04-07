import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box, Alert, Container } from '@mui/material';

type UserRole = 'customer' | 'admin' | 'supplier';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedRoles?: UserRole[];
  requireApproved?: boolean;
  fallbackComponent?: React.ComponentType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  allowedRoles,
  requireApproved = false,
  fallbackComponent: FallbackComponent,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='50vh'>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // Check admin requirement (legacy support)
  if (requireAdmin && user?.role !== 'admin') {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return (
      <Container maxWidth='md'>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Alert severity='error' sx={{ mb: 4 }}>
            Acesso negado. Você precisa de permissões de administrador para acessar esta página.
          </Alert>
        </Box>
      </Container>
    );
  }

  // Check allowed roles
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return (
      <Container maxWidth='md'>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Alert severity='error' sx={{ mb: 4 }}>
            Acesso negado. Você não tem permissão para acessar esta página. Roles permitidos:{' '}
            {allowedRoles.join(', ')}
          </Alert>
        </Box>
      </Container>
    );
  }

  // Check approved status for suppliers
  if (requireApproved && user?.role === 'supplier' && user?.status !== 'approved') {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return (
      <Container maxWidth='md'>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Alert severity='warning' sx={{ mb: 4 }}>
            Sua conta de fornecedor está pendente de aprovação. Entre em contato com o administrador
            para mais informações.
          </Alert>
        </Box>
      </Container>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// eslint-disable-next-line react-refresh/only-export-components
export const withPermissions = (
  allowedRoles: UserRole[],
  fallback?: React.ComponentType | React.ReactElement
) => {
  return function WithPermissionsComponent<P extends object>(
    WrappedComponent: React.ComponentType<P>
  ) {
    return function PermissionWrapper(props: P) {
      const { user } = useAuth();

      if (!user || !allowedRoles.includes(user.role)) {
        if (fallback) {
          return React.isValidElement(fallback) ? fallback : React.createElement(fallback);
        }
        return null;
      }

      return <WrappedComponent {...props} />;
    };
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePermissions = () => {
  const { user } = useAuth();

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user?.role ? roles.includes(user.role) : false;
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isSupplier = (): boolean => {
    return user?.role === 'supplier';
  };

  const isCustomer = (): boolean => {
    return user?.role === 'customer';
  };

  const isApprovedSupplier = (): boolean => {
    return user?.role === 'supplier' && user?.status === 'approved';
  };

  const canManageProducts = (): boolean => {
    return user?.role === 'admin' || (user?.role === 'supplier' && user?.status === 'approved');
  };

  const canAccessAdminPanel = (): boolean => {
    return user?.role === 'admin';
  };

  const canModifyOrders = (): boolean => {
    return user?.role === 'admin' || user?.role === 'supplier';
  };

  const canRequestQuotes = (): boolean => {
    return user?.role === 'customer' || user?.role === 'admin';
  };

  return {
    user,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSupplier,
    isCustomer,
    isApprovedSupplier,
    canManageProducts,
    canAccessAdminPanel,
    canModifyOrders,
    canRequestQuotes,
  };
};
