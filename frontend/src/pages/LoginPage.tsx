import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  InputAdornment,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Business } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<'cnpj' | 'email'>('cnpj');

  const { login, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (loginType === 'cnpj') {
        await login(cnpj, password);
      } else {
        await loginWithEmail(email, password);
      }
      toast.success('Login realizado com sucesso!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosErr.response?.data?.error || axiosErr.message || 'Erro ao fazer login';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component='main' maxWidth='sm'>
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component='h1' variant='h4' gutterBottom>
            CresceBR
          </Typography>
          <Typography component='h2' variant='h6' color='text.secondary' gutterBottom>
            Faça login em sua conta
          </Typography>

          <Tabs
            value={loginType}
            onChange={(_, newValue) => setLoginType(newValue)}
            centered
            sx={{ mb: 2 }}
          >
            <Tab label='CNPJ' value='cnpj' icon={<Business />} />
            <Tab label='Email' value='email' icon={<Email />} />
          </Tabs>

          <Box component='form' onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            {loginType === 'cnpj' ? (
              <TextField
                margin='normal'
                required
                fullWidth
                id='cnpj'
                label='CNPJ'
                name='cnpj'
                autoComplete='organization'
                autoFocus
                value={cnpj}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCnpj(e.target.value)}
                placeholder='00.000.000/0000-00'
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Business />
                    </InputAdornment>
                  ),
                }}
              />
            ) : (
              <TextField
                margin='normal'
                required
                fullWidth
                id='email'
                label='Email'
                name='email'
                autoComplete='email'
                autoFocus
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            <TextField
              margin='normal'
              required
              fullWidth
              name='password'
              label='Senha'
              type={showPassword ? 'text' : 'password'}
              id='password'
              autoComplete='current-password'
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      aria-label='toggle password visibility'
                      onClick={handleTogglePasswordVisibility}
                      edge='end'
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type='submit'
              fullWidth
              variant='contained'
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Entrar'}
            </Button>
            <Box textAlign='center'>
              <Typography variant='body2'>
                Não tem uma conta?{' '}
                <Link to='/register' style={{ color: 'inherit', textDecoration: 'underline' }}>
                  Cadastre-se
                </Link>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1, width: '100%' }}>
            <Typography variant='body2' color='text.secondary' gutterBottom>
              <strong>Contas de teste:</strong>
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Admin (Email): admin@crescebr.com / admin123
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Empresa (CNPJ): 11.222.333/0001-81 / empresa123
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
