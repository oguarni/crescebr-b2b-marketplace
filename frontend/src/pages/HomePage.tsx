import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Button,
  CircularProgress,
  LinearProgress,
  Alert,
  Grid,
  Badge,
  Pagination,
} from '@mui/material';
import {
  Search,
  Tune,
  ShoppingBagOutlined,
  GridViewOutlined,
  RequestQuoteOutlined,
  LocalShippingOutlined,
  PersonOutlined,
  AdminPanelSettings,
} from '@mui/icons-material';

import { Product } from '@shared/types';
import { productsService } from '../services/productsService';
import ProductCard from '../components/ProductCard';
import CatalogFilterDrawer, { CATALOG_FILTERS_ID } from '../components/catalog/CatalogFilterDrawer';
import CatalogResultsBar from '../components/catalog/CatalogResultsBar';
import { useCart } from '../contexts/CartContext';
import { useQuotationRequest } from '../contexts/QuotationContext';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { browserLogger } from '../utils/browserLogger';
import {
  DEFAULT_CATALOG_FILTERS,
  getActiveFilters,
  toProductQuery,
  type ActiveFilter,
  type CatalogFilters,
} from '../utils/catalogFilters';
import { categoryLabel } from '../utils/catalogLabels';

const PAGE_SIZE = 12;

