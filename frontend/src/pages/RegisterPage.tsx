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

  const handleCepChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        toast.success('Endereço preenchido automaticamente!');
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Erro ao buscar endereço');
      } finally {
        setIsLoadingCep(false);
      }
    }
  }, []);

  const validateForm = (): boolean => {
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError('CPF deve conter 11 dígitos');
      return false;
    }

    const cleanCnpj = formData.cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setError('CNPJ deve conter 14 dígitos');
      return false;
    }

    if (!formData.address.trim()) {
      setError('Endereço é obrigatório');
      return false;
    }

    if (!formData.companyName.trim()) {
      setError('Nome da empresa é obrigatório');
      return false;
    }

    if (!formData.corporateName.trim()) {
      setError('Razão social é obrigatória');
      return false;
    }

    if (!formData.industrySector.trim()) {
      setError('Setor da indústria é obrigatório');
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
      toast.success('Empresa cadastrada com sucesso!');
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosErr.response?.data?.error || axiosErr.message || 'Erro ao fazer cadastro';
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
          <Typography component='h1' variant='h4' gutterBottom>
            CresceBR
          </Typography>
          <Typography component='h2' variant='h6' color='text.secondary' gutterBottom>
            Cadastro Empresarial - B2B
          </Typography>

          {error && (
            <Alert severity='error' sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component='form' onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id='email'
                  label='Email'
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

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name='password'
                  label='Senha'
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

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name='confirmPassword'
                  label='Confirmar Senha'
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

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id='cpf'
                  label='CPF'
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

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id='cep'
                  label='CEP'
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

              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id='address'
                  label='Endereço Completo'
                  name='address'
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={handleChange('address')}
                  placeholder='Rua, número, bairro, cidade - UF'
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Home />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  id='street'
                  label='Logradouro'
                  name='street'
                  value={formData.street}
                  onChange={handleChange('street')}
                  placeholder='Nome da rua'
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  id='number'
                  label='Número'
                  name='number'
                  value={formData.number}
                  onChange={handleChange('number')}
                  placeholder='123'
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id='complement'
                  label='Complemento'
                  name='complement'
                  value={formData.complement}
                  onChange={handleChange('complement')}
                  placeholder='Apto, sala, etc.'
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id='neighborhood'
                  label='Bairro'
                  name='neighborhood'
                  value={formData.neighborhood}
                  onChange={handleChange('neighborhood')}
                  placeholder='Bairro'
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id='city'
                  label='Cidade'
                  name='city'
                  value={formData.city}
                  onChange={handleChange('city')}
                  placeholder='Cidade'
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id='state'
                  label='Estado'
                  name='state'
                  value={formData.state}
                  onChange={handleChange('state')}
                  placeholder='PR'
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id='phone'
                  label='Telefone'
                  name='phone'
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder='(11) 9999-9999'
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id='website'
                  label='Website'
                  name='website'
                  value={formData.website}
                  onChange={handleChange('website')}
                  placeholder='https://www.empresa.com.br'
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id='companyName'
                  label='Nome da Empresa'
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

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id='corporateName'
                  label='Razão Social'
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

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id='cnpj'
                  label='CNPJ'
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

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id='contactPerson'
                  label='Pessoa de Contato'
                  name='contactPerson'
                  value={formData.contactPerson}
                  onChange={handleChange('contactPerson')}
                  placeholder='Nome do responsável'
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id='contactTitle'
                  label='Cargo do Contato'
                  name='contactTitle'
                  value={formData.contactTitle}
                  onChange={handleChange('contactTitle')}
                  placeholder='Gerente, Diretor, etc.'
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id='companySize-label'>Porte da Empresa</InputLabel>
                  <Select
                    labelId='companySize-label'
                    id='companySize'
                    value={formData.companySize}
                    label='Porte da Empresa'
                    onChange={(e: SelectChangeEvent<string>) =>
                      setFormData(prev => ({
                        ...prev,
                        companySize: e.target.value as typeof prev.companySize,
                      }))
                    }
                  >
                    <MenuItem value='micro'>Microempresa</MenuItem>
                    <MenuItem value='small'>Pequena</MenuItem>
                    <MenuItem value='medium'>Média</MenuItem>
                    <MenuItem value='large'>Grande</MenuItem>
                    <MenuItem value='enterprise'>Corporação</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id='annualRevenue-label'>Faturamento Anual</InputLabel>
                  <Select
                    labelId='annualRevenue-label'
                    id='annualRevenue'
                    value={formData.annualRevenue}
                    label='Faturamento Anual'
                    onChange={(e: SelectChangeEvent<string>) =>
                      setFormData(prev => ({
                        ...prev,
                        annualRevenue: e.target.value as typeof prev.annualRevenue,
                      }))
                    }
                  >
                    <MenuItem value='under_500k'>Até R$ 500.000</MenuItem>
                    <MenuItem value='500k_2m'>R$ 500.000 - R$ 2 milhões</MenuItem>
                    <MenuItem value='2m_10m'>R$ 2 milhões - R$ 10 milhões</MenuItem>
                    <MenuItem value='10m_50m'>R$ 10 milhões - R$ 50 milhões</MenuItem>
                    <MenuItem value='50m_200m'>R$ 50 milhões - R$ 200 milhões</MenuItem>
                    <MenuItem value='over_200m'>Acima de R$ 200 milhões</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel id='industrySector-label'>Setor da Indústria</InputLabel>
                  <Select
                    labelId='industrySector-label'
                    id='industrySector'
                    value={formData.industrySector}
                    label='Setor da Indústria'
                    onChange={e =>
                      setFormData(prev => ({ ...prev, industrySector: e.target.value }))
                    }
                    startAdornment={
                      <InputAdornment position='start'>
                        <Category />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value='machinery'>Máquinas</MenuItem>
                    <MenuItem value='raw_materials'>Matérias-primas</MenuItem>
                    <MenuItem value='components'>Componentes</MenuItem>
                    <MenuItem value='electronics'>Eletrônicos</MenuItem>
                    <MenuItem value='textiles'>Têxteis</MenuItem>
                    <MenuItem value='chemicals'>Químicos</MenuItem>
                    <MenuItem value='automotive'>Automotivo</MenuItem>
                    <MenuItem value='food_beverage'>Alimentos e Bebidas</MenuItem>
                    <MenuItem value='construction'>Construção</MenuItem>
                    <MenuItem value='pharmaceutical'>Farmacêutico</MenuItem>
                    <MenuItem value='other'>Outros</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id='companyType-label'>Tipo de Empresa</InputLabel>
                  <Select
                    labelId='companyType-label'
                    id='companyType'
                    value={formData.companyType}
                    label='Tipo de Empresa'
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
                    <MenuItem value='buyer'>Comprador</MenuItem>
                    <MenuItem value='supplier'>Fornecedor</MenuItem>
                    <MenuItem value='both'>Ambos</MenuItem>
                  </Select>
                  <FormHelperText>
                    Compradores podem solicitar cotações. Fornecedores podem vender produtos.
                  </FormHelperText>
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
              {isLoading ? <CircularProgress size={24} /> : 'Cadastrar'}
            </Button>

            <Box textAlign='center'>
              <Typography variant='body2'>
                Já tem uma conta?{' '}
                <Link to='/login' style={{ color: 'inherit', textDecoration: 'underline' }}>
                  Faça login
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
