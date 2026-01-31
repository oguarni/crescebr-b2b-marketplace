# Frontend - CresceBR

## Language Configuration

**Always use English** for:
- Code comments and documentation
- Commit messages
- Variable and function names
- All generated content

---

## Tech Stack
- React 19.1.0 + TypeScript 5.8.3
- Vite 7.0 (build and dev server)
- Material-UI (MUI) 7.1.2 + Emotion
- React Router DOM 6.8.0
- Axios 1.10.0
- Vitest 3.2.4 + React Testing Library

## Target Folder Structure (After Refactoring)

```
src/
├── pages/          # Application pages (one per route)
├── components/     # Reusable UI components
├── contexts/       # Context API (AuthContext, CartContext)
├── hooks/          # Custom hooks (extracted logic)
├── services/       # HTTP calls (api.ts)
├── utils/          # Helper functions
├── types/          # Frontend-specific types
├── App.tsx         # Routes and main layout
├── theme.ts        # Custom MUI theme
└── main.tsx        # Entry point
```

---

## Code Patterns (Target State)

### Components
- Use arrow functions with TypeScript: `const Component: React.FC<Props> = () => {}`
- Type props with interface: `interface ComponentProps { ... }`
- One component per file, filename matches component name
- Page components in `pages/`, UI components in `components/`

### Custom Hooks (Extract Business Logic)
```typescript
// CORRECT: Extract logic into custom hooks
const useQuotationCalculation = (items: CartItem[]) => {
  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (options?: CalculationOptions) => {
    setLoading(true);
    try {
      const result = await quotationsService.calculateQuote(items, options);
      setCalculation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  }, [items]);

  return { calculation, loading, error, calculate };
};

// WRONG: Business logic mixed in component
const QuotationPage = () => {
  const [loading, setLoading] = useState(false);
  // 50+ lines of calculation logic here - WRONG
};
```

### State and Context
- Global state via Context API (not Redux)
- Custom hooks for reusable logic
- useState for local state, useContext for global

### Styling
- MUI sx prop for inline styles
- theme.ts for consistent colors and typography
- Avoid plain CSS, prefer MUI styled-components

### HTTP Services
- All API calls through `services/api.ts`
- Use axios with configured interceptors
- Handle errors with try/catch and toast notifications

---

## Refactoring Tasks

### Phase 1: Extract Custom Hooks from Pages [PRIORITY: MEDIUM]

**Why**: Page components have too much inline logic (data fetching, state management, calculations). Custom hooks improve reusability and testability.

**Task 1.1: Create `src/hooks/useQuotations.ts`**

Extract quotation-related logic from page components:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { quotationsService } from '../services/quotationsService';
import { Quotation } from '@shared/types';

interface UseQuotationsOptions {
  autoFetch?: boolean;
}

export const useQuotations = (options: UseQuotationsOptions = { autoFetch: true }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quotationsService.getCustomerQuotations();
      setQuotations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options.autoFetch) {
      fetchQuotations();
    }
  }, [options.autoFetch, fetchQuotations]);

  return {
    quotations,
    loading,
    error,
    refetch: fetchQuotations,
  };
};

export const useQuotation = (id: number) => {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const data = await quotationsService.getQuotationById(id);
        setQuotation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch quotation');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [id]);

  return { quotation, loading, error };
};
```

**Task 1.2: Create `src/hooks/useProducts.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { productsService } from '../services/productsService';
import { Product } from '@shared/types';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productsService.getProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
};

export const useProduct = (id: number) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productsService.getProductById(id);
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  return { product, loading, error };
};
```

**Task 1.3: Create `src/hooks/useOrders.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { ordersService } from '../services/ordersService';
import { Order } from '@shared/types';

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersService.getOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
};

export const useOrder = (id: string) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await ordersService.getOrderById(id);
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  return { order, loading, error };
};
```

**Task 1.4: Create `src/hooks/useQuoteCalculation.ts`**

```typescript
import { useState, useCallback } from 'react';
import { quotationsService } from '../services/quotationsService';

interface QuoteItem {
  productId: number;
  quantity: number;
}

interface CalculationOptions {
  buyerLocation?: string;
  supplierLocation?: string;
  shippingMethod?: 'standard' | 'express' | 'economy';
}

