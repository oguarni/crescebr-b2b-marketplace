import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  NotificationsOutlined,
  PendingActions,
  LocalShipping,
  TrendingUp,
  ArrowUpward,
  EditNote,
  VisibilityOutlined,
  ArrowForward,
  MoreHoriz,
  Inventory2Outlined,
  PrecisionManufacturingOutlined,
  CheckCircle,
  CloudQueue,
  DashboardRounded,
  RequestQuoteOutlined,
  ShoppingBagOutlined,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { quotationsService } from '../services/quotationsService';
import { ordersService } from '../services/ordersService';
import { Quotation, Order, Product } from '@shared/types';
import toast from 'react-hot-toast';

interface DashboardMetrics {
  totalSales: number;
  monthlyRevenue: number;
  activeOrders: number;
  averageRating: number;
  totalProducts: number;
  pendingQuotations: number;
}

const SupplierDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Re-integrated state
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSales: 0,
    monthlyRevenue: 0,
    activeOrders: 0,
    averageRating: 0,
    totalProducts: 0,
    pendingQuotations: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<Quotation[]>([]);
  // lowStockProducts not shown in the current UI but kept for backend completeness if needed
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadRecentOrders(),
        loadPendingQuotations(),
        loadLowStockProducts(),
      ]);
    } catch (_error) {
      console.error('Error loading dashboard data:', _error);
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      setMetrics({
        totalSales: 156,
        monthlyRevenue: 45600,
        activeOrders: 8,
        averageRating: 4.8,
        totalProducts: 127,
        pendingQuotations: 12,
      });
    } catch (_error) {
      console.error('Error loading metrics:', _error);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const result = await ordersService.getUserOrders();
      const recentActiveOrders = result.orders
        .filter((order: Order) => order.status === 'pending' || order.status === 'processing')
        .slice(0, 3); // match new UI length
      setRecentOrders(recentActiveOrders);
    } catch (_error) {
      console.error('Error loading recent orders:', _error);
    }
  };

  const loadPendingQuotations = async () => {
    try {
      const data = await quotationsService.getAllQuotations();
      const pending = data
        .filter((quote: Quotation) => quote.status === 'pending' || quote.status === 'processed')
        .slice(0, 4); // match new UI length
      setPendingQuotes(pending);
    } catch (_error) {
      console.error('Error loading pending quotations:', _error);
    }
  };

  const loadLowStockProducts = async () => {
    try {
      setLowStockProducts([]);
    } catch (_error) {
      console.error('Error loading low stock products:', _error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getStatusChipProps = (status: string) => {
    switch (status) {
      case 'Review': return { bgcolor: '#fff3e0', color: '#e65100', borderColor: '#ffe0b2' };
      case 'New': return { bgcolor: '#e3f2fd', color: '#1565c0', borderColor: '#bbdefb' };
      case 'Draft': return { bgcolor: '#f5f5f5', color: '#616161', borderColor: '#e0e0e0' };
      case 'Sent': return { bgcolor: '#e8f5e9', color: '#2e7d32', borderColor: '#c8e6c9' };
      default: return { bgcolor: '#f5f5f5', color: '#616161', borderColor: '#e0e0e0' };
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      {/* Header */}
      <Box component="header" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', position: 'sticky', top: 0, zIndex: 50, boxShadow: 2 }}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton color="inherit" edge="start" sx={{ p: 0.5 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '-0.025em', fontSize: '1.125rem' }}>
              CresceBR Supplier
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge color="error" variant="dot" sx={{ '& .MuiBadge-badge': { border: '2px solid', borderColor: 'primary.main', right: 2, top: 2 } }}>
              <IconButton color="inherit" sx={{ p: 0.5 }}>
                <NotificationsOutlined />
              </IconButton>
            </Badge>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)', fontSize: '0.875rem', fontWeight: 'bold' }}>
              {user?.companyName?.substring(0, 2).toUpperCase() || 'SG'}
            </Avatar>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ p: 2, maxWidth: 'md', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Metrics Grid */}
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 4 }}>
            <Card variant="outlined" sx={{ height: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2, p: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', noWrap: true }}>
                  Pending
                </Typography>
                <PendingActions sx={{ color: 'warning.main', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                  {metrics.pendingQuotations}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.625rem', mt: 0.5, display: 'block' }}>
                  Quotations
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 4 }}>
            <Card variant="outlined" sx={{ height: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2, p: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', noWrap: true }}>
                  Active
                </Typography>
                <LocalShipping sx={{ color: 'info.main', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                  {metrics.activeOrders}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.625rem', mt: 0.5, display: 'block' }}>
                  Orders
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 4 }}>
            <Card variant="outlined" sx={{ height: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2, p: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', noWrap: true }}>
                  Revenue
                </Typography>
                <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2, letterSpacing: '-0.05em' }}>
                  {formatPrice(metrics.monthlyRevenue)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main', mt: 0.5 }}>
                  <ArrowUpward sx={{ fontSize: 10, mr: 0.5 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.625rem', fontWeight: 500 }}>
                    12%
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Quotation Queue */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
              Quotation Queue
            </Typography>
            <Button variant="text" size="small" sx={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 'auto', p: 0 }}>
              View All
            </Button>
          </Box>

          <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, p: 1.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
              <Box sx={{ gridColumn: 'span 2' }}>ID</Box>
              <Box sx={{ gridColumn: 'span 3' }}>Buyer</Box>
              <Box sx={{ gridColumn: 'span 3' }}>Status</Box>
              <Box sx={{ gridColumn: 'span 2', textAlign: 'right' }}>Value</Box>
              <Box sx={{ gridColumn: 'span 2', textAlign: 'center' }}>Action</Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
              {pendingQuotes.map((quote) => {
                const totalValue = quote.items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
                const displayStatus = quote.status === 'pending' ? 'New' : 'Review';
                const chipProps = getStatusChipProps(displayStatus);

                return (
                  <Box key={quote.id} sx={{ p: 1.5, '&:hover': { bgcolor: 'action.hover', transition: 'background-color 0.2s' } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          #QT-{quote.id}
                        </Typography>
                        <Chip
                          label={displayStatus}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            bgcolor: chipProps.bgcolor,
                            color: chipProps.color,
                            border: 1,
                            borderColor: chipProps.borderColor,
                            borderRadius: 1
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500, color: 'text.primary' }}>
                        {formatPrice(totalValue)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <Box sx={{ minWidth: 0, pr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', noWrap: true }}>
                          {quote.company?.companyName || 'Empresa Local'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', noWrap: true, mt: 0.5, maxWidth: 200 }}>
                          {quote.items.length} item(s) • {new Date(quote.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/supplier/quotations/${quote.id}`)}
                        sx={{
                          bgcolor: displayStatus === 'Review' ? 'primary.main' : 'background.paper',
                          color: displayStatus === 'Review' ? 'primary.contrastText' : 'text.primary',
                          border: displayStatus === 'New' ? 1 : 0,
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 0.5,
                          '&:hover': {
                            bgcolor: displayStatus === 'Review' ? 'primary.dark' : 'action.hover'
                          }
                        }}
                      >
                        {displayStatus === 'Review' ? <EditNote fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                      </IconButton>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Card>
        </Box>

        {/* Recent Orders */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
              Recent Orders
            </Typography>
          </Box>

          <Card variant="outlined" sx={{ borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentOrders.map((order, idx) => {
              const progress = order.status === 'delivered' ? 100 : (order.status === 'processing' ? 25 : 75);
              const color = order.status === 'delivered' ? 'primary.main' : (order.status === 'processing' ? 'warning.main' : 'success.main');
              const icon = order.status === 'delivered' ? <LocalShipping /> : (order.status === 'processing' ? <PrecisionManufacturingOutlined /> : <Inventory2Outlined />);
              const iconBg = order.status === 'delivered' ? 'secondary.50' : (order.status === 'processing' ? 'warning.50' : 'primary.50');
              const iconColor = order.status === 'delivered' ? 'secondary.main' : (order.status === 'processing' ? 'warning.main' : 'primary.main');

              return (
                <React.Fragment key={order.id}>
                  {idx > 0 && <Divider />}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { opacity: 0.8 } }} onClick={() => navigate(`/supplier/orders/${order.id}`)}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', noWrap: true }}>
                          Order #{order.id}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          {formatPrice(order.totalAmount)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Box sx={{ width: 96 }}>
                          <Box sx={{ height: 4, width: '100%', bgcolor: 'grey.200', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                            <Box sx={{ height: '100%', bgcolor: color, width: `${progress}%`, borderRadius: 2 }} />
                          </Box>
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: '0.625rem', color: 'text.secondary', textTransform: 'capitalize' }}>
                            {order.status}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontSize: '0.625rem', color: 'text.secondary' }}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </React.Fragment>
              );
            })}
          </Card>
        </Box>

        {/* System Status */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
            System Status
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Catalog Import
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                    Healthy
                  </Typography>
                </Box>
                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
              </Card>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    API Sync
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Idle
                  </Typography>
                </Box>
                <CloudQueue sx={{ color: 'text.disabled', fontSize: 20 }} />
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Fixed Bottom Navigation */}
      <Box sx={{ position: 'fixed', bottom: 0, width: '100%', bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', zIndex: 40, pb: 'env(safe-area-inset-bottom)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-around', py: 1.5, px: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', color: 'primary.main', cursor: 'pointer' }}>
            <DashboardRounded sx={{ fontSize: 24, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: '0.625rem', fontWeight: 500 }}>Dashboard</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => navigate('/supplier/quotations')}>
            <RequestQuoteOutlined sx={{ fontSize: 24, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: '0.625rem', fontWeight: 500 }}>Quotes</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', color: 'text.secondary', cursor: 'pointer', position: 'relative', '&:hover': { color: 'primary.main' } }} onClick={() => navigate('/supplier/orders')}>
            <Box sx={{ position: 'absolute', top: 0, right: '30%', transform: 'translateX(4px)', width: 8, height: 8, bgcolor: 'error.main', borderRadius: '50%' }} />
            <ShoppingBagOutlined sx={{ fontSize: 24, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: '0.625rem', fontWeight: 500 }}>Orders</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => navigate('/supplier/products')}>
            <Inventory2Outlined sx={{ fontSize: 24, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: '0.625rem', fontWeight: 500 }}>Catalog</Typography>
          </Box>
        </Box>
        <Box sx={{ height: 24, width: '100%', bgcolor: 'background.paper' }} />
      </Box>
    </Box>
  );
};

export default SupplierDashboardPage;
