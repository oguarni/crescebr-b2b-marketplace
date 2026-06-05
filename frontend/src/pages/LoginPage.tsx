import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Business,
  ShoppingCart,
  Storefront,
  AdminPanelSettings,
  ArrowBack,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import type { TranslationKey } from '../locales';
import { INPUT_LIMITS } from '../utils/inputLimits';
import toast from 'react-hot-toast';

interface DemoAccount {
  roleKey: TranslationKey;
  descriptionKey: TranslationKey;
  company: string;
  cnpj: string;
  email: string;
  password: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

// Fictional companies seeded in the database. Credentials are public on purpose:
// this is a portfolio demo where visitors sign in with one click.
const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    roleKey: 'login.demoRoleBuyer',
    company: 'Buyer Corp',
    cnpj: '33.333.333/0001-33',
    email: 'buyer@example.com',
    password: 'buyer123',
    icon: <ShoppingCart />,
    descriptionKey: 'login.demoDescBuyer',
    recommended: true,
  },
  {
    roleKey: 'login.demoRoleSupplier',
    company: 'Industrial Solutions',
    cnpj: '22.222.222/0001-22',
    email: 'supplier@example.com',
    password: 'supplier123',
    icon: <Storefront />,
    descriptionKey: 'login.demoDescSupplier',
  },
  {
    roleKey: 'login.demoRoleAdmin',
    company: 'CresceBR Admin',
    cnpj: '00.000.000/0001-00',
    email: 'admin@crescebr.com',
    password: 'admin123',
    icon: <AdminPanelSettings />,
    descriptionKey: 'login.demoDescAdmin',
  },
];

const LoginPage: React.FC = () => {
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<'cnpj' | 'email'>('cnpj');

  const { login, loginWithEmail } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleBack = () => {
    // Return to the previous in-app page when history exists; otherwise the user
    // deep-linked straight here, so send them to the marketplace home.
    if (location.key && location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (loginType === 'cnpj') {
        await login(cnpj, password);
      } else {
        await loginWithEmail(email, password);
      }
      toast.success(t('login.toastSuccess'));
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage =
        axiosErr.response?.data?.error || axiosErr.message || t('login.toastError');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleDemoLogin = async (account: DemoAccount) => {
    setIsLoading(true);
    setLoginType('cnpj');
    setCnpj(account.cnpj);
    setEmail(account.email);
    setPassword(account.password);

    try {
      await login(account.cnpj, account.password);
      toast.success(t('login.toastDemoSuccess', { company: account.company }));
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage =
        axiosErr.response?.data?.error || axiosErr.message || t('login.toastError');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component='main' maxWidth='sm'>
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 8,
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
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Button onClick={handleBack} startIcon={<ArrowBack />} color='inherit' size='small'>
              {t('common.back')}
            </Button>
            <LanguageSwitcher />
          </Box>
          <Box
            component='img'
            src='/logo-crescebr.png'
            alt='CresceBR'
            sx={{ height: 56, width: 'auto', mt: 1, mb: 1 }}
          />

          {/* Demo companies first: this is a portfolio demo, so one-click sign-in
              is the primary call to action and sits above the credential form. */}
          <Box sx={{ width: '100%', mt: 2 }}>
            <Divider sx={{ mb: 2 }}>
              <Chip label={t('login.demoTitle')} size='small' />
            </Divider>

            <Typography variant='body2' color='text.secondary' align='center' sx={{ mb: 2 }}>
              {t('login.demoHelp')}
            </Typography>

            <Stack spacing={1.5}>
              {DEMO_ACCOUNTS.map(account => (
                <Box
                  key={account.cnpj}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: account.recommended ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ color: 'primary.main', display: 'flex', mr: 1 }}>{account.icon}</Box>
                    <Typography variant='subtitle1' fontWeight='bold'>
                      {t(account.roleKey)}
                    </Typography>
                    {account.recommended && (
                      <Chip
                        label={t('login.recommendedBadge')}
                        size='small'
                        color='primary'
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                  <Typography variant='body2' color='text.secondary'>
                    {t(account.descriptionKey)}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    display='block'
                    sx={{ mt: 1 }}
                  >
                    {t('login.cnpjPrefix')} {account.cnpj}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' display='block'>
                    {t('login.emailPrefix')} {account.email} &nbsp;|&nbsp;{' '}
                    {t('login.passwordPrefix')} {account.password}
                  </Typography>
                  <Button
                    variant={account.recommended ? 'contained' : 'outlined'}
                    size='small'
                    fullWidth
                    disabled={isLoading}
                    onClick={() => handleDemoLogin(account)}
                    sx={{ mt: 1.5 }}
                  >
                    {t('login.accessAs', { role: t(account.roleKey) })}
                  </Button>
                </Box>
              ))}
            </Stack>
          </Box>

          <Divider sx={{ width: '100%', my: 3 }}>
            <Chip label={t('login.title')} size='small' />
          </Divider>

          <Tabs
            value={loginType}
            onChange={(_, newValue) => setLoginType(newValue)}
            centered
            sx={{ mb: 2 }}
          >
            <Tab label={t('login.tabCnpj')} value='cnpj' icon={<Business />} />
            <Tab label={t('login.tabEmail')} value='email' icon={<Email />} />
          </Tabs>

          <Box component='form' onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            {loginType === 'cnpj' ? (
              <TextField
                margin='normal'
                required
                fullWidth
                id='cnpj'
                label={t('login.cnpjLabel')}
                name='cnpj'
                autoComplete='organization'
                value={cnpj}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCnpj(e.target.value)}
                placeholder='00.000.000/0000-00'
                inputProps={{ maxLength: INPUT_LIMITS.cnpj }}
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
                label={t('login.emailLabel')}
                name='email'
                autoComplete='email'
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                inputProps={{ maxLength: INPUT_LIMITS.email }}
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
              label={t('login.passwordLabel')}
              type={showPassword ? 'text' : 'password'}
              id='password'
              autoComplete='current-password'
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              inputProps={{ maxLength: INPUT_LIMITS.password }}
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
              {isLoading ? <CircularProgress size={24} /> : t('login.submit')}
            </Button>
            <Box textAlign='center'>
              <Typography variant='body2' color='text.secondary'>
                {t('login.registerUnavailable')}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
