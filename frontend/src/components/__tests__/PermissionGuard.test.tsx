import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import PermissionGuard, {
  AdminOnly,
  SupplierOnly,
  CustomerOnly,
  ApprovedSupplierOnly,
  usePermissionStyles,
} from '../PermissionGuard';

// Mock the usePermissions hook from ProtectedRoute
const mockPermissions = {
  user: null as Record<string, unknown> | null,
  hasRole: vi.fn(),
  hasAnyRole: vi.fn(),
  isAdmin: vi.fn(),
  isSupplier: vi.fn(),
  isCustomer: vi.fn(),
  isApprovedSupplier: vi.fn(),
  canManageProducts: vi.fn(),
  canAccessAdminPanel: vi.fn(),
  canModifyOrders: vi.fn(),
  canRequestQuotes: vi.fn(),
};

vi.mock('../ProtectedRoute', () => ({
  usePermissions: () => mockPermissions,
}));

const resetPermissions = () => {
  mockPermissions.user = null;
  mockPermissions.hasRole.mockReturnValue(false);
  mockPermissions.hasAnyRole.mockReturnValue(false);
  mockPermissions.isAdmin.mockReturnValue(false);
  mockPermissions.isSupplier.mockReturnValue(false);
  mockPermissions.isCustomer.mockReturnValue(false);
  mockPermissions.isApprovedSupplier.mockReturnValue(false);
  mockPermissions.canManageProducts.mockReturnValue(false);
  mockPermissions.canAccessAdminPanel.mockReturnValue(false);
  mockPermissions.canModifyOrders.mockReturnValue(false);
  mockPermissions.canRequestQuotes.mockReturnValue(false);
};

