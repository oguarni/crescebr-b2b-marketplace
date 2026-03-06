import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Card,
  CardContent,
  CardMedia,
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
  StorefrontOutlined,
  AddShoppingCart,
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
import { useCart } from '../contexts/CartContext';
import { useQuotationRequest } from '../contexts/QuotationContext';
import { useAuth } from '../contexts/AuthContext';
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

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [moqRange, setMoqRange] = useState<[number, number]>([1, 1000]);
  const [maxLeadTime, setMaxLeadTime] = useState(30);
  const [availabilityFilter, setAvailabilityFilter] = useState<string[]>([]);
  const [specsFilter, setSpecsFilter] = useState<{ [key: string]: string }>({});
  const [allSpecs, setAllSpecs] = useState<{ [key: string]: string[] }>({});

  const { items: cartItems, addItem } = useCart();
  const { addItem: addToQuotationRequest } = useQuotationRequest();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filters: any = {
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
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
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
    if (!isAuthenticated || user?.role === 'customer') {
      addToQuotationRequest(product);
    } else {
      addItem(product);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
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
            Admin Dashboard
          </Typography>
          <Typography variant='body1' color='text.secondary' gutterBottom sx={{ mb: 4 }}>
            Welcome to the CresceBR Marketplace Administration System
          </Typography>
          <Grid container spacing={2} justifyContent='center'>
            <Grid item>
              <Button variant='contained' size='large' onClick={() => navigate('/admin/products')}>
                Manage Products
              </Button>
            </Grid>
            <Grid item>
              <Button variant='outlined' size='large' onClick={() => navigate('/admin/quotations')}>
                Manage Quotations
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
              placeholder='Search industrial parts...'
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              sx={{
                bgcolor: 'grey.100',
                borderRadius: 2,
                py: 0.75,
                pl: 5,
                pr: 2,
                fontSize: '0.875rem',
                '&.Mui-focused': { boxShadow: 'inset 0 0 0 2px #1E3A8A' },
              }}
            />
          </Box>
          <IconButton
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
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
                  {category}
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
                  {cat}
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
              <FilterList fontSize='small' /> Advanced Filters
            </Typography>
            <Button size='small' onClick={handleClearFilters}>
              Clear All
            </Button>
          </Box>

          <Grid container spacing={3}>
            {/* Price Range */}
            <Grid item xs={12} md={6}>
              <Typography
                variant='caption'
                sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500, mb: 1 }}
              >
                <Speed color='primary' fontSize='small' /> Price Range
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption'>R$ {priceRange[0].toLocaleString()}</Typography>
                  <Typography variant='caption'>R$ {priceRange[1].toLocaleString()}</Typography>
                </Box>
              </Box>
            </Grid>

            {/* MOQ Range */}
            <Grid item xs={12} md={6}>
              <Typography
                variant='caption'
                sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500, mb: 1 }}
              >
                <Inventory color='primary' fontSize='small' /> Minimum Order (MOQ)
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={moqRange}
                  onChange={(_, newValue) => setMoqRange(newValue as [number, number])}
                  valueLabelDisplay='auto'
                  min={1}
                  max={1000}
                  step={10}
                  valueLabelFormat={value => `${value} units`}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption'>{moqRange[0]} units</Typography>
                  <Typography variant='caption'>{moqRange[1]} units</Typography>
                </Box>
              </Box>
            </Grid>

            {/* Lead Time */}
            <Grid item xs={12} md={6}>
              <Typography
                variant='caption'
                sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500, mb: 1 }}
              >
                <LocalShippingOutlined color='primary' fontSize='small' /> Max Lead Time
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={maxLeadTime}
                  onChange={(_, newValue) => setMaxLeadTime(newValue as number)}
                  valueLabelDisplay='auto'
                  min={1}
                  max={90}
                  step={1}
                  valueLabelFormat={value => `${value} days`}
                />
                <Typography variant='caption' sx={{ display: 'block' }}>
                  Up to {maxLeadTime} days
                </Typography>
              </Box>
            </Grid>

            {/* Availability Status */}
            <Grid item xs={12} md={6}>
              <Typography variant='caption' sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                Availability Status
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
                          ? 'In Stock'
                          : status === 'limited'
                            ? 'Limited'
                            : 'Made to Order'}
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
                <Info color='primary' fontSize='small' /> Technical Specifications
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
                          placeholder={`Select ${specKey}`}
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
              No products found
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Try adjusting your filters
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              {products.map(product => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Card
                    variant='outlined'
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 3,
                      overflow: 'hidden',
                      '&:hover': { boxShadow: 3 },
                      transition: 'box-shadow 0.2s',
                      position: 'relative',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '75%',
                        bgcolor: 'grey.100',
                        overflow: 'hidden',
                      }}
                    >
                      <CardMedia
                        component='img'
                        image={product.imageUrl || 'https://via.placeholder.com/300?text=No+Image'}
                        alt={product.name}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.3s',
                          '&:hover': { transform: 'scale(1.05)' },
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          backdropFilter: 'blur(4px)',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.625rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'text.secondary',
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        SKU-{product.id || Math.floor(Math.random() * 9000) + 1000}
                      </Box>
                      {(product as any).stockQuantity > 0 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bgcolor: 'success.main',
                            color: 'success.contrastText',
                            px: 1,
                            py: 0.5,
                            borderBottomRightRadius: 4,
                            fontSize: '0.625rem',
                            fontWeight: 700,
                          }}
                        >
                          IN STOCK
                        </Box>
                      )}
                    </Box>

                    <CardContent
                      sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}
                    >
                      <Box sx={{ mb: 0.5 }}>
                        <Typography
                          variant='caption'
                          sx={{
                            fontWeight: 700,
                            color: 'primary.main',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontSize: '0.625rem',
                          }}
                        >
                          {product.category || 'Uncategorized'}
                        </Typography>
                      </Box>

                      <Typography
                        variant='subtitle2'
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          lineHeight: 1.2,
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: '2.4em',
                        }}
                      >
                        {product.name}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                        <StorefrontOutlined sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant='caption' color='text.secondary' noWrap>
                          {product.supplierId
                            ? `Supplier ID: ${product.supplierId}`
                            : 'Industrias Brasil Ltda.'}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          mt: 'auto',
                          pt: 1.5,
                          borderTop: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography
                            variant='caption'
                            sx={{ fontSize: '0.625rem', color: 'text.secondary' }}
                          >
                            Unit Price
                          </Typography>
                          <Typography
                            variant='subtitle1'
                            sx={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: 'text.primary',
                              lineHeight: 1,
                            }}
                          >
                            {formatPrice(product.price)}
                          </Typography>
                        </Box>
                        <IconButton
                          onClick={() => handleAddToCart(product)}
                          color='primary'
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            borderRadius: 2,
                            p: 1,
                            boxShadow: 1,
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                        >
                          <AddShoppingCart fontSize='small' />
                        </IconButton>
                      </Box>
                    </CardContent>
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
      </Box>

      {/* Floating Action Button (Mobile Filter) */}
      <IconButton
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
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
              Catalog
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
              Quotes
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
              Orders
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
              Account
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
