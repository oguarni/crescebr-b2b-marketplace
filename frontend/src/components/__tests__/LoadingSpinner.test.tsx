import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default message', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<LoadingSpinner message='Loading products...' />);
    expect(screen.getByText('Loading products...')).toBeInTheDocument();
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
  });

  it('should render spinner element', () => {
    const { container } = render(<LoadingSpinner />);
    // CircularProgress renders role="progressbar"
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('should render spinner with custom size', () => {
    const { container } = render(<LoadingSpinner size={60} />);
    const spinner = container.querySelector('[role="progressbar"]');
    expect(spinner).toBeInTheDocument();
    // MUI CircularProgress applies size as inline style
    expect(spinner).toHaveStyle({ width: '60px', height: '60px' });
  });

  it('should render spinner with default size of 40', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="progressbar"]');
    expect(spinner).toHaveStyle({ width: '40px', height: '40px' });
  });
});
