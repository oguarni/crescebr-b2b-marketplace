import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  Visibility,
  Edit,
  LocalShipping,
  CheckCircle,
  Schedule,
  Cancel,
  Search,
  Assignment,
  Phone,
  Email,
  LocationOn,
  Business,
  Info,
  PlayArrow,
} from '@mui/icons-material';
import { Order, OrderStatusHistory } from '@shared/types';
import { ordersService } from '../services/ordersService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface StatusUpdateDialog {
  open: boolean;
  order: Order | null;
  newStatus: string;
  trackingNumber: string;
  notes: string;
}

const statusSteps = [
  { value: 'pending', label: 'Pending', icon: <Schedule />, color: 'warning' },
  { value: 'processing', label: 'Processing', icon: <PlayArrow />, color: 'info' },
  { value: 'shipped', label: 'Shipped', icon: <LocalShipping />, color: 'primary' },
  { value: 'delivered', label: 'Delivered', icon: <CheckCircle />, color: 'success' },
];

const SupplierOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<StatusUpdateDialog>({
    open: false,
    order: null,
    newStatus: '',
    trackingNumber: '',
    notes: '',
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistory[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const { user } = useAuth();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ordersService.getUserOrders();
      // Filter to only show orders for products from this supplier
      const supplierOrders = result.orders.filter((order: Order) =>
        order.items?.some(item => item.product?.supplierId === user?.id)
      );
      setOrders(supplierOrders);
    } catch (_error) {
      console.error('Error loading orders:', _error);
      toast.error('Error loading orders');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadOrderHistory = async (orderId: string) => {
    try {
      const result = await ordersService.getOrderHistory(orderId);
      setOrderHistory(result.timeline as unknown as OrderStatusHistory[]);
    } catch (_error) {
      console.error('Error loading order history:', _error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdateDialog.order) return;

    try {
      const updateData = {
        status: statusUpdateDialog.newStatus as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
        notes: statusUpdateDialog.notes || undefined,
        trackingNumber: statusUpdateDialog.trackingNumber || undefined,
      };

      await ordersService.updateOrderStatus(
        statusUpdateDialog.order.id,
        updateData
      );

      toast.success('Order status updated successfully');
      setStatusUpdateDialog({
        open: false,
        order: null,
        newStatus: '',
        trackingNumber: '',
        notes: '',
      });
      loadOrders();
      if (selectedOrder?.id === statusUpdateDialog.order.id) {
        loadOrderHistory(statusUpdateDialog.order.id);
      }
    } catch (_error) {
      toast.error('Error updating order status');
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    await loadOrderHistory(order.id);
    setDetailsDialogOpen(true);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Schedule />;
      case 'processing':
        return <PlayArrow />;
      case 'shipped':
        return <LocalShipping />;
      case 'delivered':
        return <CheckCircle />;
      case 'cancelled':
        return <Cancel />;
      default:
        return <Info />;
    }
  };

  const getNextStatus = (currentStatus: string): string => {
    switch (currentStatus) {
      case 'pending':
        return 'processing';
      case 'processing':
        return 'shipped';
      case 'shipped':
        return 'delivered';
      default:
        return currentStatus;
    }
  };

  const canUpdateStatus = (status: string): boolean => {
    return ['pending', 'processing', 'shipped'].includes(status);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.company?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;

    let matchesDate = true;
    if (dateFilter) {
      const orderDate = new Date(order.createdAt!);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case 'today':
          matchesDate = daysDiff === 0;
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const ordersByStatus = {
    pending: filteredOrders.filter(o => o.status === 'pending'),
    processing: filteredOrders.filter(o => o.status === 'processing'),
    shipped: filteredOrders.filter(o => o.status === 'shipped'),
    delivered: filteredOrders.filter(o => o.status === 'delivered'),
    all: filteredOrders,
  };

  const OrderCard: React.FC<{ order: Order }> = ({ order }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='start' mb={2}>
          <Box>
            <Typography variant='h6'>Order #{order.id}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {order.company?.companyName}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {new Date(order.createdAt!).toLocaleDateString()}
            </Typography>
          </Box>
          <Chip
            label={order.status}
            color={getStatusColor(order.status)}
            icon={getStatusIcon(order.status)}
          />
        </Box>

        <Box mb={2}>
          <Typography variant='body2' color='text.secondary'>
            Items: {order.items?.length || 0} | Total: R$ {order.totalAmount.toLocaleString()}
          </Typography>
          {order.trackingNumber && (
            <Typography variant='body2' color='text.secondary'>
              Tracking: {order.trackingNumber}
            </Typography>
          )}
          {order.estimatedDeliveryDate && (
            <Typography variant='body2' color='text.secondary'>
              Est. Delivery: {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        <Box display='flex' alignItems='center' gap={1}>
          {order.items?.slice(0, 3).map((item, index) => (
            <Chip
              key={index}
              label={`${item.quantity}x ${item.product?.name || 'Product'}`}
              size='small'
              variant='outlined'
            />
          ))}
          {(order.items?.length || 0) > 3 && (
            <Chip
              label={`+${(order.items?.length || 0) - 3} more`}
              size='small'
              variant='outlined'
            />
          )}
        </Box>
      </CardContent>

      <CardActions>
        <Button size='small' startIcon={<Visibility />} onClick={() => handleViewDetails(order)}>
          Details
        </Button>
        {canUpdateStatus(order.status) && (
          <Button
            size='small'
            variant='contained'
            startIcon={getStatusIcon(getNextStatus(order.status))}
            onClick={() =>
              setStatusUpdateDialog({
                open: true,
                order,
                newStatus: getNextStatus(order.status),
                trackingNumber: order.trackingNumber || '',
                notes: '',
              })
            }
          >
            Mark as {getNextStatus(order.status)}
          </Button>
        )}
        <Button
          size='small'
          startIcon={<Edit />}
          onClick={() =>
            setStatusUpdateDialog({
              open: true,
              order,
              newStatus: order.status,
              trackingNumber: order.trackingNumber || '',
              notes: '',
            })
          }
        >
          Update
        </Button>
      </CardActions>
    </Card>
  );

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
          Order Management
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          Track and fulfill your customer orders
        </Typography>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Assignment color='primary' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    Total Orders
                  </Typography>
                  <Typography variant='h6'>{orders.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Schedule color='warning' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    Pending
                  </Typography>
                  <Typography variant='h6'>{ordersByStatus.pending.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <PlayArrow color='info' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    Processing
                  </Typography>
                  <Typography variant='h6'>{ordersByStatus.processing.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <LocalShipping color='primary' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    Shipped
                  </Typography>
                  <Typography variant='h6'>{ordersByStatus.shipped.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems='center'>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                placeholder='Search orders...'
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label='Status'
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <MenuItem value=''>All Status</MenuItem>
                  <MenuItem value='pending'>Pending</MenuItem>
                  <MenuItem value='processing'>Processing</MenuItem>
                  <MenuItem value='shipped'>Shipped</MenuItem>
                  <MenuItem value='delivered'>Delivered</MenuItem>
                  <MenuItem value='cancelled'>Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateFilter}
                  label='Date Range'
                  onChange={e => setDateFilter(e.target.value)}
                >
                  <MenuItem value=''>All Time</MenuItem>
                  <MenuItem value='today'>Today</MenuItem>
                  <MenuItem value='week'>This Week</MenuItem>
                  <MenuItem value='month'>This Month</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 2 }}>
        <Tab label={`All (${ordersByStatus.all.length})`} />
        <Tab label={`Pending (${ordersByStatus.pending.length})`} />
        <Tab label={`Processing (${ordersByStatus.processing.length})`} />
        <Tab label={`Shipped (${ordersByStatus.shipped.length})`} />
        <Tab label={`Delivered (${ordersByStatus.delivered.length})`} />
      </Tabs>

      {/* Orders List */}
      {(() => {
        let displayOrders = ordersByStatus.all;
        if (selectedTab === 1) displayOrders = ordersByStatus.pending;
        if (selectedTab === 2) displayOrders = ordersByStatus.processing;
        if (selectedTab === 3) displayOrders = ordersByStatus.shipped;
        if (selectedTab === 4) displayOrders = ordersByStatus.delivered;

        if (displayOrders.length === 0) {
          return (
            <Alert severity='info' sx={{ mt: 2 }}>
              {selectedTab === 0
                ? 'No orders found.'
                : `No ${
                    selectedTab === 1
                      ? 'pending'
                      : selectedTab === 2
                        ? 'processing'
                        : selectedTab === 3
                          ? 'shipped'
                          : 'delivered'
                  } orders found.`}
            </Alert>
          );
        }

        return displayOrders.map(order => <OrderCard key={order.id} order={order} />);
      })()}

      {/* Status Update Dialog */}
      <Dialog
        open={statusUpdateDialog.open}
        onClose={() => setStatusUpdateDialog({ ...statusUpdateDialog, open: false })}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusUpdateDialog.newStatus}
                label='Status'
                onChange={e =>
                  setStatusUpdateDialog({
                    ...statusUpdateDialog,
                    newStatus: e.target.value,
                  })
                }
              >
                {statusSteps.map(step => (
                  <MenuItem key={step.value} value={step.value}>
                    <Box display='flex' alignItems='center'>
                      {step.icon}
                      <Typography sx={{ ml: 1 }}>{step.label}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(statusUpdateDialog.newStatus === 'shipped' ||
              statusUpdateDialog.newStatus === 'delivered') && (
              <TextField
                fullWidth
                label='Tracking Number'
                value={statusUpdateDialog.trackingNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStatusUpdateDialog({
                    ...statusUpdateDialog,
                    trackingNumber: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              label='Notes (optional)'
              value={statusUpdateDialog.notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStatusUpdateDialog({
                  ...statusUpdateDialog,
                  notes: e.target.value,
                })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateDialog({ ...statusUpdateDialog, open: false })}>
            Cancel
          </Button>
          <Button onClick={handleStatusUpdate} variant='contained'>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Order Details - #{selectedOrder?.id}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Customer Information */}
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' gutterBottom>
                    Customer Information
                  </Typography>
                  <Box display='flex' alignItems='center' mb={1}>
                    <Business sx={{ mr: 1 }} />
                    <Typography>{selectedOrder.company?.companyName}</Typography>
                  </Box>
                  <Box display='flex' alignItems='center' mb={1}>
                    <Email sx={{ mr: 1 }} />
                    <Typography>{selectedOrder.company?.email}</Typography>
                  </Box>
                  {selectedOrder.company?.phone && (
                    <Box display='flex' alignItems='center' mb={1}>
                      <Phone sx={{ mr: 1 }} />
                      <Typography>{selectedOrder.company.phone}</Typography>
                    </Box>
                  )}
                  <Box display='flex' alignItems='start' mb={1}>
                    <LocationOn sx={{ mr: 1, mt: 0.5 }} />
                    <Typography>{selectedOrder.shippingAddress}</Typography>
                  </Box>
                </Grid>

                {/* Order Information */}
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' gutterBottom>
                    Order Information
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Created: {new Date(selectedOrder.createdAt!).toLocaleString()}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Status:{' '}
                    <Chip
                      label={selectedOrder.status}
                      color={getStatusColor(selectedOrder.status)}
                      size='small'
                    />
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Total: R$ {selectedOrder.totalAmount.toLocaleString()}
                  </Typography>
                  {selectedOrder.trackingNumber && (
                    <Typography variant='body2' color='text.secondary'>
                      Tracking: {selectedOrder.trackingNumber}
                    </Typography>
                  )}
                  {selectedOrder.notes && (
                    <Typography variant='body2' color='text.secondary'>
                      Notes: {selectedOrder.notes}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              {/* Order Items */}
              <Typography variant='h6' gutterBottom>
                Order Items
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product?.name || 'Product'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>R$ {item.price.toLocaleString()}</TableCell>
                        <TableCell>R$ {item.totalPrice.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Order History */}
              <Typography variant='h6' gutterBottom>
                Order History
              </Typography>
              <List>
                {orderHistory.map((entry, index) => (
                  <ListItem key={index} divider={index < orderHistory.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `${getStatusColor(entry.toStatus)}.main` }}>
                        {getStatusIcon(entry.toStatus)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant='body1'>
                          {entry.fromStatus && `${entry.fromStatus} → `}
                          {entry.toStatus}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant='body2' color='text.secondary'>
                            {new Date(entry.createdAt!).toLocaleString()}
                          </Typography>
                          {entry.notes && (
                            <Typography variant='body2' color='text.secondary'>
                              {entry.notes}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SupplierOrdersPage;