/** Selected-category value of the "all products" chip; never sent to the API. */
const ALL_CATEGORIES = '';

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Only one product card is expanded at a time; clicking another collapses the
  // previous one, and clicking outside collapses the open card.
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  // Advanced filters. Whether the panel is open has no bearing on whether they
  // apply: they used to be sent only while it was open, so closing it silently
  // widened the results while the controls still showed the old selection.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [allSpecs, setAllSpecs] = useState<Record<string, string[]>>({});

  const { items: cartItems } = useCart();
  const { addItem: addToQuotationRequest } = useQuotationRequest();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const t = useT();
  const navigate = useNavigate();

  const activeFilters = useMemo(() => getActiveFilters(filters, t), [filters, t]);

  // The API orders categories by stored value; ordering by the shown label
  // keeps the chips alphabetical in whichever language is active.
  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) =>
        categoryLabel(t, a).localeCompare(categoryLabel(t, b), undefined, { sensitivity: 'base' })
      ),
    [categories, t]
  );

  const productQuery = useMemo(
    () => ({
      search: searchTerm || undefined,
      category: selectedCategory || undefined,
      page,
      limit: PAGE_SIZE,
      ...toProductQuery(filters),
    }),
    [searchTerm, selectedCategory, page, filters]
  );

  useEffect(() => {
    // Typing, a category change and a slider release can each start a request
    // before the previous one answers; only the latest may update the page.
    let current = true;
    setLoading(true);
    setLoadFailed(false);

    productsService
      .getAllProducts(productQuery)
      .then(response => {
        if (!current) return;
        setProducts(response.products);
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      })
      .catch(err => {
        if (!current) return;
        browserLogger.error('Failed to load products', { error: err });
        setLoadFailed(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [productQuery]);

  // A new result set is read from its first row. Without this, a visitor who
  // filtered or changed page from far down the grid stayed at the same offset
  // of a shorter, different list.
  useEffect(() => {
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
  }, [productQuery]);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await productsService.getCategories());
    } catch (err) {
      browserLogger.error('Failed to load categories', { error: err });
    }
  }, []);

  const loadSpecifications = useCallback(async () => {
    try {
      setAllSpecs(await productsService.getAvailableSpecifications());
    } catch (err) {
      browserLogger.error('Failed to load specifications', { error: err });
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadSpecifications();
  }, [loadCategories, loadSpecifications]);

  useEffect(() => {
    if (searchInput === searchTerm) return;
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchTerm]);

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const applyFilters = (next: CatalogFilters) => {
    setFilters(next);
    setPage(1);
  };

  const removeFilter = (filter: ActiveFilter) => applyFilters(filter.clear(filters));

  const hasAnyConstraint =
    Boolean(searchTerm) || selectedCategory !== ALL_CATEGORIES || activeFilters.length > 0;

  const clearEverything = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedCategory(ALL_CATEGORIES);
    applyFilters(DEFAULT_CATALOG_FILTERS);
  };

  // MUI's default pagination labels are English ("Go to page 2").
  const paginationAriaLabel = (type: string, itemPage: number | null, selected: boolean) => {
    switch (type) {
      case 'page':
        return selected
          ? t('home.pagination.current', { page: itemPage ?? page })
          : t('home.pagination.goTo', { page: itemPage ?? page });
      case 'first':
        return t('home.pagination.first');
      case 'last':
        return t('home.pagination.last');
      case 'next':
        return t('home.pagination.next');
      case 'previous':
        return t('home.pagination.previous');
      default:
        return '';
    }
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
            <Grid>
              <Button variant='contained' size='large' onClick={() => navigate('/admin/products')}>
                {t('home.manageProducts')}
              </Button>
            </Grid>
            <Grid>
              <Button variant='outlined' size='large' onClick={() => navigate('/admin/quotations')}>
                {t('home.manageQuotations')}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }

  // The first load, or a load that replaced an empty result, has nothing worth
  // keeping on screen. Any other load keeps the current grid visible and dims
  // it, so the page does not collapse to a spinner and jump on every change.
  const showSpinner = loading && products.length === 0;

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
          // The Navbar AppBar above is sticky as well. At top: 0 this header
          // slid underneath it once the page scrolled, taking the search box
          // and the filter button out of reach. These offsets are the AppBar
          // height: MUI's toolbar heights plus the 1px border from theme.ts.
          top: { xs: 57, sm: 65 },
          '@media (max-width: 599.95px) and (orientation: landscape)': { top: 49 },
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
              inputProps={{ 'aria-label': t('home.searchPlaceholder'), type: 'search' }}
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
            id='catalog-filter-button'
            onClick={() => setFiltersOpen(true)}
            aria-label={
              activeFilters.length > 0
                ? t('home.filters.openWithCount', { count: activeFilters.length })
                : t('home.filters.open')
            }
            aria-haspopup='dialog'
            aria-expanded={filtersOpen}
            aria-controls={filtersOpen ? CATALOG_FILTERS_ID : undefined}
            sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 1, '&:hover': { bgcolor: 'grey.200' } }}
          >
            <Badge
              badgeContent={activeFilters.length}
              color='primary'
              sx={{ '& .MuiBadge-badge': { fontSize: '0.625rem', height: 16, minWidth: 16 } }}
            >
              <Tune
                sx={{
                  fontSize: 20,
                  color: activeFilters.length > 0 ? 'primary.main' : 'text.secondary',
                }}
              />
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

        {/* Categories Scroller. Chips show a translated label; the stored
            category is what gets selected and sent to the API. */}
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
          {[ALL_CATEGORIES, ...sortedCategories].map(category => {
            const selected = selectedCategory === category;
            return (
              <Button
                key={category || 'all'}
                variant={selected ? 'contained' : 'outlined'}
                onClick={() => selectCategory(category)}
                aria-pressed={selected}
                sx={{
                  borderRadius: 4,
                  px: 2,
                  py: 0.5,
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  boxShadow: selected ? 1 : 0,
                  bgcolor: selected ? 'primary.main' : 'background.paper',
                  color: selected ? 'primary.contrastText' : 'text.secondary',
                  borderColor: selected ? 'primary.main' : 'divider',
                  '&:hover': {
                    bgcolor: selected ? 'primary.dark' : 'background.paper',
                    borderColor: 'primary.main',
                  },
                }}
              >
                {category === ALL_CATEGORIES ? t('home.allProducts') : categoryLabel(t, category)}
              </Button>
            );
          })}
        </Box>
      </Box>

      <CatalogFilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onFiltersChange={applyFilters}
        specs={allSpecs}
        resultCount={loading ? null : total}
        activeCount={activeFilters.length}
      />

      {/* Main Content Area */}
      <Box component='main' sx={{ p: { xs: 1.5, sm: 2 }, flex: 1 }}>
        {loadFailed ? (
          <Alert severity='error' sx={{ mb: 2 }}>
            {t('home.loadError')}
          </Alert>
        ) : showSpinner ? (
          <Box display='flex' justifyContent='center' py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {(products.length > 0 || activeFilters.length > 0) && (
              <CatalogResultsBar
                total={total}
                activeFilters={activeFilters}
                onRemove={removeFilter}
                onClearAll={
                  products.length > 0 ? () => applyFilters(DEFAULT_CATALOG_FILTERS) : undefined
                }
              />
            )}

            {products.length === 0 ? (
              <Box textAlign='center' py={4}>
                <Typography variant='h6' color='text.secondary'>
                  {t('home.noProducts')}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {t('home.adjustFilters')}
                </Typography>
                {hasAnyConstraint && (
                  <Button variant='outlined' onClick={clearEverything} sx={{ mt: 2 }}>
                    {t('home.filters.clearSearchAndFilters')}
                  </Button>
                )}
              </Box>
            ) : (
              <Box aria-busy={loading} sx={{ position: 'relative' }}>
                {loading && (
                  <LinearProgress
                    sx={{ position: 'absolute', top: -6, left: 0, right: 0, height: 2 }}
                  />
                )}
                {/* Responsive product grid: 2 columns on mobile, scaling up on larger
                    screens. CSS Grid keeps every card in a row at an equal height.

                    The tracks are minmax(0, 1fr), not 1fr: a bare 1fr resolves to
                    minmax(auto, 1fr), and that auto floor is the widest card's
                    min-content width. On a phone that floor exceeds half the
                    viewport, so the grid — and with it the document — grew wider
                    than the screen, which is what let the page scroll sideways past
                    the end of the header. */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(2, minmax(0, 1fr))',
                      md: 'repeat(3, minmax(0, 1fr))',
                      lg: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: { xs: 1.5, sm: 2 },
                    alignItems: 'stretch',
                    opacity: loading ? 0.55 : 1,
                    transition: 'opacity 150ms',
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
                      getItemAriaLabel={paginationAriaLabel}
                    />
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>

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
