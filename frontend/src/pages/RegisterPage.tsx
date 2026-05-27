import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Home,
  Business,
  Category,
} from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { viaCepService } from '../services/viaCepService';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    cep: '',
    address: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    contactPerson: '',
    contactTitle: '',
    companySize: '' as 'micro' | 'small' | 'medium' | 'large' | 'enterprise' | '',
    annualRevenue: '' as
      | 'under_500k'
      | '500k_2m'
      | '2m_10m'
      | '10m_50m'
      | '50m_200m'
      | 'over_200m'
      | '',
    website: '',
    companyName: '',
    corporateName: '',
    cnpj: '',
    industrySector: '',
    companyType: 'buyer' as 'buyer' | 'supplier' | 'both',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const { register } = useAuth();
  const t = useT();
  const navigate = useNavigate();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const formatCpf = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatCnpj = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 14) {
      return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setFormData(prev => ({ ...prev, cpf: formatted }));
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    setFormData(prev => ({ ...prev, cnpj: formatted }));
  };

  const handleCepChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const cep = e.target.value.replace(/\D/g, '');
      const formattedCep = viaCepService.formatCep(cep);

      setFormData(prev => ({ ...prev, cep: formattedCep }));

      if (viaCepService.isValidCep(cep)) {
        setIsLoadingCep(true);
        try {
          const addressData = await viaCepService.getAddressByCep(cep);
          const fullAddress = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade} - ${addressData.uf}`;
          setFormData(prev => ({
            ...prev,
            address: fullAddress,
            street: addressData.logradouro || '',
            neighborhood: addressData.bairro || '',
            city: addressData.localidade || '',
            state: addressData.uf || '',
            zipCode: viaCepService.formatCep(cep),
          }));
          toast.success(t('register.toast.cepSuccess'));
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : t('register.toast.cepError'));
        } finally {
          setIsLoadingCep(false);
        }
      }
    },
    [t]
  );

  const validateForm = (): boolean => {
    if (formData.password !== formData.confirmPassword) {
      setError(t('register.validation.passwordsDontMatch'));
      return false;
    }

    if (formData.password.length < 6) {
      setError(t('register.validation.passwordTooShort'));
      return false;
    }

    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError(t('register.validation.cpfInvalid'));
      return false;
    }

    const cleanCnpj = formData.cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setError(t('register.validation.cnpjInvalid'));
      return false;
    }

    if (!formData.address.trim()) {
      setError(t('register.validation.addressRequired'));
      return false;
    }

    if (!formData.companyName.trim()) {
      setError(t('register.validation.companyNameRequired'));
      return false;
    }

    if (!formData.corporateName.trim()) {
      setError(t('register.validation.corporateNameRequired'));
      return false;
    }

    if (!formData.industrySector.trim()) {
      setError(t('register.validation.industrySectorRequired'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        cpf: formData.cpf,
        address: formData.address,
        street: formData.street,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        phone: formData.phone,
        contactPerson: formData.contactPerson,
        contactTitle: formData.contactTitle,
        companySize: formData.companySize || undefined,
        annualRevenue: formData.annualRevenue || undefined,
        website: formData.website,
        companyName: formData.companyName,
        corporateName: formData.corporateName,
        cnpj: formData.cnpj,
        industrySector: formData.industrySector,
        companyType: formData.companyType,
      });
      toast.success(t('register.toast.success'));
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage =
        axiosErr.response?.data?.error || axiosErr.message || t('register.toast.error');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component='main' maxWidth='md'>
      <Box
        sx={{
          marginTop: 4,
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
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <LanguageSwitcher />
          </Box>
          <Typography component='h1' variant='h4' gutterBottom>
            CresceBR
          </Typography>
          <Typography component='h2' variant='h6' color='text.secondary' gutterBottom>
            {t('register.subtitle')}
          </Typography>

          {error && (
            <Alert severity='error' sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component='form' onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  required
                  fullWidth
                  id='email'
                  label={t('register.email')}
                  name='email'
                  autoComplete='email'
                  value={formData.email}
                  onChange={handleChange('email')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  name='password'
                  label={t('register.password')}
                  type={showPassword ? 'text' : 'password'}
                  id='password'
                  autoComplete='new-password'
                  value={formData.password}
                  onChange={handleChange('password')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge='end'>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  name='confirmPassword'
                  label={t('register.confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id='confirmPassword'
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge='end'
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id='cpf'
                  label={t('register.cpf')}
                  name='cpf'
                  value={formData.cpf}
                  onChange={handleCpfChange}
                  placeholder='000.000.000-00'
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id='cep'
                  label={t('register.cep')}
                  name='cep'
                  value={formData.cep}
                  onChange={handleCepChange}
                  placeholder='00000-000'
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Home />
                      </InputAdornment>
                    ),
                    endAdornment: isLoadingCep && (
                      <InputAdornment position='end'>
                        <CircularProgress size={20} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  required
                  fullWidth
                  id='address'
                  label={t('register.addressFull')}
                  name='address'
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={handleChange('address')}
                  placeholder={t('register.addressPlaceholder')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Home />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  id='street'
                  label={t('register.street')}
                  name='street'
                  value={formData.street}
                  onChange={handleChange('street')}
                  placeholder={t('register.streetPlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  id='number'
                  label={t('register.number')}
                  name='number'
                  value={formData.number}
                  onChange={handleChange('number')}
                  placeholder={t('register.numberPlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id='complement'
                  label={t('register.complement')}
                  name='complement'
                  value={formData.complement}
                  onChange={handleChange('complement')}
                  placeholder={t('register.complementPlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id='neighborhood'
                  label={t('register.neighborhood')}
                  name='neighborhood'
                  value={formData.neighborhood}
                  onChange={handleChange('neighborhood')}
                  placeholder={t('register.neighborhoodPlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id='city'
                  label={t('register.city')}
                  name='city'
                  value={formData.city}
                  onChange={handleChange('city')}
                  placeholder={t('register.cityPlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id='state'
                  label={t('register.state')}
                  name='state'
                  value={formData.state}
                  onChange={handleChange('state')}
                  placeholder={t('register.statePlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id='phone'
                  label={t('register.phone')}
                  name='phone'
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder={t('register.phonePlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id='website'
                  label={t('register.website')}
                  name='website'
                  value={formData.website}
                  onChange={handleChange('website')}
                  placeholder={t('register.websitePlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id='companyName'
                  label={t('register.companyName')}
                  name='companyName'
                  value={formData.companyName}
                  onChange={handleChange('companyName')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Business />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id='corporateName'
                  label={t('register.corporateName')}
                  name='corporateName'
                  value={formData.corporateName}
                  onChange={handleChange('corporateName')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Business />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id='cnpj'
                  label={t('register.cnpj')}
                  name='cnpj'
                  value={formData.cnpj}
                  onChange={handleCnpjChange}
                  placeholder='00.000.000/0000-00'
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Business />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id='contactPerson'
                  label={t('register.contactPerson')}
                  name='contactPerson'
                  value={formData.contactPerson}
                  onChange={handleChange('contactPerson')}
                  placeholder={t('register.contactPersonPlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  id='contactTitle'
                  label={t('register.contactTitle')}
                  name='contactTitle'
                  value={formData.contactTitle}
                  onChange={handleChange('contactTitle')}
                  placeholder={t('register.contactTitlePlaceholder')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='companySize-label'>{t('register.companySize.label')}</InputLabel>
                  <Select
                    labelId='companySize-label'
                    id='companySize'
                    value={formData.companySize}
                    label={t('register.companySize.label')}
                    onChange={(e: SelectChangeEvent<string>) =>
                      setFormData(prev => ({
                        ...prev,
                        companySize: e.target.value as typeof prev.companySize,
                      }))
                    }
                  >
                    <MenuItem value='micro'>{t('register.companySize.micro')}</MenuItem>
                    <MenuItem value='small'>{t('register.companySize.small')}</MenuItem>
                    <MenuItem value='medium'>{t('register.companySize.medium')}</MenuItem>
                    <MenuItem value='large'>{t('register.companySize.large')}</MenuItem>
                    <MenuItem value='enterprise'>{t('register.companySize.enterprise')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='annualRevenue-label'>
                    {t('register.annualRevenue.label')}
                  </InputLabel>
                  <Select
                    labelId='annualRevenue-label'
                    id='annualRevenue'
                    value={formData.annualRevenue}
                    label={t('register.annualRevenue.label')}
                    onChange={(e: SelectChangeEvent<string>) =>
                      setFormData(prev => ({
                        ...prev,
                        annualRevenue: e.target.value as typeof prev.annualRevenue,
                      }))
                    }
                  >
                    <MenuItem value='under_500k'>{t('register.annualRevenue.under_500k')}</MenuItem>
                    <MenuItem value='500k_2m'>{t('register.annualRevenue.500k_2m')}</MenuItem>
                    <MenuItem value='2m_10m'>{t('register.annualRevenue.2m_10m')}</MenuItem>
                    <MenuItem value='10m_50m'>{t('register.annualRevenue.10m_50m')}</MenuItem>
                    <MenuItem value='50m_200m'>{t('register.annualRevenue.50m_200m')}</MenuItem>
                    <MenuItem value='over_200m'>{t('register.annualRevenue.over_200m')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel id='industrySector-label'>{t('register.industry.label')}</InputLabel>
                  <Select
                    labelId='industrySector-label'
                    id='industrySector'
                    value={formData.industrySector}
                    label={t('register.industry.label')}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, industrySector: e.target.value }))
                    }
                    startAdornment={
                      <InputAdornment position='start'>
                        <Category />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value='machinery'>{t('register.industry.machinery')}</MenuItem>
                    <MenuItem value='raw_materials'>
                      {t('register.industry.raw_materials')}
                    </MenuItem>
                    <MenuItem value='components'>{t('register.industry.components')}</MenuItem>
                    <MenuItem value='electronics'>{t('register.industry.electronics')}</MenuItem>
                    <MenuItem value='textiles'>{t('register.industry.textiles')}</MenuItem>
                    <MenuItem value='chemicals'>{t('register.industry.chemicals')}</MenuItem>
                    <MenuItem value='automotive'>{t('register.industry.automotive')}</MenuItem>
                    <MenuItem value='food_beverage'>
                      {t('register.industry.food_beverage')}
                    </MenuItem>
                    <MenuItem value='construction'>{t('register.industry.construction')}</MenuItem>
                    <MenuItem value='pharmaceutical'>
                      {t('register.industry.pharmaceutical')}
                    </MenuItem>
                    <MenuItem value='other'>{t('register.industry.other')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel id='companyType-label'>{t('register.companyType.label')}</InputLabel>
                  <Select
                    labelId='companyType-label'
                    id='companyType'
                    value={formData.companyType}
                    label={t('register.companyType.label')}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        companyType: e.target.value as 'buyer' | 'supplier' | 'both',
                      }))
                    }
                    startAdornment={
                      <InputAdornment position='start'>
                        <Business />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value='buyer'>{t('register.companyType.buyer')}</MenuItem>
                    <MenuItem value='supplier'>{t('register.companyType.supplier')}</MenuItem>
                    <MenuItem value='both'>{t('register.companyType.both')}</MenuItem>
                  </Select>
                  <FormHelperText>{t('register.companyType.help')}</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>

            <Button
              type='submit'
              fullWidth
              variant='contained'
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : t('register.submit')}
            </Button>

            <Box textAlign='center'>
              <Typography variant='body2'>
                {t('register.haveAccount')}
                <Link to='/login' style={{ color: 'inherit', textDecoration: 'underline' }}>
                  {t('register.loginCta')}
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;
