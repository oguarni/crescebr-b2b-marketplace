import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Fade,
  IconButton,
  Typography,
} from '@mui/material';
import { AddShoppingCart, StorefrontOutlined } from '@mui/icons-material';

import { Product } from '@shared/types';
import { useT } from '../contexts/LanguageContext';
import { formatBRL } from '../utils/currency';
import { optimizeImageUrl } from '../utils/imageUrl';
import { categoryLabel } from '../utils/catalogLabels';
import {
  PRODUCT_PLACEHOLDER_IMAGE,
  availabilityLabel,
  showPlaceholderOnError,
  supplierDisplayName,
} from '../utils/productDisplay';

interface ProductCardProps {
  product: Product;
  /** Adds the product to the buyer's quotation request. */
  onAddToCart: (product: Product) => void;
  /**
   * Whether to show the add-to-cart/quote action. Suppliers browse the catalog
   * but cannot purchase, so the action is hidden for them. Defaults to true.
   */
  showAddToCart?: boolean;
}

/**
 * How long the pointer must rest on a card before its preview opens. Sweeping
 * the pointer across the grid crosses several cards; without a delay each one
 * would flash its preview on the way.
 */
export const PREVIEW_DELAY_MS = 250;

/**
 * A single product card for the catalog grid. The image and title are a link to
 * the product's details page. Resting a mouse pointer on the card fades in a
 * preview over the image — description, minimum order, lead time and
 * availability — without resizing the card or covering its neighbours. Touch
 * pointers have no hover, so a tap goes straight to the details page, and
 * keyboard users reach the same page through the focusable link.
 */
const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  showAddToCart = true,
}) => {
  const t = useT();
  const [previewOpen, setPreviewOpen] = useState(false);
  const openTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  // `stockQuantity` is a runtime-only field not present on the Product type.
  const hasStock = ((product as { stockQuantity?: number }).stockQuantity ?? 0) > 0;
  const detailsPath = `/products/${product.id}`;

  const handlePointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setPreviewOpen(true), PREVIEW_DELAY_MS);
  };

  const closePreview = () => {
    window.clearTimeout(openTimer.current);
    setPreviewOpen(false);
  };

  // Hover content must be dismissible without moving the pointer (WCAG 1.4.13).
  // A hovering mouse rarely holds focus on the card, so Escape is heard on the
  // whole document while a preview is open, not only inside the card.
  useEffect(() => {
    if (!previewOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewOpen]);

  return (
    <Card
      variant='outlined'
      onPointerEnter={handlePointerEnter}
      onPointerLeave={closePreview}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={detailsPath}
        aria-label={`${product.name} — ${t('home.viewDetails')}`}
        sx={{
          display: 'block',
          // The default focus highlight is a faint tint; an outline makes the
          // focused card unmistakable for keyboard users.
          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '-2px',
          },
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
            image={optimizeImageUrl(product.imageUrl) || PRODUCT_PLACEHOLDER_IMAGE}
            alt={product.name}
            loading='lazy'
            onError={showPlaceholderOnError}
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

          {/* The preview covers the image area only, so it never shifts the
              grid or overlaps another card. It repeats what the details page
              shows in full, so it is hidden from assistive technology, which
              reaches that page through the link's accessible name instead. */}
          <Fade in={previewOpen} timeout={150} unmountOnExit>
            <Box
              data-testid={`product-preview-${product.id}`}
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                // Never a hit-test target: the pointer stays on the image and
                // link beneath, so clicks still navigate, and showing or
                // removing the overlay cannot make the browser report a fresh
                // pointer entry that would reopen a dismissed preview.
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                p: { xs: 1.25, sm: 1.5 },
                bgcolor: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(2px)',
                textAlign: 'left',
              }}
            >
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{
                  // Narrow cards give the preview little height; the text
                  // yields space to the facts below rather than pushing
                  // them out of view.
                  flex: '0 1 auto',
                  minHeight: 0,
                  fontSize: '0.75rem',
                  lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  overflowWrap: 'anywhere',
                }}
              >
                {product.description?.trim() ? product.description : t('home.noDescription')}
              </Typography>

              <Box sx={{ mt: 'auto' }}>
                <PreviewRow
                  label={t('home.moq')}
                  value={`${product.minimumOrderQuantity ?? '—'} ${t('home.units')}`}
                />
                <PreviewRow
                  label={t('home.leadTimeLabel')}
                  value={`${product.leadTime ?? '—'} ${t('home.days')}`}
                />
                <PreviewRow
                  label={t('home.availabilityLabel')}
                  value={availabilityLabel(t, product.availability)}
                />
                <Typography
                  variant='caption'
                  sx={{ display: 'block', mt: 0.5, fontWeight: 700, color: 'primary.main' }}
                >
                  {t('home.previewHint')}
                </Typography>
              </Box>
            </Box>
          </Fade>
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
            {product.category ? categoryLabel(t, product.category) : t('home.uncategorized')}
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
              // Model codes like "XYZ-500" are unbreakable words wider than
              // a narrow column, and the card clips its overflow — without
              // this they are cut mid-word instead of wrapping.
              overflowWrap: 'anywhere',
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
              {supplierDisplayName(t, product) ?? t('home.fallbackSupplier')}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>

      {/* Footer: price and add-to-cart sit outside the link, so the action
          never navigates. */}
      <Box
        sx={{
          mt: 'auto',
          px: { xs: 1.25, sm: 2 },
          py: 1.25,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          // A price is never worth truncating: where the column is too
          // narrow to hold the amount and the action side by side, the
          // action drops to its own line instead of eliding "R$ 15.000,00".
          flexWrap: 'wrap',
          columnGap: 1,
          rowGap: 0.75,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 auto' }}>
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
              fontSize: { xs: '0.8125rem', sm: '1rem' },
            }}
          >
            {formatBRL(product.price)}
          </Typography>
        </Box>
        {showAddToCart && (
          <IconButton
            onClick={() => onAddToCart(product)}
            aria-label={`${t('home.addToQuote')} — ${product.name}`}
            color='primary'
            sx={{
              flexShrink: 0,
              ml: 'auto',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              borderRadius: 2,
              p: { xs: 0.75, sm: 1 },
              boxShadow: 1,
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <AddShoppingCart fontSize='small' />
          </IconButton>
        )}
      </Box>
    </Card>
  );
};

interface PreviewRowProps {
  label: string;
  value: string;
}

const PreviewRow: React.FC<PreviewRowProps> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.125 }}>
    <Typography variant='caption' color='text.secondary' noWrap sx={{ minWidth: 0 }}>
      {label}
    </Typography>
    <Typography variant='caption' sx={{ fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>
      {value}
    </Typography>
  </Box>
);

export default ProductCard;
