import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Badge,
  Pagination,
  Collapse,
  Slider,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  TextField,
  Paper,
} from '@mui/material';
import {
  Search,
  Tune,
  ShoppingBagOutlined,
  FilterList,
  GridViewOutlined,
  RequestQuoteOutlined,
  LocalShippingOutlined,
  PersonOutlined,
  AdminPanelSettings,
  Speed,
  Inventory,
  Info,
} from '@mui/icons-material';

import { Product } from '@shared/types';
import { productsService } from '../services/productsService';
import { formatBRL } from '../utils/currency';
import ProductCard from '../components/ProductCard';
import { useCart } from '../contexts/CartContext';
import { useQuotationRequest } from '../contexts/QuotationContext';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Only one product card is expanded at a time; clicking another collapses the
  // previous one, and clicking outside collapses the open card.
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [moqRange, setMoqRange] = useState<[number, number]>([1, 1000]);
  const [maxLeadTime, setMaxLeadTime] = useState(30);
  const [availabilityFilter, setAvailabilityFilter] = useState<string[]>([]);
  const [specsFilter, setSpecsFilter] = useState<{ [key: string]: string }>({});
  const [allSpecs, setAllSpecs] = useState<{ [key: string]: string[] }>({});

  const { items: cartItems } = useCart();
  const { addItem: addToQuotationRequest } = useQuotationRequest();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const t = useT();
  const navigate = useNavigate();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filters: Record<string, unknown> = {
        search: searchTerm || undefined,
        category: selectedCategory !== 'All Products' ? selectedCategory : undefined,
        page,
        limit: 12,
      };

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
    } catch (err) {
      setError(err instanceof Error ? err.message : t('home.loadError'));
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
    t,
  ]);

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await productsService.getCategories();
      setCategories(['All Products', ...categoriesData]);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadSpecifications = useCallback(async () => {
    try {
      const specsData = await productsService.getAvailableSpecifications();
      setAllSpecs(specsData);
    } catch (err) {
      console.error('Erro ao carregar especificações:', err);
    }
  }, []);

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
    setSearchInput('');
    setSelectedCategory('All Products');
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
    // Buyers and visitors build a quotation request. Suppliers cannot purchase,
    // so the action is hidden for them on the card (see `showAddToCart` below).
    addToQuotationRequest(product);
  };

  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If user is admin, show admin-specific content
  if (isAuthenticated && user?.role === 'admin') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          pb: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 8,
        }}
      >
        <Box sx={{ p: 4, textAlign: 'center', maxWidth: 600 }}>
          <AdminPanelSettings sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant='h4' component='h1' gutterBottom sx={{ fontWeight: 'bold' }}>
            {t('home.adminDashboard')}
          </Typography>
          <Typography variant='body1' color='text.secondary' gutterBottom sx={{ mb: 4 }}>
            {t('home.adminWelcome')}
          </Typography>
          <Grid container spacing={2} justifyContent='center'>
            <Grid item>
              <Button variant='contained' size='large' onClick={() => navigate('/admin/products')}>
                {t('home.manageProducts')}
              </Button>
            </Grid>
            <Grid item>
              <Button variant='outlined' size='large' onClick={() => navigate('/admin/quotations')}>
                {t('home.manageQuotations')}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        pb: 10,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        component='header'
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, position: 'relative' }}>
            <Search
              sx={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'text.secondary',
                fontSize: 20,
                zIndex: 1,
              }}
            />
            <InputBase
              fullWidth
              placeholder={t('home.searchPlaceholder')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              sx={{
                bgcolor: 'grey.100',
                borderRadius: 2,
                py: 0.75,
                pl: 5,
                pr: 2,
                fontSize: '0.875rem',
                '&.Mui-focused': { boxShadow: 'inset 0 0 0 2px #0446B7' },
              }}
            />
          </Box>
          <IconButton
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            aria-label={t('home.advancedFilters')}
            sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 1, '&:hover': { bgcolor: 'grey.200' } }}
          >
            <Badge
              color={showAdvancedFilters ? 'primary' : 'default'}
              variant='dot'
              sx={{ '& .MuiBadge-badge': { right: 2, top: 2 } }}
            >
              <Tune sx={{ fontSize: 20, color: 'text.secondary' }} />
            </Badge>
          </IconButton>
          <IconButton
            onClick={() => navigate('/cart')}
            aria-label={t('home.cartAria')}
            sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 1, '&:hover': { bgcolor: 'grey.200' } }}
          >
            <Badge
              badgeContent={cartItems.length}
              color='error'
              sx={{ '& .MuiBadge-badge': { fontSize: '0.625rem', height: 16, minWidth: 16 } }}
            >
              <ShoppingBagOutlined sx={{ fontSize: 20, color: 'text.secondary' }} />
            </Badge>
          </IconButton>
        </Box>

        {/* Categories Scroller */}
        <Box
          sx={{
            px: 2,
            pb: 1.5,
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {categories.length > 0
            ? categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'contained' : 'outlined'}
                  onClick={() => setSelectedCategory(category)}
                  sx={{
                    borderRadius: 4,
                    px: 2,
                    py: 0.5,
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    boxShadow: selectedCategory === category ? 1 : 0,
                    bgcolor: selectedCategory === category ? 'primary.main' : 'background.paper',
                    color:
                      selectedCategory === category ? 'primary.contrastText' : 'text.secondary',
                    borderColor: selectedCategory === category ? 'primary.main' : 'divider',
                    '&:hover': {
                      bgcolor: selectedCategory === category ? 'primary.dark' : 'background.paper',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  {category === 'All Products' ? t('home.allProducts') : category}
                </Button>
              ))
            : // Fallback mock categories if API fails or is empty
              [
                'All Products',
                'Machinery',
                'Safety Gear',
                'Hydraulics',
                'Electrical',
                'Raw Materials',
              ].map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'contained' : 'outlined'}
                  onClick={() => setSelectedCategory(cat)}
                  sx={{
                    borderRadius: 4,
                    px: 2,
                    py: 0.5,
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    boxShadow: selectedCategory === cat ? 1 : 0,
                    bgcolor: selectedCategory === cat ? 'primary.main' : 'background.paper',
                    color: selectedCategory === cat ? 'primary.contrastText' : 'text.secondary',
                    borderColor: selectedCategory === cat ? 'primary.main' : 'divider',
                    '&:hover': {
                      bgcolor: selectedCategory === cat ? 'primary.dark' : 'background.paper',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  {cat === 'All Products' ? t('home.allProducts') : cat}
                </Button>
              ))}
        </Box>
      </Box>

      {/* Advanced Filters Panel */}
      <Collapse in={showAdvancedFilters}>
        <Paper
          elevation={0}
          sx={{
            m: 2,
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'grey.50',
          }}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <FilterList fontSize='small' /> {t('home.advancedFilters')}
            </Typography>
            <Button size='small' onClick={handleClearFilters}>
              {t('home.clearAll')}
            </Button>
          </Box>

          <Grid container spacing={3}>
            {/* Price Range */}
            <Grid item xs={12} md={6}>
              <Typography
                variant='caption'
                sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500, mb: 1 }}
              >
                <Speed color='primary' fontSize='small' /> {t('home.priceRange')}
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={priceRange}
                  onChange={(_, newValue) => setPriceRange(newValue as [number, number])}
                  valueLabelDisplay='auto'
                  min={0}
                  max={50000}
                  step={500}
                  valueLabelFormat={value => formatBRL(value)}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption'>{formatBRL(priceRange[0])}</Typography>
                  <Typography variant='caption'>{formatBRL(priceRange[1])}</Typography>
                </Box>
              </Box>
            </Grid>

            {/* MOQ Range */}
            <Grid item xs={12} md={6}>
              <Typography
                variant='caption'
                sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500, mb: 1 }}
              >
                <Inventory color='primary' fontSize='small' /> {t('home.moq')}
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={moqRange}
                  onChange={(_, newValue) => setMoqRange(newValue as [number, number])}
                  valueLabelDisplay='auto'
                  min={1}
                  max={1000}
                  step={10}
                  valueLabelFormat={value => `${value} ${t('home.units')}`}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption'>
                    {moqRange[0]} {t('home.units')}
                  </Typography>
                  <Typography variant='caption'>
                    {moqRange[1]} {t('home.units')}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Lead Time */}
            <Grid item xs={12} md={6}>
              <Typography
                variant='caption'
                sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500, mb: 1 }}
              >
                <LocalShippingOutlined color='primary' fontSize='small' /> {t('home.maxLeadTime')}
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={maxLeadTime}
                  onChange={(_, newValue) => setMaxLeadTime(newValue as number)}
                  valueLabelDisplay='auto'
                  min={1}
                  max={90}
                  step={1}
                  valueLabelFormat={value => `${value} ${t('home.days')}`}
                />
                <Typography variant='caption' sx={{ display: 'block' }}>
                  {t('home.maxLeadTimeValue', { days: maxLeadTime })}
                </Typography>
              </Box>
            </Grid>

            {/* Availability Status */}
            <Grid item xs={12} md={6}>
              <Typography variant='caption' sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                {t('home.availabilityStatus')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {['in_stock', 'limited', 'custom_order'].map(status => (
                  <FormControlLabel
                    key={status}
                    control={
                      <Checkbox
                        size='small'
                        checked={availabilityFilter.includes(status)}
                        onChange={() => handleAvailabilityChange(status)}
                      />
                    }
                    label={
                      <Typography variant='caption'>
                        {status === 'in_stock'
                          ? t('home.inStockOption')
                          : status === 'limited'
                            ? t('home.limitedOption')
                            : t('home.madeToOrderOption')}
                      </Typography>
                    }
                  />
                ))}
              </Box>
            </Grid>

            {/* Technical Specifications */}
            <Grid item xs={12}>
              <Typography
                variant='caption'
                sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500, mb: 1 }}
              >
                <Info color='primary' fontSize='small' /> {t('home.technicalSpecs')}
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
                          placeholder={t('home.selectSpec', { spec: specKey })}
                        />
                      )}
                    />
                  </Grid>
                ))}
              </Grid>

              {/* Active Specs Filters */}
              {Object.keys(specsFilter).length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
              )}
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Main Content Area */}
      <Box component='main' sx={{ p: 2, flex: 1 }}>
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
              {t('home.noProducts')}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {t('home.adjustFilters')}
            </Typography>
          </Box>
        ) : (
          <>
            {/* Responsive product grid: 2 columns on mobile, scaling up on larger
                screens. CSS Grid keeps every card in a row at an equal height. */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: { xs: 1.5, sm: 2 },
                alignItems: 'stretch',
              }}
            >
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  showAddToCart={user?.role !== 'supplier'}
                  expanded={expandedProductId === product.id}
                  onToggleExpand={() =>
                    setExpandedProductId(prev => (prev === product.id ? null : product.id))
                  }
                  onCollapse={() =>
                    setExpandedProductId(prev => (prev === product.id ? null : prev))
                  }
                />
              ))}
            </Box>

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
      </Box>

      {/* Floating Action Button (Mobile Filter) */}
      <IconButton
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        aria-label={t('home.advancedFilters')}
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: 4,
          p: 1.5,
          display: { xs: 'flex', lg: 'none' },
          zIndex: 40,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        <FilterList />
      </IconButton>

      {/* Bottom Navigation */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          zIndex: 50,
          boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              color: 'primary.main',
              cursor: 'pointer',
            }}
          >
            <GridViewOutlined fontSize='small' />
            <Typography variant='caption' sx={{ fontSize: '0.625rem', fontWeight: 500 }}>
              {t('home.catalog')}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' },
            }}
            onClick={() => navigate('/my-quotations')}
          >
            <RequestQuoteOutlined fontSize='small' />
            <Typography variant='caption' sx={{ fontSize: '0.625rem', fontWeight: 500 }}>
              {t('home.quotes')}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' },
            }}
            onClick={() => navigate('/my-orders')}
          >
            <LocalShippingOutlined fontSize='small' />
            <Typography variant='caption' sx={{ fontSize: '0.625rem', fontWeight: 500 }}>
              {t('home.orders')}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' },
            }}
            onClick={() => navigate('/login')}
          >
            <PersonOutlined fontSize='small' />
            <Typography variant='caption' sx={{ fontSize: '0.625rem', fontWeight: 500 }}>
              {t('home.account')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
