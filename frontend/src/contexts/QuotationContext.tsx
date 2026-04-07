import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Product } from '@shared/types';
import toast from 'react-hot-toast';

interface QuotationRequestItem {
  id: number;
  productId: number;
  product: Product;
  quantity: number;
  totalPrice: number;
}

interface QuotationRequestState {
  items: QuotationRequestItem[];
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
}

type QuotationRequestAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_REQUEST' }
  | { type: 'TOGGLE_DRAWER' }
  | { type: 'LOAD_REQUEST'; payload: QuotationRequestItem[] };

interface QuotationRequestContextType extends QuotationRequestState {
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearRequest: () => void;
  toggleDrawer: () => void;
}

const initialState: QuotationRequestState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isOpen: false,
};

const quotationRequestReducer = (
  state: QuotationRequestState,
  action: QuotationRequestAction
): QuotationRequestState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.productId === action.payload.id);
      let newItems: QuotationRequestItem[];

      if (existingItem) {
        newItems = state.items.map(item =>
          item.productId === action.payload.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalPrice: (item.quantity + 1) * action.payload.price,
              }
            : item
        );
      } else {
        const newItem: QuotationRequestItem = {
          id: Date.now(), // Simple ID generation
          productId: action.payload.id,
          product: action.payload,
          quantity: 1,
          totalPrice: action.payload.price,
        };
        newItems = [...state.items, newItem];
      }

      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload);
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? {
              ...item,
              quantity: action.payload.quantity,
              totalPrice: action.payload.quantity * item.product.price,
            }
          : item
      );

      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case 'CLEAR_REQUEST':
      return {
        ...state,
        items: [],
        totalItems: 0,
        totalPrice: 0,
      };

    case 'TOGGLE_DRAWER':
      return {
        ...state,
        isOpen: !state.isOpen,
      };

    case 'LOAD_REQUEST': {
      const totalItems = action.payload.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = action.payload.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        ...state,
        items: action.payload,
        totalItems,
        totalPrice,
      };
    }

    default:
      return state;
  }
};

const QuotationRequestContext = createContext<QuotationRequestContextType | undefined>(undefined);

export const QuotationRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(quotationRequestReducer, initialState);

  // Load quotation request from localStorage on mount
  useEffect(() => {
    const savedRequest = localStorage.getItem('crescebr_quotation_request');
    if (savedRequest) {
      try {
        const requestItems = JSON.parse(savedRequest) as QuotationRequestItem[];
        dispatch({ type: 'LOAD_REQUEST', payload: requestItems });
      } catch (error) {
        console.error('Error loading quotation request from localStorage:', error);
      }
    }
  }, []);

  // Save quotation request to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('crescebr_quotation_request', JSON.stringify(state.items));
  }, [state.items]);

  const addItem = (product: Product, quantity: number = 1): void => {
    for (let i = 0; i < quantity; i++) {
      dispatch({ type: 'ADD_ITEM', payload: product });
    }
    toast.success(`${product.name} adicionado à solicitação de cotação!`);
  };

  const removeItem = (itemId: number): void => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
    toast.success('Item removido da solicitação de cotação!');
  };

  const updateQuantity = (itemId: number, quantity: number): void => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id: itemId, quantity } });
  };

  const clearRequest = (): void => {
    dispatch({ type: 'CLEAR_REQUEST' });
    toast.success('Solicitação de cotação limpa!');
  };

  const toggleDrawer = (): void => {
    dispatch({ type: 'TOGGLE_DRAWER' });
  };

  const value: QuotationRequestContextType = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearRequest,
    toggleDrawer,
  };

  return (
    <QuotationRequestContext.Provider value={value}>{children}</QuotationRequestContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useQuotationRequest = (): QuotationRequestContextType => {
  const context = useContext(QuotationRequestContext);
  if (context === undefined) {
    throw new Error('useQuotationRequest must be used within a QuotationRequestProvider');
  }
  return context;
};

// Export alias for backward compatibility
export const QuotationProvider = QuotationRequestProvider;
