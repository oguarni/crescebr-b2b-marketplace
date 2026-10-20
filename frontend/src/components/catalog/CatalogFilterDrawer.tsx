import React, { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  createFilterOptions,
  Drawer,
  FormControlLabel,
  FormGroup,
  IconButton,
  Slider,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  CheckCircleOutline,
  Close,
  Info,
  Inventory,
  LocalShippingOutlined,
  Speed,
} from '@mui/icons-material';

import { useT } from '../../contexts/LanguageContext';
import { formatBRLWhole } from '../../utils/currency';
import { formatSpecLabel } from '../../utils/catalogLabels';
import {
  AVAILABILITY_OPTIONS,
  type CatalogFilters,
  DEFAULT_CATALOG_FILTERS,
  describeLeadTime,
  describeMoqRange,
  describePriceRange,
  fromSpecOptions,
  fromStopIndex,
  LEAD_TIME_LIMITS,
  MOQ_LIMITS,
  PRICE_LIMITS,
  type RangeLimits,
  type SpecOption,
  availabilityLabel,
  toSelectedSpecOptions,
  toSpecOptions,
  toStopIndex,
} from '../../utils/catalogFilters';

/** Shared with the filter button's `aria-controls`. */
export const CATALOG_FILTERS_ID = 'catalog-filters';
const TITLE_ID = 'catalog-filters-title';

interface CatalogFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: CatalogFilters;
  onFiltersChange: (filters: CatalogFilters) => void;
  /** Values on offer per specification key, as returned by the API. */
  specs: Record<string, string[]>;
  /** Products matching the current filters; null while they are loading. */
  resultCount: number | null;
  activeCount: number;
}

// Typing "material" should list every material, not only values that contain
// the word, so the key's label is part of what the search matches.
const filterSpecOptions = createFilterOptions<SpecOption>({
  stringify: option => `${formatSpecLabel(option.key)} ${option.value}`,
});

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// The sliders move through stop positions, not values. `scale` turns a position
// back into its value for the value label and the aria-value* attributes, so
// both still read in reais, units and days.
const stopSliderProps = (limits: RangeLimits) => ({
  min: 0,
  max: limits.stops.length - 1,
  step: 1,
  marks: true,
  scale: (position: number) => fromStopIndex(limits, position),
});

const toPositions = (limits: RangeLimits, [min, max]: [number, number]): [number, number] => [
  toStopIndex(limits, min),
  toStopIndex(limits, max),
];

const toRange = (limits: RangeLimits, positions: number | number[]): [number, number] => {
  const [min, max] = positions as number[];
  return [fromStopIndex(limits, min), fromStopIndex(limits, max)];
};

interface SectionProps {
  icon?: React.ReactNode;
  id: string;
  title: string;
  /** Plain-language reading of the current value, shown under the title. */
  summary?: string;
  children: React.ReactNode;
}

const FilterSection: React.FC<SectionProps> = ({ icon, id, title, summary, children }) => (
  <Box component='section' aria-labelledby={id}>
    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
      <Typography
        id={id}
        variant='subtitle2'
        component='h3'
        sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}
      >
        {icon}
        {title}
      </Typography>
      {summary && (
        <Typography variant='caption' color='text.secondary' sx={{ textAlign: 'right' }}>
          {summary}
        </Typography>
      )}
    </Box>
    <Box sx={{ mt: 1 }}>{children}</Box>
  </Box>
);

/**
 * The catalogue's advanced filters, as a modal panel: a bottom sheet on phones
 * and a side panel from md up.
 *
 * Changes apply as they are made, so the panel never holds a second, unapplied
 * copy of the filters and dismissing it — by the close button, the backdrop or
 * Escape — can never discard or silently drop a selection. The footer reports
 * how many products match, so the effect of a change is visible without
 * leaving the panel. Sliders apply when released rather than on every step of
 * a drag, which would otherwise fire a request per step.
 */
