import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Receipt,
  LocalShipping,
  Visibility,
  Timeline as TimelineIcon,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Engineering,
  Close,
} from '@mui/icons-material';
import { Order } from '@shared/types';
import { ordersService } from '../services/ordersService';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../hooks';
import toast from 'react-hot-toast';
import { useLanguage, useT } from '../contexts/LanguageContext';
import { orderTimelineDescription } from '../utils/orderStatus';
import { formatOrderNumber } from '../utils/orderNumber';
import { orderStatusLabel } from '../utils/orderStatus';
import { dateLocaleFor } from '../utils/supplierDashboard';

interface OrderHistory {
  order: Order;
  timeline: Array<{
    status: string;
    description: string;
    date: Date;
    canTransitionTo: string[];
  }>;
}

const ORDER_STATUS_OPTIONS: readonly Order['status'][] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const MyOrdersPage: React.FC = () => {
  const t = useT();
  const { language } = useLanguage();
  const formatOrderDate = (date: Date | string): string =>
    new Date(date).toLocaleDateString(dateLocaleFor(language), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistory | null>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    orders,
    loading,
    pagination,
    error: ordersError,
  } = useOrders({
    status: statusFilter || undefined,
    page: currentPage,
    limit: 10,
  });
  const totalPages = pagination.totalPages;

  useEffect(() => {
    if (ordersError) toast.error('Erro ao carregar pedidos');
  }, [ordersError]);

  const handleViewTimeline = async (order: Order) => {
    setSelectedOrder(order);
    setTimelineLoading(true);
    setTimelineDialogOpen(true);

    try {
      const history = await ordersService.getOrderHistory(order.id);
      setOrderHistory(history);
    } catch (_error) {
      toast.error(t('myOrders.historyError'));
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleCloseTimeline = () => {
    setTimelineDialogOpen(false);
    setSelectedOrder(null);
    setOrderHistory(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <HourglassEmpty />;
      case 'processing':
        return <Engineering />;
      case 'shipped':
        return <LocalShipping />;
      case 'delivered':
        return <CheckCircle />;
      case 'cancelled':
        return <Cancel />;
      default:
        return <Receipt />;
    }
  };

  const getTimelineDotColor = (
    status: string
  ): 'grey' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const color = ordersService.getStatusColor(status);
    return color === 'default' ? 'grey' : color;
  };

  if (user?.role !== 'customer') {
    return (
      <Container maxWidth='md'>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Alert severity='error' sx={{ mb: 4 }}>
            Acesso negado. Apenas clientes podem visualizar pedidos.
          </Alert>
          <Button variant='contained' onClick={() => navigate('/')}>
            {t('common.backHome')}
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='lg'>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant='h4'
          component='h1'
          gutterBottom
          sx={{ fontSize: { xs: '1.6rem', sm: '2.125rem' } }}
        >
          {t('myOrders.title')}
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          {t('myOrders.subtitle')}
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems='center'>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id='order-status-filter-label'>{t('myOrders.status')}</InputLabel>
                <Select
                  labelId='order-status-filter-label'
                  value={statusFilter}
                  label={t('myOrders.status')}
                  onChange={e => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <MenuItem value=''>{t('myOrders.allStatuses')}</MenuItem>
                  {ORDER_STATUS_OPTIONS.map(status => (
                    <MenuItem key={status} value={status}>
                      {orderStatusLabel(t, status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                variant='outlined'
                onClick={() => {
                  setStatusFilter('');
                  setCurrentPage(1);
                }}
              >
                {t('myOrders.clearFilters')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant='h6' color='text.secondary' gutterBottom>
              {t('myOrders.emptyTitle')}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              {statusFilter
                ? t('myOrders.emptyFiltered', {
                    status: orderStatusLabel(t, statusFilter),
                  })
                : t('myOrders.emptyNoOrders')}
            </Typography>
            <Button variant='contained' onClick={() => navigate('/')}>
              {t('myOrders.exploreProducts')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('myOrders.columns.order')}</TableCell>
                      <TableCell>{t('myOrders.status')}</TableCell>
                      <TableCell align='right'>{t('myOrders.columns.total')}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('myOrders.columns.placedOn')}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('myOrders.columns.estimatedDelivery')}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('myOrders.columns.tracking')}
                      </TableCell>
                      <TableCell align='center'>{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order.id} hover>
                        <TableCell>
                          <Typography variant='body2' fontWeight='medium'>
                            {formatOrderNumber(order.id)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(order.status)}
                            label={orderStatusLabel(t, order.status)}
                            color={ordersService.getStatusColor(order.status)}
                            size='small'
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' fontWeight='medium'>
                            {ordersService.formatPrice(order.totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant='body2'>
                            {formatOrderDate(order.createdAt!)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant='body2'>
                            {order.estimatedDeliveryDate
                              ? formatOrderDate(order.estimatedDeliveryDate)
                              : t('myOrders.toBeDefined')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          {order.trackingNumber ? (
                            <Chip label={order.trackingNumber} size='small' variant='outlined' />
                          ) : (
                            <Typography variant='body2' color='text.secondary'>
                              {t('myOrders.noTracking')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title={t('myOrders.viewTimeline')}>
                              <IconButton
                                size='small'
                                aria-label={t('myOrders.viewTimelineAria', {
                                  order: formatOrderNumber(order.id),
                                })}
                                onClick={() => handleViewTimeline(order)}
                              >
                                <TimelineIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('myOrders.viewQuotation')}>
                              <IconButton
                                size='small'
                                aria-label={t('myOrders.viewQuotationAria', {
                                  order: formatOrderNumber(order.id),
                                })}
                                onClick={() => navigate(`/quotations/${order.quotationId}`)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color='primary'
              />
            </Box>
          )}
        </>
      )}

      {/* Order Timeline Dialog */}
      <Dialog open={timelineDialogOpen} onClose={handleCloseTimeline} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h6'>
              {t('myOrders.timelineTitle', {
                order: selectedOrder ? formatOrderNumber(selectedOrder.id) : '',
              })}
            </Typography>
            <IconButton onClick={handleCloseTimeline} aria-label={t('common.close')}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {timelineLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : orderHistory ? (
            <>
              {/* Order Summary */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('myOrders.currentStatus')}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(orderHistory.order.status)}
                        label={orderStatusLabel(t, orderHistory.order.status)}
                        color={ordersService.getStatusColor(orderHistory.order.status)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('myOrders.orderTotal')}
                      </Typography>
                      <Typography variant='h6' color='primary'>
                        {ordersService.formatPrice(orderHistory.order.totalAmount)}
                      </Typography>
                    </Grid>
                    {orderHistory.order.trackingNumber && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='body2' color='text.secondary'>
                          {t('myOrders.trackingCode')}
                        </Typography>
                        <Typography variant='body1' fontWeight='medium'>
                          {orderHistory.order.trackingNumber}
                        </Typography>
                      </Grid>
                    )}
                    {orderHistory.order.estimatedDeliveryDate && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='body2' color='text.secondary'>
                          {t('myOrders.columns.estimatedDelivery')}
                        </Typography>
                        <Typography variant='body1' fontWeight='medium'>
                          {formatOrderDate(orderHistory.order.estimatedDeliveryDate)}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Timeline>
                {orderHistory.timeline.map((item, index) => (
                  <TimelineItem key={index}>
                    <TimelineOppositeContent color='text.secondary'>
                      {formatOrderDate(item.date)}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color={getTimelineDotColor(item.status)}>
                        {getStatusIcon(item.status)}
                      </TimelineDot>
                      {index < orderHistory.timeline.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant='h6'>{orderStatusLabel(t, item.status)}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {orderTimelineDescription(t, item.status, item.description)}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </>
          ) : (
            <Alert severity='error'>{t('myOrders.historyError')}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTimeline}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyOrdersPage;
