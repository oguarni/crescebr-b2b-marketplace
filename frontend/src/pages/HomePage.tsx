import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  Rating,
  Collapse,
  IconButton,
  Slider,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  Paper,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Add,
  RequestQuote,
  AdminPanelSettings,
  FilterList,
  ExpandMore,
  ExpandLess,
  Info,
  Speed,
  LocalShipping,
  Inventory,
} from '@mui/icons-material';
import { Product } from '@shared/types';
import { productsService } from '../services/productsService';
import { useCart } from '../contexts/CartContext';
import { useQuotationRequest } from '../contexts/QuotationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Basic Filters
  const [searchInput, setSearchInput] = useState(''); // Immediate input value
  const [searchTerm, setSearchTerm] = useState(''); // Debounced search term for API
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [moqRange, setMoqRange] = useState<[number, number]>([1, 1000]);
  const [maxLeadTime, setMaxLeadTime] = useState(30);
  const [availabilityFilter, setAvailabilityFilter] = useState<string[]>([]);
  const [specsFilter, setSpecsFilter] = useState<{ [key: string]: string }>({});
  const [allSpecs, setAllSpecs] = useState<{ [key: string]: string[] }>({});

  const { addItem } = useCart();
  const { addItem: addToQuotationRequest } = useQuotationRequest();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filters: any = {
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        page,
        limit: 12,
      };

      // Add advanced filters
      if (showAdvancedFilters) {
        filters.minPrice = priceRange[0];
        filters.maxPrice = priceRange[1];
        filters.minMoq = moqRange[0];
        filters.maxMoq = moqRange[1];
        filters.maxLeadTime = maxLeadTime;

        if (availabilityFilter.length > 0) {
          filters.availability = availabilityFilter;
        }

        if (Object.keys(specsFilter).length > 0) {
          filters.specifications = specsFilter;
        }
      }

      const response = await productsService.getAllProducts(filters);

      setProducts(response.products);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    selectedCategory,
    page,
    showAdvancedFilters,
    priceRange,
    moqRange,
    maxLeadTime,
    availabilityFilter,
    specsFilter,
  ]);

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await productsService.getCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, []);

  const loadSpecifications = useCallback(async () => {
    try {
      const specsData = await productsService.getAvailableSpecifications();
      setAllSpecs(specsData);
    } catch (err) {
      console.error('Erro ao carregar especificações:', err);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
    loadSpecifications();
  }, [loadCategories, loadSpecifications]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    selectedCategory,
    priceRange,
    moqRange,
    maxLeadTime,
    availabilityFilter,
    specsFilter,
  ]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPriceRange([0, 50000]);
    setMoqRange([1, 1000]);
    setMaxLeadTime(30);
    setAvailabilityFilter([]);
    setSpecsFilter({});
    setPage(1);
  };

  const handleAvailabilityChange = (availability: string) => {
    setAvailabilityFilter(prev =>
      prev.includes(availability) ? prev.filter(a => a !== availability) : [...prev, availability]
    );
  };

  const handleSpecsChange = (specKey: string, value: string) => {
    setSpecsFilter(prev => ({
      ...prev,
      [specKey]: value,
    }));
  };

  const removeSpecsFilter = (specKey: string) => {
    setSpecsFilter(prev => {
      const newSpecs = { ...prev };
      delete newSpecs[specKey];
      return newSpecs;
    });
  };

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated || user?.role === 'customer') {
      addToQuotationRequest(product);
    } else {
      addItem(product);
    }
  };

  const handleQuotationRequest = (product: Product) => {
    addToQuotationRequest(product);
  };

  const getButtonText = () => {
    if (!isAuthenticated || user?.role === 'customer') {
      return 'Adicionar à Cotação';
    }
    return 'Adicionar ao Carrinho';
  };

  const getButtonIcon = () => {
    if (!isAuthenticated || user?.role === 'customer') {
      return <RequestQuote />;
    }
    return <Add />;
  };

  // Show loading while authentication is being determined
  if (authLoading) {
    return (
      <Container maxWidth='lg'>
        <Box display='flex' justifyContent='center' alignItems='center' minHeight='50vh'>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // If user is admin, show admin-specific content
  if (isAuthenticated && user?.role === 'admin') {
    return (
      <Container maxWidth='lg'>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AdminPanelSettings sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant='h3' component='h1' gutterBottom sx={{ fontWeight: 'bold' }}>
            Painel Administrativo
          </Typography>
          <Typography variant='h6' color='text.secondary' gutterBottom sx={{ mb: 4 }}>
            Bem-vindo ao sistema de administração do Marketplace B2B
          </Typography>
          <Grid container spacing={2} justifyContent='center'>
            <Grid item>
              <Button variant='contained' size='large' onClick={() => navigate('/admin/products')}>
                Gerenciar Produtos
              </Button>
            </Grid>
            <Grid item>
              <Button variant='outlined' size='large' onClick={() => navigate('/admin/quotations')}>
                Gerenciar Cotações
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Container>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };


  return (
    <Container maxWidth='lg'>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant='h3' component='h1' gutterBottom sx={{ fontWeight: 'bold' }}>
          Marketplace B2B
        </Typography>
        <Typography variant='h6' color='text.secondary' gutterBottom>
          {isAuthenticated && user?.role === 'customer'
            ? 'Solicite cotações personalizadas para sua empresa'
            : 'Soluções para pequenas e médias empresas do sudoeste do Paraná'}
        </Typography>
      </Box>

      {/* Filters */}
      <Paper elevation={2} sx={{ mb: 4, p: 3 }}>
        <Grid container spacing={2} alignItems='center'>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder='Buscar produtos, especificações, fornecedores...'
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Categoria Industrial</InputLabel>
              <Select
                value={selectedCategory}
                label='Categoria Industrial'
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <MenuItem value=''>Todas as categorias</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant='outlined'
              startIcon={<FilterList />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              color={showAdvancedFilters ? 'primary' : 'inherit'}
            >
              Filtros
              {showAdvancedFilters ? <ExpandLess /> : <ExpandMore />}
            </Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant='outlined' onClick={handleClearFilters}>
              Limpar
            </Button>
          </Grid>
        </Grid>

        {/* Advanced Filters Panel */}
        <Collapse in={showAdvancedFilters}>
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography
              variant='h6'
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <FilterList /> Filtros Avançados
            </Typography>

            <Grid container spacing={3}>
              {/* Price Range */}
              <Grid item xs={12} md={6}>
                <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Speed color='primary' fontSize='small' /> Faixa de Preço
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={priceRange}
                    onChange={(_, newValue) => setPriceRange(newValue as [number, number])}
                    valueLabelDisplay='auto'
                    min={0}
                    max={50000}
                    step={500}
                    valueLabelFormat={value => `R$ ${value.toLocaleString()}`}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant='caption'>R$ {priceRange[0].toLocaleString()}</Typography>
                    <Typography variant='caption'>R$ {priceRange[1].toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Grid>

              {/* MOQ Range */}
              <Grid item xs={12} md={6}>
                <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory color='primary' fontSize='small' /> Quantidade Mínima (MOQ)
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={moqRange}
                    onChange={(_, newValue) => setMoqRange(newValue as [number, number])}
                    valueLabelDisplay='auto'
                    min={1}
                    max={1000}
                    step={10}
                    valueLabelFormat={value => `${value} unidades`}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant='caption'>{moqRange[0]} unidades</Typography>
                    <Typography variant='caption'>{moqRange[1]} unidades</Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Lead Time */}
              <Grid item xs={12} md={6}>
                <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalShipping color='primary' fontSize='small' /> Prazo Máximo de Entrega
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={maxLeadTime}
                    onChange={(_, newValue) => setMaxLeadTime(newValue as number)}
                    valueLabelDisplay='auto'
                    min={1}
                    max={90}
                    step={1}
                    valueLabelFormat={value => `${value} dias`}
                  />
                  <Typography variant='caption' sx={{ mt: 1, display: 'block' }}>
                    Até {maxLeadTime} dias
                  </Typography>
                </Box>
              </Grid>

              {/* Availability Status */}
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Status de Disponibilidade</Typography>
                <Box>
                  {['in_stock', 'limited', 'custom_order'].map(status => (
                    <FormControlLabel
                      key={status}
                      control={
                        <Checkbox
                          checked={availabilityFilter.includes(status)}
                          onChange={() => handleAvailabilityChange(status)}
                        />
                      }
                      label={
                        status === 'in_stock'
                          ? 'Em Estoque'
                          : status === 'limited'
                            ? 'Limitado'
                            : 'Sob Encomenda'
                      }
                    />
                  ))}
                </Box>
              </Grid>

              {/* Technical Specifications */}
              <Grid item xs={12}>
                <Typography gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info color='primary' fontSize='small' /> Especificações Técnicas
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(allSpecs).map(([specKey, values]) => (
                    <Grid item xs={12} sm={6} md={4} key={specKey}>
                      <Autocomplete
                        size='small'
                        options={values}
                        value={specsFilter[specKey] || null}
                        onChange={(_, newValue) => {
                          if (newValue) {
                            handleSpecsChange(specKey, newValue);
                          } else {
                            removeSpecsFilter(specKey);
                          }
                        }}
                        renderInput={params => (
                          <TextField
                            {...params}
                            label={specKey.charAt(0).toUpperCase() + specKey.slice(1)}
                            placeholder={`Selecionar ${specKey}`}
                          />
                        )}
                      />
                    </Grid>
                  ))}
                </Grid>

                {/* Active Specs Filters */}
                {Object.keys(specsFilter).length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant='caption' color='text.secondary'>
                      Filtros ativos:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {Object.entries(specsFilter).map(([key, value]) => (
                        <Chip
                          key={key}
                          label={`${key}: ${value}`}
                          onDelete={() => removeSpecsFilter(key)}
                          size='small'
                          color='primary'
                          variant='outlined'
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box display='flex' justifyContent='center' py={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : products.length === 0 ? (
        <Box textAlign='center' py={4}>
          <Typography variant='h6' color='text.secondary'>
            Nenhum produto encontrado
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Tente ajustar os filtros de busca
          </Typography>
        </Box>
      ) : (
        <>
          {/* Products Grid */}
          <Grid container spacing={3}>
            {products.map(product => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card
                  className='card-hover'
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <CardMedia
                    component='img'
                    height='200'
                    image={product.imageUrl}
                    alt={product.name}
                    sx={{ objectFit: 'cover' }}
                    onError={e => {
                      e.currentTarget.src =
                        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDAgNjBMMTQwIDEwMEgxMjBWMTQwSDgwVjEwMEg2MEwxMDAgNjBaIiBmaWxsPSIjOTA5MDkwIi8+CjwvdHZnPgo=';
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ mb: 1 }}>
                      <Chip
                        label={product.category}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    </Box>
                    <Typography variant='h6' component='h3' gutterBottom noWrap>
                      {product.name}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {product.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant='body2' color='text.secondary'>
                        No ratings yet
                      </Typography>
                    </Box>
                    <Typography variant='h5' color='primary' fontWeight='bold'>
                      {formatPrice(product.price)}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant='contained'
                      startIcon={getButtonIcon()}
                      onClick={() => handleAddToCart(product)}
                    >
                      {getButtonText()}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display='flex' justifyContent='center' mt={4}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color='primary'
                size='large'
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default HomePage;