export const useQuoteCalculation = () => {
  const [calculation, setCalculation] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (items: QuoteItem[], options?: CalculationOptions) => {
    setLoading(true);
    setError(null);
    try {
      const result = await quotationsService.calculateQuote(items, options);
      setCalculation(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calculation failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCalculation(null);
    setError(null);
  }, []);

  return { calculation, loading, error, calculate, reset };
};
```

**Task 1.5: Create `src/hooks/index.ts`**

```typescript
export { useCart } from './useCart';
export { useQuotations, useQuotation } from './useQuotations';
export { useProducts, useProduct } from './useProducts';
export { useOrders, useOrder } from './useOrders';
export { useQuoteCalculation } from './useQuoteCalculation';
```

---

### Phase 2: Refactor Page Components to Use Hooks [PRIORITY: MEDIUM]

**Task 2.1: Refactor `MyQuotationsPage.tsx`**

```typescript
// Before: Logic mixed in component
const MyQuotationsPage = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 20 lines of data fetching logic
  }, []);

  // More inline logic...
};

// After: Using custom hook
import { useQuotations } from '../hooks';

const MyQuotationsPage = () => {
  const { quotations, loading, error, refetch } = useQuotations();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <QuotationList quotations={quotations} />
  );
};
```

**Task 2.2: Refactor `MyOrdersPage.tsx`**

Use `useOrders` hook instead of inline data fetching.

**Task 2.3: Refactor `QuotationDetailPage.tsx`**

Use `useQuotation` hook instead of inline data fetching.

**Task 2.4: Refactor `QuoteComparisonPage.tsx`**

Use `useQuoteCalculation` hook for calculation logic.

---

### Phase 3: Create Reusable UI Components [PRIORITY: LOW]

**Why**: Some UI patterns repeat across pages (loading states, error messages, empty states).

**Task 3.1: Create `src/components/LoadingSpinner.tsx`**

```typescript
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
    <CircularProgress />
    <Typography variant="body2" color="text.secondary" mt={2}>
      {message}
    </Typography>
  </Box>
);
```

**Task 3.2: Create `src/components/ErrorMessage.tsx`**

```typescript
import { Alert, Button, Box } from '@mui/material';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => (
  <Box py={2}>
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {message}
    </Alert>
  </Box>
);
```

**Task 3.3: Create `src/components/EmptyState.tsx`**

```typescript
import { Box, Typography, Button } from '@mui/material';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => (
  <Box textAlign="center" py={4}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" mb={2}>
        {description}
      </Typography>
    )}
    {action && (
      <Button variant="contained" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </Box>
);
```

**Task 3.4: Update `src/components/index.ts`**

```typescript
export { Navbar } from './Navbar';
export { Layout } from './Layout';
export { ProtectedRoute } from './ProtectedRoute';
export { PermissionGuard } from './PermissionGuard';
export { CartDrawer } from './CartDrawer';
export { LoadingSpinner } from './LoadingSpinner';
export { ErrorMessage } from './ErrorMessage';
export { EmptyState } from './EmptyState';
```

---

### Phase 4: Improve Type Safety [PRIORITY: LOW]

**Task 4.1: Create `src/types/index.ts`**

Centralize frontend-specific types that extend or differ from shared types:

```typescript
import { Product, Quotation, Order } from '@shared/types';

// Frontend-specific extensions
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface QuotationWithCalculation extends Quotation {
  calculation?: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    savings: number;
  };
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  cnpj: string;
  role: 'customer' | 'supplier';
}

// Re-export shared types
export * from '@shared/types';
```

---

### Phase 5: Error Handling Improvements [PRIORITY: LOW]

**Task 5.1: Create `src/utils/errorHandler.ts`**

```typescript
import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export const parseApiError = (error: unknown): ApiError => {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    return {
      message: data?.error || data?.message || error.message || 'An error occurred',
      code: error.code,
      details: data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'An unexpected error occurred' };
};

export const getErrorMessage = (error: unknown): string => {
  return parseApiError(error).message;
};
```

**Task 5.2: Update hooks to use error handler**

```typescript
import { getErrorMessage } from '../utils/errorHandler';

// In hooks:
catch (err) {
  setError(getErrorMessage(err));
}
```

---

## Validation Checklist

After completing each phase, verify:

- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test: Login as customer
- [ ] Manual test: Browse products and add to cart
- [ ] Manual test: Create quotation
- [ ] Manual test: View quotation details

---

## What NOT to Change

These patterns are working well - do not refactor:

1. **AuthContext** - Well-structured with reducer pattern
2. **CartContext** - Clean implementation
3. **QuotationRequestContext** - Appropriate for its use case
4. **Services layer** - Good API abstraction
5. **ProtectedRoute component** - Clean access control

---

## System Roles

- `admin`: Full access, company verification, dashboard
- `supplier`: Product management, quotation responses
- `buyer/customer`: Browse products, request quotations, place orders

---

## Commands

```bash
npm run dev          # Development server (port 5173)
npm run build        # Production build
npm run preview      # Preview build
npm run test         # Run tests
npm run lint         # Lint code
```

## Environment Variables
- VITE_API_URL: Base API URL (default: http://localhost:3001/api)
