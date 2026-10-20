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
import { Order } from '@shared/types';
import { ordersService, type OrderTimelineEntry } from '../services/ordersService';
import toast from 'react-hot-toast';
import { formatBRL } from '../utils/currency';
import { browserLogger } from '../utils/browserLogger';
import { useT } from '../contexts/LanguageContext';
import type { TranslationKey } from '../locales';
import { orderStatusLabel, orderTimelineDescription } from '../utils/orderStatus';

interface StatusUpdateDialog {
  open: boolean;
  order: Order | null;
  newStatus: string;
  trackingNumber: string;
  nfeAccessKey: string;
  notes: string;
}

const statusSteps = [
  { value: 'pending', icon: <Schedule />, color: 'warning' },
  { value: 'processing', icon: <PlayArrow />, color: 'info' },
  { value: 'shipped', icon: <LocalShipping />, color: 'primary' },
  { value: 'delivered', icon: <CheckCircle />, color: 'success' },
];

/**
 * Order of the status tabs. Indexes into the grouped orders and into the
 * `supplierOrders.tabs.*` / `.empty.*` dictionary sections, so it must stay in
 * step with the rendered Tabs.
 */
const TAB_KEYS = ['all', 'pending', 'processing', 'shipped', 'delivered'] as const;

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

/** Label of the one-click action that advances an order to its next status. */
const NEXT_ACTION_KEYS: Record<string, TranslationKey> = {
  pending: 'supplierOrders.next.processing',
  processing: 'supplierOrders.next.shipped',
  shipped: 'supplierOrders.next.delivered',
};

const canUpdateStatus = (status: string): boolean => status in NEXT_ACTION_KEYS;

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onOpenStatusDialog: (order: Order, newStatus: string) => void;
}

/**
 * Summary card for a single order in the supplier queue.
 *
 * Declared at module scope on purpose: defining it inside SupplierOrdersPage
 * gave React a new component type on every render, remounting each card and
 * discarding its DOM state (and focus) on any parent state change.
 *
 * @example
 * <OrderCard
 *   order={order}
 *   onViewDetails={handleViewDetails}
 *   onOpenStatusDialog={handleOpenStatusDialog}
 * />
 */
const OrderCard: React.FC<OrderCardProps> = ({ order, onViewDetails, onOpenStatusDialog }) => {
  const t = useT();
  const nextStatus = getNextStatus(order.status);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='start' mb={2}>
          <Box>
            <Typography variant='h6'>{t('supplierOrders.orderTitle', { id: order.id })}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {order.company?.companyName}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {new Date(order.createdAt!).toLocaleDateString()}
            </Typography>
          </Box>
          <Chip
            label={orderStatusLabel(t, order.status)}
            color={getStatusColor(order.status)}
            icon={getStatusIcon(order.status)}
          />
        </Box>

        <Box mb={2}>
          <Typography variant='body2' color='text.secondary'>
            {t('supplierOrders.itemsAndTotal', {
              count: order.items?.length || 0,
              total: formatBRL(order.totalAmount),
            })}
          </Typography>
          {order.trackingNumber && (
            <Typography variant='body2' color='text.secondary'>
              {t('supplierOrders.tracking', { code: order.trackingNumber })}
            </Typography>
          )}
          {order.estimatedDeliveryDate && (
            <Typography variant='body2' color='text.secondary'>
              {t('supplierOrders.estimatedDelivery', {
                date: new Date(order.estimatedDeliveryDate).toLocaleDateString(),
              })}
            </Typography>
          )}
        </Box>

        <Box display='flex' alignItems='center' gap={1}>
          {order.items?.slice(0, 3).map((item, index) => (
            <Chip
              key={index}
              label={`${item.quantity}x ${item.product?.name || t('supplierOrders.productFallback')}`}
              size='small'
              variant='outlined'
            />
          ))}
          {(order.items?.length || 0) > 3 && (
            <Chip
              label={t('supplierOrders.moreItems', { count: (order.items?.length || 0) - 3 })}
              size='small'
              variant='outlined'
            />
          )}
        </Box>
      </CardContent>

      <CardActions>
        <Button size='small' startIcon={<Visibility />} onClick={() => onViewDetails(order)}>
          {t('supplierOrders.details')}
        </Button>
        {canUpdateStatus(order.status) && (
          <Button
            size='small'
            variant='contained'
            startIcon={getStatusIcon(nextStatus)}
            onClick={() => onOpenStatusDialog(order, nextStatus)}
          >
            {t(NEXT_ACTION_KEYS[order.status])}
          </Button>
        )}
        <Button
          size='small'
          startIcon={<Edit />}
          onClick={() => onOpenStatusDialog(order, order.status)}
        >
          {t('supplierOrders.update')}
        </Button>
      </CardActions>
    </Card>
  );
};

