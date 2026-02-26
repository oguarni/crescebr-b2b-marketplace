import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  AttachMoney,
  ShoppingCart,
  Star,
  Visibility,
  PlayArrow,
  Add,
  Inventory,
  Assignment,
  Notifications,
  Analytics,
  Schedule,
  CheckCircle,
  Warning,
  LocalShipping,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  const [loading, setLoading] = useState(true);
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
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load metrics and data in parallel
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
      // These would be API calls to get supplier-specific metrics
      // For now, using placeholder data
      setMetrics({
        totalSales: 156,
        monthlyRevenue: 45600,
        activeOrders: 23,
        averageRating: 4.8,
        totalProducts: 127,
        pendingQuotations: 8,
      });
    } catch (_error) {
      console.error('Error loading metrics:', _error);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const result = await ordersService.getUserOrders();
      // Filter to show only recent orders that need attention
      const recentActiveOrders = result.orders
        .filter((order: Order) => order.status === 'pending' || order.status === 'processing')
        .slice(0, 5);
      setRecentOrders(recentActiveOrders);
    } catch (_error) {
      console.error('Error loading recent orders:', _error);
    }
  };

  const loadPendingQuotations = async () => {
    try {
      // This would need a supplier-specific quotations endpoint
      // For now, using the admin endpoint as placeholder
      const data = await quotationsService.getAllQuotations();
      const pending = data
        .filter((quote: Quotation) => quote.status === 'pending')
        .slice(0, 5);
      setPendingQuotes(pending);
    } catch (_error) {
      console.error('Error loading pending quotations:', _error);
    }
  };

  const loadLowStockProducts = async () => {
    try {
      // This would be a supplier-specific endpoint for inventory
      // For now, using placeholder data
      setLowStockProducts([]);
    } catch (_error) {
      console.error('Error loading low stock products:', _error);
    }
  };

  const handleQuoteAction = async (_quoteId: number, action: 'accept' | 'reject') => {
    try {
      // This would call a supplier quote response endpoint
      toast.success(`Quote ${action}ed successfully`);
      loadPendingQuotations(); // Reload
    } catch (_error) {
      toast.error(`Error ${action}ing quote`);
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, status: string) => {
    try {
      await ordersService.updateOrderStatus(orderId, {
        status: status as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
      });
      toast.success('Order status updated successfully');
      loadRecentOrders(); // Reload
    } catch (_error) {
      toast.error('Error updating order status');
    }
  };

  const getStatusColor = (
    status: string
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'shipped':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display='flex' justifyContent='center' mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='xl' sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant='h4' component='h1' gutterBottom>
          Supplier Dashboard
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          Welcome back, {user?.companyName}! Here's an overview of your business.
        </Typography>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <AttachMoney color='primary' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' gutterBottom variant='body2'>
                    Monthly Revenue
                  </Typography>
                  <Typography variant='h6'>R$ {metrics.monthlyRevenue.toLocaleString()}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <ShoppingCart color='success' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' gutterBottom variant='body2'>
                    Total Sales
                  </Typography>
                  <Typography variant='h6'>{metrics.totalSales}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <LocalShipping color='info' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' gutterBottom variant='body2'>
                    Active Orders
                  </Typography>
                  <Typography variant='h6'>{metrics.activeOrders}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Star color='warning' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' gutterBottom variant='body2'>
                    Rating
                  </Typography>
                  <Typography variant='h6'>{metrics.averageRating.toFixed(1)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Inventory color='secondary' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' gutterBottom variant='body2'>
                    Products
                  </Typography>
                  <Typography variant='h6'>{metrics.totalProducts}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Assignment color='error' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' gutterBottom variant='body2'>
                    Pending Quotes
                  </Typography>
                  <Typography variant='h6'>{metrics.pendingQuotations}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Quick Actions
              </Typography>
              <Box display='flex' gap={2} flexWrap='wrap'>
                <Button
                  variant='contained'
                  startIcon={<Add />}
                  onClick={() => navigate('/supplier/products')}
                >
                  Add Product
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<Inventory />}
                  onClick={() => navigate('/supplier/products')}
                >
                  Manage Inventory
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<Assignment />}
                  onClick={() => navigate('/supplier/quotations')}
                >
                  Process Quotes
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<Analytics />}
                  onClick={() => navigate('/supplier/analytics')}
                >
                  View Analytics
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Card>
        <Box borderBottom={1} borderColor='divider'>
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
            <Tab label='Recent Orders' />
            <Tab label='Pending Quotations' />
            <Tab label='Alerts' />
          </Tabs>
        </Box>

        <CardContent>
          {/* Recent Orders Tab */}
          {selectedTab === 0 && (
            <Box>
              <Typography variant='h6' gutterBottom>
                Recent Orders Requiring Attention
              </Typography>
              {recentOrders.length === 0 ? (
                <Alert severity='info'>No recent orders requiring attention.</Alert>
              ) : (
                <List>
                  {recentOrders.map(order => (
                    <ListItem key={order.id} divider>
                      <ListItemText
                        primary={`Order #${order.id}`}
                        secondary={
                          <Box>
                            <Typography variant='body2' color='text.secondary'>
                              Total: R$ {order.totalAmount.toLocaleString()}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {order.items?.length || 0} items
                            </Typography>
                          </Box>
                        }
                      />
                      <Box display='flex' alignItems='center' gap={1}>
                        <Chip
                          label={order.status}
                          color={getStatusColor(order.status)}
                          size='small'
                        />
                        <IconButton
                          onClick={() => navigate(`/supplier/orders/${order.id}`)}
                          size='small'
                        >
                          <Visibility />
                        </IconButton>
                        {order.status === 'pending' && (
                          <IconButton
                            onClick={() => handleOrderStatusUpdate(order.id, 'processing')}
                            size='small'
                            color='primary'
                          >
                            <PlayArrow />
                          </IconButton>
                        )}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Pending Quotations Tab */}
          {selectedTab === 1 && (
            <Box>
              <Typography variant='h6' gutterBottom>
                Quotation Requests Awaiting Response
              </Typography>
              {pendingQuotes.length === 0 ? (
                <Alert severity='info'>No pending quotation requests.</Alert>
              ) : (
                <List>
                  {pendingQuotes.map(quote => (
                    <ListItem key={quote.id} divider>
                      <ListItemText
                        primary={`Quote Request #${quote.id}`}
                        secondary={
                          <Box>
                            <Typography variant='body2' color='text.secondary'>
                              Company: {quote.company?.companyName}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              Items: {quote.items?.length || 0}
                            </Typography>
                            {quote.requestedDeliveryDate && (
                              <Typography variant='body2' color='text.secondary'>
                                Requested:{' '}
                                {new Date(quote.requestedDeliveryDate).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Box display='flex' gap={1}>
                        <Button
                          size='small'
                          variant='contained'
                          color='success'
                          onClick={() => handleQuoteAction(quote.id, 'accept')}
                        >
                          Accept
                        </Button>
                        <Button
                          size='small'
                          variant='outlined'
                          color='error'
                          onClick={() => handleQuoteAction(quote.id, 'reject')}
                        >
                          Decline
                        </Button>
                        <IconButton
                          onClick={() => navigate(`/supplier/quotations/${quote.id}`)}
                          size='small'
                        >
                          <Visibility />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Alerts Tab */}
          {selectedTab === 2 && (
            <Box>
              <Typography variant='h6' gutterBottom>
                System Alerts & Notifications
              </Typography>
              <Box display='flex' flexDirection='column' gap={2}>
                {lowStockProducts.length > 0 && (
                  <Alert severity='warning' icon={<Warning />}>
                    You have {lowStockProducts.length} products with low inventory.
                  </Alert>
                )}
                {metrics.pendingQuotations > 0 && (
                  <Alert severity='info' icon={<Schedule />}>
                    You have {metrics.pendingQuotations} pending quotation requests that need
                    attention.
                  </Alert>
                )}
                {metrics.activeOrders > 20 && (
                  <Alert severity='success' icon={<CheckCircle />}>
                    Great job! You have {metrics.activeOrders} active orders this month.
                  </Alert>
                )}
                <Alert severity='info' icon={<Notifications />}>
                  Don't forget to update your product availability for optimal customer experience.
                </Alert>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default SupplierDashboardPage;