describe('PermissionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPermissions();
  });

  it('should render children when no restrictions', () => {
    render(
      <PermissionGuard>
        <div>Unrestricted Content</div>
      </PermissionGuard>
    );
    expect(screen.getByText('Unrestricted Content')).toBeInTheDocument();
  });

  it('should render children when user has admin role (requireAdmin)', () => {
    mockPermissions.isAdmin.mockReturnValue(true);

    render(
      <PermissionGuard requireAdmin>
        <div>Admin Content</div>
      </PermissionGuard>
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should not render when user lacks admin role', () => {
    mockPermissions.isAdmin.mockReturnValue(false);

    render(
      <PermissionGuard requireAdmin>
        <div>Admin Content</div>
      </PermissionGuard>
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should render fallback when showFallback=true and user lacks permission', () => {
    mockPermissions.isAdmin.mockReturnValue(false);

    render(
      <PermissionGuard requireAdmin showFallback={true} fallback={<div>Access Denied</div>}>
        <div>Admin Content</div>
      </PermissionGuard>
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('should return null when showFallback=false and user lacks permission', () => {
    mockPermissions.isAdmin.mockReturnValue(false);

    const { container } = render(
      <PermissionGuard requireAdmin showFallback={false} fallback={<div>Access Denied</div>}>
        <div>Admin Content</div>
      </PermissionGuard>
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });

  it('should return null when no fallback provided even with showFallback=true', () => {
    mockPermissions.isAdmin.mockReturnValue(false);

    const { container } = render(
      <PermissionGuard requireAdmin showFallback={true}>
        <div>Admin Content</div>
      </PermissionGuard>
    );
    expect(container.innerHTML).toBe('');
  });

  it('should check specific role with requireRole', () => {
    mockPermissions.hasRole.mockImplementation((role: string) => role === 'supplier');

    render(
      <PermissionGuard requireRole='supplier'>
        <div>Supplier Content</div>
      </PermissionGuard>
    );
    expect(screen.getByText('Supplier Content')).toBeInTheDocument();
  });

  it('should hide content when requireRole does not match', () => {
    mockPermissions.hasRole.mockReturnValue(false);

    render(
      <PermissionGuard requireRole='supplier'>
        <div>Supplier Content</div>
      </PermissionGuard>
    );
    expect(screen.queryByText('Supplier Content')).not.toBeInTheDocument();
  });

  it('should check allowed roles', () => {
    mockPermissions.hasAnyRole.mockReturnValue(true);

    render(
      <PermissionGuard allowedRoles={['admin', 'supplier']}>
        <div>Multi-role Content</div>
      </PermissionGuard>
    );
    expect(screen.getByText('Multi-role Content')).toBeInTheDocument();
    expect(mockPermissions.hasAnyRole).toHaveBeenCalledWith(['admin', 'supplier']);
  });

  it('should hide content when allowed roles do not match', () => {
    mockPermissions.hasAnyRole.mockReturnValue(false);

    render(
      <PermissionGuard allowedRoles={['admin']}>
        <div>Admin Content</div>
      </PermissionGuard>
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should check approved supplier status', () => {
    mockPermissions.isSupplier.mockReturnValue(true);
    mockPermissions.isApprovedSupplier.mockReturnValue(false);

    render(
      <PermissionGuard requireApproved>
        <div>Approved Content</div>
      </PermissionGuard>
    );
    expect(screen.queryByText('Approved Content')).not.toBeInTheDocument();
  });

  it('should render children for approved supplier with requireApproved', () => {
    mockPermissions.isSupplier.mockReturnValue(true);
    mockPermissions.isApprovedSupplier.mockReturnValue(true);

    render(
      <PermissionGuard requireApproved>
        <div>Approved Content</div>
      </PermissionGuard>
    );
    expect(screen.getByText('Approved Content')).toBeInTheDocument();
  });

  it('should allow non-supplier through requireApproved check', () => {
    // requireApproved only applies to suppliers
    mockPermissions.isSupplier.mockReturnValue(false);
    mockPermissions.isApprovedSupplier.mockReturnValue(false);

    render(
      <PermissionGuard requireApproved>
        <div>Content</div>
      </PermissionGuard>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('AdminOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPermissions();
  });

  it('should render children when user is admin', () => {
    mockPermissions.isAdmin.mockReturnValue(true);

    render(
      <AdminOnly>
        <div>Admin Panel</div>
      </AdminOnly>
    );
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('should hide children when user is not admin', () => {
    mockPermissions.isAdmin.mockReturnValue(false);

    render(
      <AdminOnly>
        <div>Admin Panel</div>
      </AdminOnly>
    );
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });
});

describe('SupplierOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPermissions();
  });

  it('should render children when user is supplier', () => {
    mockPermissions.hasRole.mockImplementation((role: string) => role === 'supplier');

    render(
      <SupplierOnly>
        <div>Supplier Dashboard</div>
      </SupplierOnly>
    );
    expect(screen.getByText('Supplier Dashboard')).toBeInTheDocument();
  });

  it('should hide children when user is not supplier', () => {
    mockPermissions.hasRole.mockReturnValue(false);

    render(
      <SupplierOnly>
        <div>Supplier Dashboard</div>
      </SupplierOnly>
    );
    expect(screen.queryByText('Supplier Dashboard')).not.toBeInTheDocument();
  });
});

describe('CustomerOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPermissions();
  });

  it('should render children when user is customer', () => {
    mockPermissions.hasRole.mockImplementation((role: string) => role === 'customer');

    render(
      <CustomerOnly>
        <div>Customer Area</div>
      </CustomerOnly>
    );
    expect(screen.getByText('Customer Area')).toBeInTheDocument();
  });

  it('should hide children when user is not customer', () => {
    mockPermissions.hasRole.mockReturnValue(false);

    render(
      <CustomerOnly>
        <div>Customer Area</div>
      </CustomerOnly>
    );
    expect(screen.queryByText('Customer Area')).not.toBeInTheDocument();
  });
});

describe('ApprovedSupplierOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPermissions();
  });

  it('should render children when user is approved supplier', () => {
    mockPermissions.hasRole.mockImplementation((role: string) => role === 'supplier');
    mockPermissions.isSupplier.mockReturnValue(true);
    mockPermissions.isApprovedSupplier.mockReturnValue(true);

    render(
      <ApprovedSupplierOnly>
        <div>Approved Supplier Content</div>
      </ApprovedSupplierOnly>
    );
    expect(screen.getByText('Approved Supplier Content')).toBeInTheDocument();
  });

  it('should hide children when user is unapproved supplier', () => {
    mockPermissions.hasRole.mockImplementation((role: string) => role === 'supplier');
    mockPermissions.isSupplier.mockReturnValue(true);
    mockPermissions.isApprovedSupplier.mockReturnValue(false);

    render(
      <ApprovedSupplierOnly>
        <div>Approved Supplier Content</div>
      </ApprovedSupplierOnly>
    );
    expect(screen.queryByText('Approved Supplier Content')).not.toBeInTheDocument();
  });

  it('should hide children when user is not supplier', () => {
    mockPermissions.hasRole.mockReturnValue(false);

    render(
      <ApprovedSupplierOnly>
        <div>Approved Supplier Content</div>
      </ApprovedSupplierOnly>
    );
    expect(screen.queryByText('Approved Supplier Content')).not.toBeInTheDocument();
  });
});

describe('usePermissionStyles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPermissions();
  });

  it('getVisibilityStyle returns display:block for matching roles', () => {
    mockPermissions.hasAnyRole.mockReturnValue(true);

    const { result } = renderHook(() => usePermissionStyles());
    const style = result.current.getVisibilityStyle(['admin']);

    expect(style).toEqual({ display: 'block' });
  });

  it('getVisibilityStyle returns display:none for non-matching roles', () => {
    mockPermissions.hasAnyRole.mockReturnValue(false);

    const { result } = renderHook(() => usePermissionStyles());
    const style = result.current.getVisibilityStyle(['admin']);

    expect(style).toEqual({ display: 'none' });
  });

  it('getDisabledState returns true when user lacks role', () => {
    mockPermissions.hasAnyRole.mockReturnValue(false);

    const { result } = renderHook(() => usePermissionStyles());
    expect(result.current.getDisabledState(['admin'])).toBe(true);
  });

  it('getDisabledState returns false when user has role', () => {
    mockPermissions.hasAnyRole.mockReturnValue(true);

    const { result } = renderHook(() => usePermissionStyles());
    expect(result.current.getDisabledState(['admin'])).toBe(false);
  });

  it('exposes permissions object', () => {
    const { result } = renderHook(() => usePermissionStyles());
    expect(result.current.permissions).toBe(mockPermissions);
  });
});
