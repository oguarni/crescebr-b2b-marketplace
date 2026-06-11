import React, { useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  ClickAwayListener,
  IconButton,
  Typography,
} from '@mui/material';
import { AddShoppingCart, ExpandMore, StorefrontOutlined } from '@mui/icons-material';

import { Product } from '@shared/types';
import { useT } from '../contexts/LanguageContext';
import { formatBRL } from '../utils/currency';
import { optimizeImageUrl } from '../utils/imageUrl';

interface ProductCardProps {
  product: Product;
  /** Adds the product to the buyer's quotation request. */
  onAddToCart: (product: Product) => void;
  /**
   * Whether to show the add-to-cart/quote action. Suppliers browse the catalog
   * but cannot purchase, so the action is hidden for them. Defaults to true.
   */
  showAddToCart?: boolean;
  /**
   * Controlled expand state. When provided together with `onToggleExpand`, the
   * parent owns the state so that only one card is expanded at a time. When the
   * props are omitted, the card falls back to managing its own expand state.
   */
  expanded?: boolean;
  onToggleExpand?: () => void;
  onCollapse?: () => void;
}

// Self-contained inline SVG placeholder so missing images never depend on an
// external service (a remote placeholder host can fail and break the grid).
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="225" viewBox="0 0 300 225">' +
      '<rect width="300" height="225" fill="#f1f5f9"/>' +
      '<g fill="none" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="105" y="78" width="90" height="70" rx="8"/>' +
      '<circle cx="128" cy="100" r="9"/>' +
      '<path d="M108 140l26-24 20 18 22-26 24 32"/>' +
      '</g></svg>'
  );

/**
 * A single product card for the catalog grid. The image and title act as an
 * expand trigger that reveals detailed product information. When expanded, the
 * details are rendered as an overlay that drops below the card and covers the
 * card beneath it (without shifting the rest of the grid). Clicking outside the
 * card collapses it again.
 */
