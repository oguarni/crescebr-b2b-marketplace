import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title='No items found' />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<EmptyState title='No items' description='Try adjusting your filters' />);
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    render(<EmptyState title='No items' />);
    // Only the title text should be present
    const texts = screen.getAllByText(/.+/);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toHaveTextContent('No items');
  });

  it('should render action button when provided', () => {
    const onClick = vi.fn();
    render(<EmptyState title='No products' action={{ label: 'Add Product', onClick }} />);
    expect(screen.getByText('Add Product')).toBeInTheDocument();
  });

  it('should call action onClick when button clicked', () => {
    const onClick = vi.fn();
    render(<EmptyState title='No products' action={{ label: 'Add Product', onClick }} />);

    fireEvent.click(screen.getByText('Add Product'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should not render action button when not provided', () => {
    render(<EmptyState title='Empty' />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render custom icon when provided', () => {
    render(<EmptyState title='Empty' icon={<span data-testid='custom-icon'>Custom</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('should render default icon when not provided', () => {
    const { container } = render(<EmptyState title='Empty' />);
    // Default icon is Inbox from MUI Icons, rendered as an SVG
    const svgIcon = container.querySelector('svg[data-testid="InboxIcon"]');
    expect(svgIcon).toBeInTheDocument();
  });
});
