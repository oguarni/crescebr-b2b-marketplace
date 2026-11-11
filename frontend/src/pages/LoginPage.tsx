import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import { ShoppingCart, Storefront, AdminPanelSettings, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import type { TranslationKey } from '../locales';
import toast from 'react-hot-toast';

type DemoRole = 'buyer' | 'supplier' | 'admin';

interface DemoAccount {
  role: DemoRole;
  roleKey: TranslationKey;
  descriptionKey: TranslationKey;
  company: string;
  cnpj: string;
  password: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

// Fictional companies seeded in the database (backend/seeders) and in the
// browser demo's generated data. Credentials are public on purpose: this is a
// portfolio demo, and these three accounts are the only way in — there is no
// manual sign-in form and no public sign-up.
const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'buyer',
    roleKey: 'login.demoRoleBuyer',
    company: 'Buyer Corp',
    cnpj: '33.333.333/0001-33',
    password: 'buyer123',
    icon: <ShoppingCart />,
    descriptionKey: 'login.demoDescBuyer',
    recommended: true,
  },
  {
    role: 'supplier',
    roleKey: 'login.demoRoleSupplier',
    company: 'Industrial Solutions',
    cnpj: '22.222.222/0001-22',
    password: 'supplier123',
    icon: <Storefront />,
    descriptionKey: 'login.demoDescSupplier',
  },
  {
    role: 'admin',
    roleKey: 'login.demoRoleAdmin',
    company: 'CresceBR Admin',
    cnpj: '00.000.000/0001-00',
    password: 'admin123',
    icon: <AdminPanelSettings />,
    descriptionKey: 'login.demoDescAdmin',
  },
];

const LoginPage: React.FC = () => {
  const [pendingRole, setPendingRole] = useState<DemoRole | null>(null);

  const { login } = useAuth();
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

  const handleDemoLogin = async (account: DemoAccount) => {
    setPendingRole(account.role);

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
      setPendingRole(null);
    }
  };

  return (
    <Container component='main' maxWidth='sm'>
      <Box
        sx={{
          marginTop: { xs: 4, sm: 8 },
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: { xs: 2.5, sm: 4 },
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

          <Box sx={{ width: '100%', mt: 2 }}>
            <Divider sx={{ mb: 2 }}>
              <Chip label={t('login.demoTitle')} size='small' />
            </Divider>

            <Typography variant='h5' component='h1' align='center' sx={{ fontWeight: 700, mb: 1 }}>
              {t('login.title')}
            </Typography>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                    <Box sx={{ color: 'primary.main', display: 'flex', mr: 1 }}>{account.icon}</Box>
                    <Typography variant='subtitle1' component='h2' fontWeight='bold'>
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
                    {account.company} · {t('login.cnpjPrefix')} {account.cnpj}
                  </Typography>
                  <Button
                    id={`demo-login-${account.role}`}
                    variant={account.recommended ? 'contained' : 'outlined'}
                    size='small'
                    fullWidth
                    disabled={pendingRole !== null}
                    onClick={() => handleDemoLogin(account)}
                    sx={{ mt: 1.5 }}
                  >
                    {pendingRole === account.role ? (
                      <CircularProgress
                        size={20}
                        color='inherit'
                        aria-label={t('common.loading')}
                      />
                    ) : (
                      t('login.accessAs', { role: t(account.roleKey) })
                    )}
                  </Button>
                </Box>
              ))}
            </Stack>

            <Typography
              variant='caption'
              color='text.secondary'
              align='center'
              display='block'
              sx={{ mt: 2 }}
            >
              {t('login.demoOnlyNote')}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
