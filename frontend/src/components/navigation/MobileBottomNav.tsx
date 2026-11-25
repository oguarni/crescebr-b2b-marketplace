import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Badge, BottomNavigation, BottomNavigationAction, Box, Paper } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useQuotationRequest } from '../../contexts/QuotationContext';
import { useT } from '../../contexts/LanguageContext';
import { activeBottomNavItem, bottomNavItemsFor } from './bottomNavItems';

/** Height of the bar without the safe-area inset. */
export const BOTTOM_NAV_HEIGHT = 64;

const RESERVED_HEIGHT = `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`;

/**
 * Fixed navigation for phones and small tablets, by role. Each entry is a real
 * link, so it is reachable by keyboard and announced as navigation; the current
 * page is marked with `aria-current`. Hidden from the `md` breakpoint up, where
 * the app bar's account menu carries the same destinations.
 */
export const MobileBottomNav: React.FC = () => {
  const t = useT();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { items: requestItems } = useQuotationRequest();

  const items = bottomNavItemsFor(user?.role);
  const active = activeBottomNavItem(items, pathname);
  if (!active) return null;

  return (
    <>
      {/* Keeps the end of the page clear of the fixed bar. */}
      <Box
        aria-hidden
        sx={{ display: { xs: 'block', md: 'none' }, height: RESERVED_HEIGHT, flexShrink: 0 }}
      />
      <Paper
        component='nav'
        aria-label={t('mobileNav.label')}
        elevation={8}
        square
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: theme => theme.zIndex.appBar,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation value={active.path} showLabels sx={{ height: BOTTOM_NAV_HEIGHT }}>
          {items.map(({ path, labelKey, Icon, showsRequestCount }) => (
            <BottomNavigationAction
              key={path}
              value={path}
              label={t(labelKey)}
              component={RouterLink}
              to={path}
              aria-current={path === active.path ? 'page' : undefined}
              icon={
                showsRequestCount ? (
                  <Badge badgeContent={requestItems.length} color='secondary'>
                    <Icon />
                  </Badge>
                ) : (
                  <Icon />
                )
              }
              sx={{
                minWidth: 0,
                px: 0.5,
                '& .MuiBottomNavigationAction-label': { fontSize: '0.75rem' },
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </>
  );
};