const SupplierOrdersPage: React.FC = () => {
  const t = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<StatusUpdateDialog>({
    open: false,
    order: null,
    newStatus: '',
    trackingNumber: '',
    nfeAccessKey: '',
    notes: '',
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderTimelineEntry[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Deliberately not filtered by supplier here. getUserOrders is already
      // scoped server-side — OrderStatusService resolves a supplier's orders
      // through QuotationItem -> Product.supplierId so other suppliers' orders
      // never reach the client. The filter that used to sit here read
      // order.items, a field this endpoint does not return, so it discarded
      // every order and the screen was permanently empty.
      const result = await ordersService.getUserOrders();
      setOrders(result.orders);
    } catch (_error) {
      browserLogger.error('Failed to load orders', { error: _error });
      toast.error(t('supplierOrders.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadOrderHistory = async (orderId: string) => {
    try {
      const result = await ordersService.getOrderHistory(orderId);
      setOrderHistory(result.timeline);
    } catch (_error) {
      browserLogger.error('Failed to load order history', { error: _error });
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdateDialog.order) return;

    try {
      const updateData = {
        status: statusUpdateDialog.newStatus as
          'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
        notes: statusUpdateDialog.notes || undefined,
        trackingNumber: statusUpdateDialog.trackingNumber || undefined,
        nfeAccessKey: statusUpdateDialog.nfeAccessKey || undefined,
      };

      await ordersService.updateOrderStatus(statusUpdateDialog.order.id, updateData);

      toast.success(t('supplierOrders.updateSuccess'));
      setStatusUpdateDialog({
        open: false,
        order: null,
        newStatus: '',
        trackingNumber: '',
        nfeAccessKey: '',
        notes: '',
      });
      loadOrders();
      if (selectedOrder?.id === statusUpdateDialog.order.id) {
        loadOrderHistory(statusUpdateDialog.order.id);
      }
    } catch (_error) {
      toast.error(t('supplierOrders.updateError'));
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    await loadOrderHistory(order.id);
    setDetailsDialogOpen(true);
  };

  const handleOpenStatusDialog = (order: Order, newStatus: string) => {
    setStatusUpdateDialog({
      open: true,
      order,
      newStatus,
      trackingNumber: order.trackingNumber || '',
      nfeAccessKey: order.nfeAccessKey || '',
      notes: '',
    });
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
          {t('supplierOrders.title')}
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          {t('supplierOrders.subtitle')}
        </Typography>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Assignment color='primary' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    {t('supplierOrders.totalOrders')}
                  </Typography>
                  <Typography variant='h6'>{orders.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Schedule color='warning' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    {orderStatusLabel(t, 'pending')}
                  </Typography>
                  <Typography variant='h6'>{ordersByStatus.pending.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <PlayArrow color='info' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    {orderStatusLabel(t, 'processing')}
                  </Typography>
                  <Typography variant='h6'>{ordersByStatus.processing.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <LocalShipping color='primary' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    {orderStatusLabel(t, 'shipped')}
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
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                placeholder={t('supplierOrders.searchPlaceholder')}
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
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth>
                <InputLabel>{t('supplierOrders.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('supplierOrders.status')}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <MenuItem value=''>{t('supplierOrders.allStatus')}</MenuItem>
                  {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(
                    status => (
                      <MenuItem key={status} value={status}>
                        {orderStatusLabel(t, status)}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth>
                <InputLabel>{t('supplierOrders.dateRange')}</InputLabel>
                <Select
                  value={dateFilter}
                  label={t('supplierOrders.dateRange')}
                  onChange={e => setDateFilter(e.target.value)}
                >
                  <MenuItem value=''>{t('supplierOrders.allTime')}</MenuItem>
                  <MenuItem value='today'>{t('supplierOrders.today')}</MenuItem>
                  <MenuItem value='week'>{t('supplierOrders.thisWeek')}</MenuItem>
                  <MenuItem value='month'>{t('supplierOrders.thisMonth')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 2 }}>
        {TAB_KEYS.map(key => (
          <Tab
            key={key}
            label={t(`supplierOrders.tabs.${key}`, { count: ordersByStatus[key].length })}
          />
        ))}
      </Tabs>

      {/* Orders List */}
      {(() => {
        const tabKey = TAB_KEYS[selectedTab];
        const displayOrders = ordersByStatus[tabKey];

        if (displayOrders.length === 0) {
          return (
            <Alert severity='info' sx={{ mt: 2 }}>
              {t(`supplierOrders.empty.${tabKey}`)}
            </Alert>
          );
        }

        return displayOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onViewDetails={handleViewDetails}
            onOpenStatusDialog={handleOpenStatusDialog}
          />
        ));
      })()}

      {/* Status Update Dialog */}
      <Dialog
        open={statusUpdateDialog.open}
        onClose={() => setStatusUpdateDialog({ ...statusUpdateDialog, open: false })}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('supplierOrders.dialog.title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('supplierOrders.status')}</InputLabel>
              <Select
                value={statusUpdateDialog.newStatus}
                label={t('supplierOrders.status')}
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
                      <Typography sx={{ ml: 1 }}>{orderStatusLabel(t, step.value)}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(statusUpdateDialog.newStatus === 'shipped' ||
              statusUpdateDialog.newStatus === 'delivered') && (
              <TextField
                fullWidth
                label={t('supplierOrders.dialog.trackingNumber')}
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

            {statusUpdateDialog.newStatus === 'shipped' && (
              <TextField
                fullWidth
                required
                label={t('supplierOrders.dialog.nfeKey')}
                value={statusUpdateDialog.nfeAccessKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStatusUpdateDialog({
                    ...statusUpdateDialog,
                    nfeAccessKey: e.target.value.replace(/\D/g, '').slice(0, 44),
                  })
                }
                // No maxLength: it counts raw characters, so pasting a key
                // written with separators truncated it mid-key and left the
                // gate shut with nothing on screen to explain why. onChange
                // already strips non-digits and caps the result at 44.
                inputProps={{ inputMode: 'numeric' }}
                helperText={t('supplierOrders.dialog.nfeHelp')}
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('supplierOrders.dialog.notes')}
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
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleStatusUpdate}
            variant='contained'
            disabled={
              statusUpdateDialog.newStatus === 'shipped' &&
              (!statusUpdateDialog.trackingNumber.trim() ||
                statusUpdateDialog.nfeAccessKey.length !== 44)
            }
          >
            {t('supplierOrders.dialog.submit')}
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
        <DialogTitle>
          {t('supplierOrders.detailsDialog.title', { id: selectedOrder?.id ?? '' })}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Customer Information */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='h6' gutterBottom>
                    {t('supplierOrders.detailsDialog.customer')}
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
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='h6' gutterBottom>
                    {t('supplierOrders.detailsDialog.order')}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {t('supplierOrders.detailsDialog.created', {
                      date: new Date(selectedOrder.createdAt!).toLocaleString(),
                    })}
                  </Typography>
                  <Typography component='div' variant='body2' color='text.secondary'>
                    {t('supplierOrders.detailsDialog.status')}{' '}
                    <Chip
                      label={orderStatusLabel(t, selectedOrder.status)}
                      color={getStatusColor(selectedOrder.status)}
                      size='small'
                    />
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {t('supplierOrders.detailsDialog.total', {
                      total: formatBRL(selectedOrder.totalAmount),
                    })}
                  </Typography>
                  {selectedOrder.trackingNumber && (
                    <Typography variant='body2' color='text.secondary'>
                      {t('supplierOrders.tracking', { code: selectedOrder.trackingNumber })}
                    </Typography>
                  )}
                  {selectedOrder.notes && (
                    <Typography variant='body2' color='text.secondary'>
                      {t('supplierOrders.detailsDialog.notes', { notes: selectedOrder.notes })}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              {/* Order Items */}
              <Typography variant='h6' gutterBottom>
                {t('supplierOrders.detailsDialog.items')}
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('supplierOrders.detailsDialog.product')}</TableCell>
                      <TableCell>{t('supplierOrders.detailsDialog.quantity')}</TableCell>
                      <TableCell>{t('supplierOrders.detailsDialog.price')}</TableCell>
                      <TableCell>{t('supplierOrders.detailsDialog.lineTotal')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {item.product?.name || t('supplierOrders.productFallback')}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatBRL(item.price)}</TableCell>
                        <TableCell>{formatBRL(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Order History */}
              <Typography variant='h6' gutterBottom>
                {t('supplierOrders.detailsDialog.history')}
              </Typography>
              <List>
                {orderHistory.map((entry, index) => (
                  <ListItem key={index} divider={index < orderHistory.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `${getStatusColor(entry.status)}.main` }}>
                        {getStatusIcon(entry.status)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      disableTypography
                      primary={
                        <Typography variant='body1'>{orderStatusLabel(t, entry.status)}</Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant='body2' color='text.secondary'>
                            {new Date(entry.date).toLocaleString()}
                          </Typography>
                          {entry.description && (
                            <Typography variant='body2' color='text.secondary'>
                              {orderTimelineDescription(t, entry.status, entry.description)}
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
          <Button onClick={() => setDetailsDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SupplierOrdersPage;
