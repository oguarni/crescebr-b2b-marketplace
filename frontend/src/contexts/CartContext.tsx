import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Product, CartItem } from '@shared/types';
import toast from 'react-hot-toast';

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] };

interface CartContextType extends CartState {
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
}

const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isOpen: false,
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.productId === action.payload.id);
      let newItems: CartItem[];

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
        const newItem: CartItem = {
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

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        totalItems: 0,
        totalPrice: 0,
      };

    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen,
      };

    case 'LOAD_CART': {
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

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('crescebr_cart');
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart) as CartItem[];
        dispatch({ type: 'LOAD_CART', payload: cartItems });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('crescebr_cart', JSON.stringify(state.items));
  }, [state.items]);

  const addItem = (product: Product, quantity: number = 1): void => {
    for (let i = 0; i < quantity; i++) {
      dispatch({ type: 'ADD_ITEM', payload: product });
    }
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const removeItem = (itemId: number): void => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
    toast.success('Item removido do carrinho!');
  };

  const updateQuantity = (itemId: number, quantity: number): void => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id: itemId, quantity } });
  };

  const clearCart = (): void => {
    dispatch({ type: 'CLEAR_CART' });
    toast.success('Carrinho limpo!');
  };

  const toggleCart = (): void => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  const value: CartContextType = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
