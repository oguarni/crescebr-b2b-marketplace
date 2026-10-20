import React from 'react';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import type { Product } from '@shared/types';
import { useT } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../locales';
import { formatBRL } from '../../utils/currency';
import { categoryLabel } from '../../utils/catalogLabels';
import { ProductAvailabilityChip } from './ProductAvailabilityChip';
import { PRODUCT_IMAGE_FALLBACK } from './ProductCardGrid';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: number) => void;
}

const COLUMN_KEYS: TranslationKey[] = [
  'supplierProducts.columns.product',
  'supplierProducts.columns.category',
  'supplierProducts.columns.price',
  'supplierProducts.columns.moq',
  'supplierProducts.columns.leadTime',
  'supplierProducts.columns.status',
  'supplierProducts.columns.actions',
];

const DESCRIPTION_PREVIEW_LENGTH = 50;

const THUMBNAIL_STYLE: React.CSSProperties = {
  width: 50,
  height: 50,
  marginRight: 16,
  objectFit: 'cover',
};

/**
 * Dense table view of the catalogue, the alternative to the card grid.
 *
 * @example
 * <ProductTable products={displayProducts} onEdit={openEdit} onDelete={remove} />
 */
export const ProductTable: React.FC<ProductTableProps> = ({ products, onEdit, onDelete }) => {
  const t = useT();

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMN_KEYS.map(key => (
              <TableCell key={key}>{t(key)}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map(product => (
            <TableRow key={product.id}>
              <TableCell>
                <Box display='flex' alignItems='center'>
                  <img
                    src={product.imageUrl || PRODUCT_IMAGE_FALLBACK}
                    alt={product.name}
                    style={THUMBNAIL_STYLE}
                  />
                  <Box>
                    <Typography variant='subtitle1'>{product.name}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {product.description.substring(0, DESCRIPTION_PREVIEW_LENGTH)}...
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{categoryLabel(t, product.category)}</TableCell>
              <TableCell>{formatBRL(product.price)}</TableCell>
              <TableCell>{product.minimumOrderQuantity}</TableCell>
              <TableCell>
                {t('supplierProducts.leadTimeDays', { days: product.leadTime })}
              </TableCell>
              <TableCell>
                <ProductAvailabilityChip availability={product.availability} />
              </TableCell>
              <TableCell>
                <IconButton
                  onClick={() => onEdit(product)}
                  size='small'
                  aria-label={t('supplierProducts.editAria', { name: product.name })}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  onClick={() => onDelete(product.id)}
                  size='small'
                  aria-label={t('supplierProducts.deleteAria', { name: product.name })}
                >
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
