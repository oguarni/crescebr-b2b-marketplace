import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';

import { useT } from '../../contexts/LanguageContext';
import type { ActiveFilter } from '../../utils/catalogFilters';

interface CatalogResultsBarProps {
  /** Products matching the current search, category and filters. */
  total: number;
  activeFilters: ActiveFilter[];
  onRemove: (filter: ActiveFilter) => void;
  /** Omitted when the page already offers a clear action, e.g. in the empty state. */
  onClearAll?: () => void;
}

/**
 * Result count and the active advanced filters, directly above the grid.
 *
 * The filter panel closes over the results, so this is where a visitor sees
 * what is narrowing the list and can drop one constraint without reopening it.
 */
const CatalogResultsBar: React.FC<CatalogResultsBarProps> = ({
  total,
  activeFilters,
  onRemove,
  onClearAll,
}) => {
  const t = useT();

  return (
    <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          minHeight: 32,
        }}
      >
        {/* Announced on change so a screen reader hears the effect of a filter. */}
        <Typography variant='body2' color='text.secondary' role='status' aria-live='polite'>
          {total > 0 &&
            (total === 1 ? t('home.results.one') : t('home.results.many', { count: total }))}
        </Typography>
        {onClearAll && activeFilters.length > 0 && (
          <Button size='small' onClick={onClearAll} sx={{ flexShrink: 0 }}>
            {t('home.filters.clearFilters')}
          </Button>
        )}
      </Box>
      {activeFilters.length > 0 && (
        <Box
          component='ul'
          aria-label={t('home.filters.activeLabel')}
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, listStyle: 'none', m: 0, mt: 0.5, p: 0 }}
        >
          {activeFilters.map(filter => (
            <li key={filter.id}>
              <Chip
                size='small'
                color='primary'
                variant='outlined'
                label={filter.label}
                onDelete={() => onRemove(filter)}
              />
            </li>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default CatalogResultsBar;
