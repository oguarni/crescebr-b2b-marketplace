import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('should render error message', () => {
    render(<ErrorMessage message='Something went wrong' />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<ErrorMessage message='Error occurred' onRetry={onRetry} />);
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('should not render retry button when onRetry not provided', () => {
    render(<ErrorMessage message='Error occurred' />);
    expect(screen.queryByText('Tentar novamente')).not.toBeInTheDocument();
  });

  it('should call onRetry when button clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorMessage message='Error occurred' onRetry={onRetry} />);

    fireEvent.click(screen.getByText('Tentar novamente'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should render with default error severity', () => {
    const { container } = render(<ErrorMessage message='Error' />);
    // MUI Alert with severity="error" adds class MuiAlert-standardError
    const alert = container.querySelector('.MuiAlert-standardError');
    expect(alert).toBeInTheDocument();
  });

  it('should render with custom severity', () => {
    const { container } = render(<ErrorMessage message='Warning message' severity='warning' />);
    const alert = container.querySelector('.MuiAlert-standardWarning');
    expect(alert).toBeInTheDocument();
  });

  it('should render with info severity', () => {
    const { container } = render(<ErrorMessage message='Info message' severity='info' />);
    const alert = container.querySelector('.MuiAlert-standardInfo');
    expect(alert).toBeInTheDocument();
  });
});