const CatalogFilterDrawer: React.FC<CatalogFilterDrawerProps> = ({
  open,
  onClose,
  filters,
  onFiltersChange,
  specs,
  resultCount,
  activeCount,
}) => {
  const t = useT();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // Positions while a thumb is being dragged; null when the slider rests on
  // the applied value.
  const [draftPrice, setDraftPrice] = useState<[number, number] | null>(null);
  const [draftMoq, setDraftMoq] = useState<[number, number] | null>(null);
  const [draftLeadTime, setDraftLeadTime] = useState<number | null>(null);

  const specOptions = useMemo(() => toSpecOptions(specs), [specs]);
  const selectedSpecs = useMemo(
    () => toSelectedSpecOptions(filters.specifications),
    [filters.specifications]
  );

  const update = (patch: Partial<CatalogFilters>) => onFiltersChange({ ...filters, ...patch });

  const priceRange = draftPrice ?? filters.priceRange;
  const moqRange = draftMoq ?? filters.moqRange;
  const maxLeadTime = draftLeadTime ?? filters.maxLeadTime;

  const unitWord = (value: number) => (value === 1 ? t('home.filters.oneUnit') : t('home.units'));

  const priceSummary = capitalize(describePriceRange(t, priceRange) ?? t('home.filters.anyPrice'));
  const moqDescription = describeMoqRange(t, moqRange);
  const moqSummary = moqDescription
    ? capitalize(`${moqDescription} ${unitWord(moqRange[1])}`)
    : t('home.filters.anyQuantity');
  const leadTimeSummary = describeLeadTime(t, maxLeadTime);

  const rangeAriaLabel = (section: string) => (index: number) =>
    `${section}: ${index === 0 ? t('home.filters.minimum') : t('home.filters.maximum')}`;

  const showResultsLabel =
    resultCount === null
      ? t('home.filters.showResultsPending')
      : resultCount === 0
        ? t('home.noProducts')
        : resultCount === 1
          ? t('home.filters.showOneResult')
          : t('home.filters.showResults', { count: resultCount });

  return (
    <Drawer
      anchor={isDesktop ? 'right' : 'bottom'}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          id: CATALOG_FILTERS_ID,
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': TITLE_ID,
          sx: {
            display: 'flex',
            flexDirection: 'column',
            width: { xs: '100%', md: 400 },
            maxHeight: { xs: '85vh', md: '100%' },
            '@supports (height: 100dvh)': { maxHeight: { xs: '85dvh', md: '100%' } },
            borderTopLeftRadius: { xs: 16, md: 0 },
            borderTopRightRadius: { xs: 16, md: 0 },
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography id={TITLE_ID} variant='h6' component='h2' sx={{ fontWeight: 600 }}>
          {t('home.filters.title')}
        </Typography>
        <IconButton onClick={onClose} aria-label={t('home.filters.close')} edge='end'>
          <Close />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2.5,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <FilterSection
          id='catalog-filter-price'
          icon={<Speed color='primary' fontSize='small' />}
          title={t('home.priceRange')}
          summary={priceSummary}
        >
          <Box sx={{ px: 1.5 }}>
            <Slider
              {...stopSliderProps(PRICE_LIMITS)}
              value={toPositions(PRICE_LIMITS, priceRange)}
              onChange={(_, value) => setDraftPrice(toRange(PRICE_LIMITS, value))}
              onChangeCommitted={(_, value) => {
                setDraftPrice(null);
                update({ priceRange: toRange(PRICE_LIMITS, value) });
              }}
              valueLabelDisplay='auto'
              valueLabelFormat={value =>
                value >= PRICE_LIMITS.max ? `${formatBRLWhole(value)}+` : formatBRLWhole(value)
              }
              getAriaLabel={rangeAriaLabel(t('home.priceRange'))}
              getAriaValueText={value => formatBRLWhole(value)}
            />
          </Box>
        </FilterSection>

        <FilterSection
          id='catalog-filter-moq'
          icon={<Inventory color='primary' fontSize='small' />}
          title={t('home.moq')}
          summary={moqSummary}
        >
          <Box sx={{ px: 1.5 }}>
            <Slider
              {...stopSliderProps(MOQ_LIMITS)}
              value={toPositions(MOQ_LIMITS, moqRange)}
              onChange={(_, value) => setDraftMoq(toRange(MOQ_LIMITS, value))}
              onChangeCommitted={(_, value) => {
                setDraftMoq(null);
                update({ moqRange: toRange(MOQ_LIMITS, value) });
              }}
              valueLabelDisplay='auto'
              valueLabelFormat={value =>
                value >= MOQ_LIMITS.max ? `${value}+` : `${value} ${unitWord(value)}`
              }
              getAriaLabel={rangeAriaLabel(t('home.moq'))}
              getAriaValueText={value => `${value} ${unitWord(value)}`}
            />
          </Box>
        </FilterSection>

        <FilterSection
          id='catalog-filter-lead-time'
          icon={<LocalShippingOutlined color='primary' fontSize='small' />}
          title={t('home.maxLeadTime')}
          summary={leadTimeSummary}
        >
          <Box sx={{ px: 1.5 }}>
            <Slider
              {...stopSliderProps(LEAD_TIME_LIMITS)}
              value={toStopIndex(LEAD_TIME_LIMITS, maxLeadTime)}
              onChange={(_, value) =>
                setDraftLeadTime(fromStopIndex(LEAD_TIME_LIMITS, value as number))
              }
              onChangeCommitted={(_, value) => {
                setDraftLeadTime(null);
                update({ maxLeadTime: fromStopIndex(LEAD_TIME_LIMITS, value as number) });
              }}
              valueLabelDisplay='auto'
              valueLabelFormat={value =>
                value >= LEAD_TIME_LIMITS.max
                  ? t('home.filters.anyLeadTime')
                  : value === 1
                    ? t('home.filters.oneDay')
                    : `${value} ${t('home.days')}`
              }
              aria-labelledby='catalog-filter-lead-time'
              getAriaValueText={value => describeLeadTime(t, value)}
            />
          </Box>
        </FilterSection>

        <FilterSection
          id='catalog-filter-availability'
          icon={<CheckCircleOutline color='primary' fontSize='small' />}
          title={t('home.availabilityStatus')}
        >
          <FormGroup row sx={{ columnGap: 2 }}>
            {AVAILABILITY_OPTIONS.map(availability => (
              <FormControlLabel
                key={availability}
                control={
                  <Checkbox
                    size='small'
                    checked={filters.availability.includes(availability)}
                    onChange={() =>
                      update({
                        availability: filters.availability.includes(availability)
                          ? filters.availability.filter(a => a !== availability)
                          : [...filters.availability, availability],
                      })
                    }
                  />
                }
                label={
                  <Typography variant='body2'>{availabilityLabel(t, availability)}</Typography>
                }
              />
            ))}
          </FormGroup>
        </FilterSection>

        {specOptions.length > 0 && (
          <FilterSection
            id='catalog-filter-specs'
            icon={<Info color='primary' fontSize='small' />}
            title={t('home.technicalSpecs')}
          >
            <Autocomplete
              multiple
              size='small'
              options={specOptions}
              value={selectedSpecs}
              onChange={(_, options) => update({ specifications: fromSpecOptions(options) })}
              groupBy={option => formatSpecLabel(option.key)}
              getOptionLabel={option => option.value}
              isOptionEqualToValue={(option, value) =>
                option.key === value.key && option.value === value.value
              }
              filterOptions={filterSpecOptions}
              renderValue={(value, getItemProps) =>
                value.map((option, index) => {
                  const { key, ...itemProps } = getItemProps({ index });
                  return (
                    <Chip
                      key={key}
                      size='small'
                      label={`${formatSpecLabel(option.key)}: ${option.value}`}
                      {...itemProps}
                    />
                  );
                })
              }
              noOptionsText={t('home.filters.noSpecs')}
              clearText={t('home.filters.clearSpecs')}
              openText={t('home.filters.openList')}
              closeText={t('home.filters.closeList')}
              renderInput={params => (
                <TextField
                  {...params}
                  label={t('home.filters.specsLabel')}
                  placeholder={selectedSpecs.length === 0 ? t('home.filters.specsPlaceholder') : ''}
                />
              )}
            />
          </FilterSection>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          px: 2.5,
          pt: 1.5,
          // Clears the home indicator on phones that report a safe area.
          pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Button
          variant='outlined'
          onClick={() => onFiltersChange(DEFAULT_CATALOG_FILTERS)}
          disabled={activeCount === 0}
        >
          {t('home.filters.clear')}
        </Button>
        <Button id='catalog-filters-apply' variant='contained' onClick={onClose} sx={{ flex: 1 }}>
          {showResultsLabel}
        </Button>
      </Box>
    </Drawer>
  );
};

export default CatalogFilterDrawer;
