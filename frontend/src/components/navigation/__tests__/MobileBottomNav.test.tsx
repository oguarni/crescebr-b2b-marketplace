import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileBottomNav } from '../MobileBottomNav';
import { activeBottomNavItem, bottomNavItemsFor } from '../bottomNavItems';

const state = vi.hoisted(() => ({
  user: null as null | { role: 'customer' | 'supplier' | 'admin' },
  requestItems: [] as unknown[],
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.user }),
}));

vi.mock('../../../contexts/QuotationContext', () => ({
  useQuotationRequest: () => ({ items: state.requestItems }),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MobileBottomNav />
    </MemoryRouter>
  );

describe('MobileBottomNav', () => {
  beforeEach(() => {
    state.user = null;
    state.requestItems = [];
  });

  it('gives a supplier real links to its four screens and marks the current one', () => {
    state.user = { role: 'supplier' };
    renderAt('/supplier/dashboard');

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const links = within(nav).getAllByRole('link');
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/supplier/dashboard',
      '/supplier/quotations',
      '/supplier/orders',
      '/supplier/products',
    ]);
    expect(within(nav).getByRole('link', { name: 'Painel' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(within(nav).getByRole('link', { name: 'Cotações' })).not.toHaveAttribute('aria-current');
  });

  it('shows how many products a guest has in the quotation request', () => {
    state.requestItems = [{}, {}];
    renderAt('/');

    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('2')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Entrar/ })).toHaveAttribute('href', '/login');
  });

  it('stays out of drill-down pages, which have their own action bar', () => {
    state.user = { role: 'customer' };
    renderAt('/quotations/7');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('never offers an admin a buyer-only destination', () => {
    state.user = { role: 'admin' };
    renderAt('/admin/settings');
    const hrefs = within(screen.getByRole('navigation'))
      .getAllByRole('link')
      .map(link => link.getAttribute('href'));
    expect(hrefs).toHaveLength(5);
    expect(hrefs.every(href => href?.startsWith('/admin/'))).toBe(true);
  });
});

describe('activeBottomNavItem', () => {
  it('matches exact top-level paths and tolerates a trailing slash', () => {
    const items = bottomNavItemsFor('customer');
    expect(activeBottomNavItem(items, '/my-orders/')?.path).toBe('/my-orders');
    expect(activeBottomNavItem(items, '/')?.path).toBe('/');
    expect(activeBottomNavItem(items, '/checkout')).toBeNull();
  });
});
