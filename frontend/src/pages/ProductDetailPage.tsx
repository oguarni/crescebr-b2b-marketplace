import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import {
  AddShoppingCart,
  ArrowBack,
  Inventory2Outlined,
  LocalShippingOutlined,
  SearchOff,
  StorefrontOutlined,
} from '@mui/icons-material';

import type { PricingTier, Product } from '@shared/types';
import { useProduct } from '../hooks/useProducts';
import { useAuth } from '../contexts/AuthContext';
import { useQuotationRequest } from '../contexts/QuotationContext';
import { useT, type Translate } from '../contexts/LanguageContext';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatBRL } from '../utils/currency';
import { optimizeImageUrl } from '../utils/imageUrl';
import { categoryLabel, formatSpecLabel } from '../utils/catalogLabels';
import {
  PRODUCT_PLACEHOLDER_IMAGE,
  availabilityLabel,
  showPlaceholderOnError,
  supplierDisplayName,
} from '../utils/productDisplay';

const AVAILABILITY_COLOR: Record<Product['availability'], ChipProps['color']> = {
  in_stock: 'success',
  limited: 'warning',
  out_of_stock: 'error',
  custom_order: 'info',
};

/** The route parameter as an id; anything that is not all digits becomes NaN. */
const parseProductId = (raw: string | undefined): number =>
  raw && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { product, loading, error, notFound, refetch } = useProduct(parseProductId(id));
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();

  const backToCatalog = () => {
    // Return to the catalog entry the visitor came from when there is one, so
    // the browser history stays linear; a deep link has none and goes home.
    if (location.key && location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  let content: React.ReactNode;
  if (loading) {
    content = <LoadingSpinner />;
  } else if (notFound) {
    content = (
      <EmptyState
        icon={<SearchOff sx={{ fontSize: 56 }} />}
        title={t('productDetail.notFoundTitle')}
        description={t('productDetail.notFoundDescription')}
        action={{ label: t('productDetail.browseCatalog'), onClick: () => navigate('/') }}
      />
    );
  } else if (error || !product) {
    content = <ErrorMessage message={t('productDetail.loadError')} onRetry={refetch} />;
  } else {
    content = <ProductDetails product={product} />;
  }

  return (
    <Container maxWidth='lg' sx={{ pb: 6 }}>
      <Button startIcon={<ArrowBack />} onClick={backToCatalog} color='inherit' sx={{ mb: 2 }}>
        {t('productDetail.backToCatalog')}
      </Button>
      {content}
    </Container>
  );
};

interface ProductDetailsProps {
  product: Product;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const t = useT();
  const { user } = useAuth();
  const { addItem } = useQuotationRequest();

  // Quotations are created by buyers; a visitor builds the request before
  // signing in. Suppliers and administrators never place one.
  const canRequestQuote = !user || user.role === 'customer';
  const supplier = supplierDisplayName(t, product);
  const specEntries = Object.entries(product.specifications ?? {});
  const tiers = product.tierPricing ?? [];
  const basePrice = Number(product.unitPrice || product.price);

  return (
    <>
      <Paper variant='outlined' sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Grid container>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4 / 3',
                bgcolor: 'grey.100',
                height: { md: '100%' },
                minHeight: { md: 360 },
              }}
            >
              <Box
                component='img'
                src={
                  optimizeImageUrl(product.imageUrl, { width: 960 }) || PRODUCT_PLACEHOLDER_IMAGE
                }
                alt={product.name}
                onError={showPlaceholderOnError}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: { xs: 2.5, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant='caption'
                    sx={{
                      fontWeight: 700,
                      color: 'primary.main',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {product.category
                      ? categoryLabel(t, product.category)
                      : t('home.uncategorized')}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}
                  >
                    {t('productDetail.productCode')}: SKU-{product.id}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  component='h1'
                  sx={{
                    mt: 0.5,
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', sm: '2rem' },
                    lineHeight: 1.2,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {product.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
                  <StorefrontOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant='body2' color='text.secondary'>
                    {t('productDetail.supplier')}:{' '}
                    <Box component='span' sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {supplier ?? t('common.notAvailable')}
                    </Box>
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant='caption' color='text.secondary'>
                  {t('home.unitPrice')}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: { xs: '1.75rem', sm: '2.125rem' },
                    lineHeight: 1.1,
                  }}
                >
                  {formatBRL(product.price)}
                </Typography>
                <Chip
                  size='small'
                  color={AVAILABILITY_COLOR[product.availability] ?? 'default'}
                  label={availabilityLabel(t, product.availability)}
                  sx={{ mt: 1, fontWeight: 600 }}
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 1.5,
                }}
              >
                <Fact
                  icon={<Inventory2Outlined fontSize='small' />}
                  label={t('home.moq')}
                  value={`${product.minimumOrderQuantity ?? '—'} ${t('home.units')}`}
                />
                <Fact
                  icon={<LocalShippingOutlined fontSize='small' />}
                  label={t('home.leadTimeLabel')}
                  value={`${product.leadTime ?? '—'} ${t('home.days')}`}
                />
              </Box>

              {canRequestQuote && (
                <Box>
                  <Button
                    variant='contained'
                    size='large'
                    startIcon={<AddShoppingCart />}
                    onClick={() => addItem(product)}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    {t('home.addToQuote')}
                  </Button>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block', mt: 1 }}
                  >
                    {t('productDetail.quoteNote')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: tiers.length > 0 ? 7 : 12 }}>
          <Section title={t('home.descriptionLabel')}>
            <Typography
              variant='body1'
              color='text.secondary'
              sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}
            >
              {product.description?.trim() ? product.description : t('home.noDescription')}
            </Typography>
          </Section>

          <Section title={t('home.technicalSpecs')}>
            {specEntries.length > 0 ? (
              <TableContainer>
                <Table size='small' aria-label={t('home.technicalSpecs')}>
                  <TableBody>
                    {specEntries.map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell
                          component='th'
                          scope='row'
                          sx={{ color: 'text.secondary', width: '45%', pl: 0 }}
                        >
                          {formatSpecLabel(key)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                          {String(value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant='body2' color='text.secondary'>
                {t('productDetail.noSpecs')}
              </Typography>
            )}
          </Section>
        </Grid>

        {tiers.length > 0 && (
          <Grid size={{ xs: 12, md: 5 }}>
            <Section title={t('productDetail.volumePricing')}>
              <TableContainer>
                <Table size='small' aria-label={t('productDetail.volumePricing')}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ pl: 0 }}>{t('productDetail.tierQuantity')}</TableCell>
                      <TableCell align='right'>{t('productDetail.tierDiscount')}</TableCell>
                      <TableCell align='right' sx={{ pr: 0 }}>
                        {t('home.unitPrice')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tiers.map(tier => (
                      <TableRow key={tier.minQuantity}>
                        <TableCell sx={{ pl: 0 }}>{tierRange(t, tier)}</TableCell>
                        <TableCell align='right'>
                          {tier.discount > 0 ? `${Math.round(tier.discount * 100)}%` : '—'}
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{ pr: 0, fontFamily: 'monospace', fontWeight: 600 }}
                        >
                          {formatBRL(basePrice * (1 - tier.discount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mt: 1.5 }}
              >
                {t('productDetail.volumePricingNote')}
              </Typography>
            </Section>
          </Grid>
        )}
      </Grid>
    </>
  );
};

const tierRange = (t: Translate, tier: PricingTier): string =>
  tier.maxQuantity === null
    ? t('productDetail.tierFrom', { min: tier.minQuantity })
    : t('productDetail.tierRange', { min: tier.minQuantity, max: tier.maxQuantity });

interface FactProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const Fact: React.FC<FactProps> = ({ icon, label, value }) => (
  <Box
    sx={{
      border: 1,
      borderColor: 'divider',
      borderRadius: 2,
      p: 1.5,
      minWidth: 0,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
      {icon}
      {/* Labels wrap rather than truncate: "Pedido mínimo (MOQ)" does not fit
          half a phone's width on one line. */}
      <Typography variant='caption' sx={{ minWidth: 0, lineHeight: 1.3 }}>
        {label}
      </Typography>
    </Box>
    <Typography variant='subtitle1' sx={{ fontWeight: 700, mt: 0.25 }}>
      {value}
    </Typography>
  </Box>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <Paper variant='outlined' sx={{ borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3 }}>
    <Typography variant='h6' component='h2' sx={{ fontWeight: 700, mb: 1.5 }}>
      {title}
    </Typography>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);

export default ProductDetailPage;
