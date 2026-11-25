import {
  AdminPanelSettingsOutlined,
  AnalyticsOutlined,
  AssignmentOutlined,
  DashboardRounded,
  GridViewOutlined,
  Inventory2Outlined,
  LoginOutlined,
  ReceiptLongOutlined,
  RequestQuoteOutlined,
  ShoppingBagOutlined,
  TuneOutlined,
  VerifiedOutlined,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import type { Company } from '@shared/types';
import type { TranslationKey } from '../../locales';

export interface BottomNavItem {
  path: string;
  labelKey: TranslationKey;
  Icon: SvgIconComponent;
  /** Shows the number of products in the open quotation request. */
  showsRequestCount?: boolean;
}

/**
 * The phone navigation for each kind of visitor: the places they return to
 * most, and nothing they are not allowed into. Order is display order.
 */
const ITEMS_BY_ROLE: Record<Company['role'] | 'guest', readonly BottomNavItem[]> = {
  guest: [
    { path: '/', labelKey: 'home.catalog', Icon: GridViewOutlined },
    {
      path: '/quotation-request',
      labelKey: 'mobileNav.request',
      Icon: RequestQuoteOutlined,
      showsRequestCount: true,
    },
    { path: '/login', labelKey: 'mobileNav.signIn', Icon: LoginOutlined },
  ],
  customer: [
    { path: '/', labelKey: 'home.catalog', Icon: GridViewOutlined },
    {
      path: '/quotation-request',
      labelKey: 'mobileNav.request',
      Icon: RequestQuoteOutlined,
      showsRequestCount: true,
    },
    { path: '/my-quotations', labelKey: 'home.quotes', Icon: AssignmentOutlined },
    { path: '/my-orders', labelKey: 'home.orders', Icon: ReceiptLongOutlined },
  ],
  supplier: [
    {
      path: '/supplier/dashboard',
      labelKey: 'supplierDashboard.nav.dashboard',
      Icon: DashboardRounded,
    },
    {
      path: '/supplier/quotations',
      labelKey: 'supplierDashboard.nav.quotations',
      Icon: RequestQuoteOutlined,
    },
    {
      path: '/supplier/orders',
      labelKey: 'supplierDashboard.nav.orders',
      Icon: ShoppingBagOutlined,
    },
    {
      path: '/supplier/products',
      labelKey: 'supplierDashboard.nav.catalog',
      Icon: Inventory2Outlined,
    },
  ],
  admin: [
    { path: '/admin/products', labelKey: 'mobileNav.adminProducts', Icon: Inventory2Outlined },
    {
      path: '/admin/quotations',
      labelKey: 'mobileNav.adminQuotations',
      Icon: AdminPanelSettingsOutlined,
    },
    { path: '/admin/analytics', labelKey: 'mobileNav.adminAnalytics', Icon: AnalyticsOutlined },
    {
      path: '/admin/company-verification',
      labelKey: 'mobileNav.adminCompanies',
      Icon: VerifiedOutlined,
    },
    { path: '/admin/settings', labelKey: 'mobileNav.adminSettings', Icon: TuneOutlined },
  ],
};

export const bottomNavItemsFor = (role: Company['role'] | undefined): readonly BottomNavItem[] =>
  ITEMS_BY_ROLE[role ?? 'guest'];

/**
 * The item for the current page, or null on a page the bar does not list.
 *
 * The bar belongs to top-level screens only: drill-down pages (a quotation, a
 * product, checkout) keep their own action bar and a way back, as tab bars on
 * phones usually do.
 */
export const activeBottomNavItem = (
  items: readonly BottomNavItem[],
  pathname: string
): BottomNavItem | null => {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return items.find(item => item.path === normalized) ?? null;
};
