import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, AuthResponse, RegisterRequest } from '@shared/types';
import { authService } from '../services/authService';
import { apiService } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: AuthResponse }
  | { type: 'USER_LOADED'; payload: User }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextType extends AuthState {
  login: (cnpj: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (registerData: RegisterRequest) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

const getInitialState = (): AuthState => {
  const token = localStorage.getItem('crescebr_token');

  return {
    user: null,
    token,
    isAuthenticated: false,
    isLoading: !!token, // If token exists, we need to verify it
  };
};

const initialState: AuthState = getInitialState();

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'USER_LOADED':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const fetchUser = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('crescebr_token');
      if (!token) {
        dispatch({ type: 'AUTH_FAILURE' });
        return;
      }

      // Set token in axios headers
      apiService.getRawApi().defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const response = await apiService.get<{
        success: boolean;
        data: { user: User };
        error?: string;
      }>('/auth/me');

      if (response.success) {
        dispatch({ type: 'USER_LOADED', payload: response.data.user });
      } else {
        // Invalid token, clear it
        localStorage.removeItem('crescebr_token');
        delete apiService.getRawApi().defaults.headers.common['Authorization'];
        dispatch({ type: 'AUTH_FAILURE' });
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Token is invalid or expired, clear it
      localStorage.removeItem('crescebr_token');
      delete apiService.getRawApi().defaults.headers.common['Authorization'];
      dispatch({ type: 'AUTH_FAILURE' });
    }
  };

  // Verify token and load user on app start
  useEffect(() => {
    if (state.token && !state.isAuthenticated && state.isLoading) {
      fetchUser();
    } else if (!state.token) {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.token, state.isAuthenticated, state.isLoading]);

  const login = async (cnpj: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.login(cnpj, password);
      localStorage.setItem('crescebr_token', response.token);

      // Set token in axios headers
      apiService.getRawApi().defaults.headers.common['Authorization'] = `Bearer ${response.token}`;

      dispatch({ type: 'AUTH_SUCCESS', payload: response });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.loginWithEmail(email, password);
      localStorage.setItem('crescebr_token', response.token);

      // Set token in axios headers
      apiService.getRawApi().defaults.headers.common['Authorization'] = `Bearer ${response.token}`;

      dispatch({ type: 'AUTH_SUCCESS', payload: response });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const register = async (registerData: RegisterRequest): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.register(registerData);
      localStorage.setItem('crescebr_token', response.token);

      // Set token in axios headers
      apiService.getRawApi().defaults.headers.common['Authorization'] = `Bearer ${response.token}`;

      dispatch({ type: 'AUTH_SUCCESS', payload: response });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const logout = (): void => {
    localStorage.removeItem('crescebr_token');
    delete apiService.getRawApi().defaults.headers.common['Authorization'];
    dispatch({ type: 'LOGOUT' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginWithEmail,
    register,
    logout,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