const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  showAddToCart = true,
  expanded: controlledExpanded,
  onToggleExpand,
  onCollapse,
}) => {
  const t = useT();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const detailsId = `product-details-${product.id}`;
  // `stockQuantity` is a runtime-only field not present on the Product type.
  const hasStock = ((product as { stockQuantity?: number }).stockQuantity ?? 0) > 0;
  const specEntries = Object.entries(product.specifications ?? {});

  // Human-readable label for every availability state defined in the Product type.
  const availabilityLabels: Record<Product['availability'], string> = {
    in_stock: t('home.inStockOption'),
    out_of_stock: t('home.outOfStockOption'),
    limited: t('home.limitedOption'),
    custom_order: t('home.madeToOrderOption'),
  };

  const toggleExpanded = () => {
    if (onToggleExpand) onToggleExpand();
    if (!isControlled) setInternalExpanded(prev => !prev);
  };

  const collapse = () => {
    if (onCollapse) onCollapse();
    if (!isControlled) setInternalExpanded(false);
  };

  const handleClickAway = () => {
    if (expanded) collapse();
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ position: 'relative', height: '100%', zIndex: expanded ? 5 : 'auto' }}>
        <Card
          variant='outlined'
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            // Square the bottom corners while expanded so the details overlay
            // reads as a seamless continuation of the card.
            borderBottomLeftRadius: expanded ? 0 : undefined,
            borderBottomRightRadius: expanded ? 0 : undefined,
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
            boxShadow: expanded ? 6 : undefined,
            '&:hover': { boxShadow: 3 },
          }}
        >
          <CardActionArea
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={`${product.name} — ${expanded ? t('home.hideDetails') : t('home.viewDetails')}`}
            sx={{ display: 'block' }}
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
                image={optimizeImageUrl(product.imageUrl) || PLACEHOLDER_IMAGE}
                alt={product.name}
                loading='lazy'
                onError={event => {
                  // Fall back to the inline placeholder if the remote image fails.
                  const img = event.currentTarget as HTMLImageElement;
                  if (img.src !== PLACEHOLDER_IMAGE) {
                    img.src = PLACEHOLDER_IMAGE;
                  }
                }}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
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
                SKU-{product.id}
              </Box>
              {hasStock && (
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
                  {t('home.inStockBadge')}
                </Box>
              )}
            </Box>

            <CardContent sx={{ p: { xs: 1.25, sm: 2 }, pb: { xs: 1, sm: 1.5 } }}>
              <Typography
                variant='caption'
                noWrap
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  color: 'primary.main',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.625rem',
                }}
              >
                {product.category || t('home.uncategorized')}
              </Typography>

              <Typography
                variant='subtitle2'
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  lineHeight: 1.2,
                  mt: 0.5,
                  mb: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '2.4em',
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                }}
              >
                {product.name}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StorefrontOutlined sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography
                  variant='caption'
                  color='text.secondary'
                  noWrap
                  sx={{ flex: 1, minWidth: 0 }}
                >
                  {product.supplier?.companyName ||
                    product.supplier?.corporateName ||
                    (product.supplierId
                      ? t('home.supplierId', { id: product.supplierId })
                      : t('home.fallbackSupplier'))}
                </Typography>
                <ExpandMore
                  sx={{
                    fontSize: 18,
                    color: 'text.secondary',
                    transition: 'transform 0.2s',
                    transform: expanded ? 'rotate(180deg)' : 'none',
                  }}
                />
              </Box>
            </CardContent>
          </CardActionArea>

          {/* Footer: price and add-to-cart stay visible regardless of expand state. */}
          <Box
            sx={{
              mt: 'auto',
              px: { xs: 1.25, sm: 2 },
              py: 1.25,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Typography variant='caption' sx={{ fontSize: '0.625rem', color: 'text.secondary' }}>
                {t('home.unitPrice')}
              </Typography>
              <Typography
                variant='subtitle1'
                noWrap
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                {formatBRL(product.price)}
              </Typography>
            </Box>
            {showAddToCart && (
              <IconButton
                onClick={event => {
                  // Keep the cart action independent from the expand trigger.
                  event.stopPropagation();
                  onAddToCart(product);
                }}
                aria-label={`${t('home.addToQuote')} — ${product.name}`}
                color='primary'
                sx={{
                  flexShrink: 0,
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
            )}
          </Box>
        </Card>

        {/* Expandable details: rendered as an overlay anchored to the bottom of
            the card so it covers the card below without resizing the grid. Only
            the clicked card shows this; clicking away collapses it. */}
        {expanded && (
          <Box
            id={detailsId}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 5,
              bgcolor: 'background.paper',
              border: 1,
              borderTop: 0,
              borderColor: 'divider',
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              boxShadow: 6,
              px: { xs: 1.25, sm: 2 },
              pt: 1.5,
              pb: 2,
            }}
          >
            <Typography variant='caption' sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
              {t('home.descriptionLabel')}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
              {product.description?.trim() ? product.description : t('home.noDescription')}
            </Typography>

            <DetailRow
              label={t('home.moq')}
              value={`${product.minimumOrderQuantity ?? '—'} ${t('home.units')}`}
            />
            <DetailRow
              label={t('home.leadTimeLabel')}
              value={`${product.leadTime ?? '—'} ${t('home.days')}`}
            />
            <DetailRow
              label={t('home.availabilityLabel')}
              value={availabilityLabels[product.availability] ?? product.availability ?? '—'}
            />

            {specEntries.length > 0 && (
              <>
                <Typography
                  variant='caption'
                  sx={{ fontWeight: 700, display: 'block', mt: 1.5, mb: 0.5 }}
                >
                  {t('home.technicalSpecs')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {specEntries.map(([key, value]) => (
                    <Chip
                      key={key}
                      size='small'
                      variant='outlined'
                      label={`${key}: ${String(value)}`}
                    />
                  ))}
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.25 }}>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='caption' sx={{ fontWeight: 600, textAlign: 'right' }}>
      {value}
    </Typography>
  </Box>
);

export default ProductCard;
