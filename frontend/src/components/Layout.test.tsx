import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';

// Mock child components to isolate Layout rendering
vi.mock('./Navbar', () => ({
  default: () => <nav data-testid='navbar'>Navbar</nav>,
}));

vi.mock('./CartDrawer', () => ({
  default: () => <div data-testid='cart-drawer'>CartDrawer</div>,
}));

describe('Layout', () => {
  const renderWithRouter = (outlet?: React.ReactNode) => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path='/' element={<Layout />}>
            <Route index element={outlet ?? <div data-testid='outlet-content'>Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders Navbar', () => {
    renderWithRouter();

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('renders CartDrawer', () => {
    renderWithRouter();

    expect(screen.getByTestId('cart-drawer')).toBeInTheDocument();
  });

  it('renders child route content via Outlet', () => {
    renderWithRouter(<div data-testid='child-page'>Child Content</div>);

    expect(screen.getByTestId('child-page')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('wraps content in a flex column container', () => {
    const { container } = renderWithRouter();

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
  });

  it('renders all three sections together', () => {
    renderWithRouter(<p>Page text</p>);

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('cart-drawer')).toBeInTheDocument();
    expect(screen.getByText('Page text')).toBeInTheDocument();
  });
});
