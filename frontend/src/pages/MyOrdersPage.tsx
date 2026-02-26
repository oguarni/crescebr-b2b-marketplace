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
import toast from 'react-hot-toast';

interface OrderHistory {
  order: Order;
  timeline: Array<{
    status: string;
    description: string;
    date: Date;
    canTransitionTo: string[];
  }>;
}

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistory | null>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'customer') {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [user, statusFilter, currentPage]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await ordersService.getUserOrders({
        status: statusFilter || undefined,
        page: currentPage,
        limit: 10,
      });

      setOrders(response.orders);
      setTotalPages(response.pagination.totalPages);
    } catch (_error) {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTimeline = async (order: Order) => {
    setSelectedOrder(order);
    setTimelineLoading(true);
    setTimelineDialogOpen(true);

    try {
      const history = await ordersService.getOrderHistory(order.id);
      setOrderHistory(history);
    } catch (_error) {
      toast.error('Erro ao carregar histórico do pedido');
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
            Voltar ao Início
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='lg'>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' gutterBottom>
          Meus Pedidos
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          Acompanhe o status e histórico dos seus pedidos
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems='center'>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label='Status'
                  onChange={e => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <MenuItem value=''>Todos</MenuItem>
                  <MenuItem value='pending'>Pendente</MenuItem>
                  <MenuItem value='processing'>Processando</MenuItem>
                  <MenuItem value='shipped'>Enviado</MenuItem>
                  <MenuItem value='delivered'>Entregue</MenuItem>
                  <MenuItem value='cancelled'>Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant='outlined'
                onClick={() => {
                  setStatusFilter('');
                  setCurrentPage(1);
                }}
              >
                Limpar Filtros
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
              Nenhum pedido encontrado
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              {statusFilter
                ? `Não há pedidos com status "${ordersService.getStatusLabel(statusFilter)}"`
                : 'Você ainda não fez nenhum pedido'}
            </Typography>
            <Button variant='contained' onClick={() => navigate('/')}>
              Explorar Produtos
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
                      <TableCell>ID do Pedido</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align='right'>Total</TableCell>
                      <TableCell>Data do Pedido</TableCell>
                      <TableCell>Entrega Estimada</TableCell>
                      <TableCell>Rastreamento</TableCell>
                      <TableCell align='center'>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order.id} hover>
                        <TableCell>
                          <Typography variant='body2' fontWeight='medium'>
                            #{order.id.slice(0, 8)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(order.status)}
                            label={ordersService.getStatusLabel(order.status)}
                            color={ordersService.getStatusColor(order.status)}
                            size='small'
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' fontWeight='medium'>
                            {ordersService.formatPrice(order.totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>
                            {ordersService.formatDate(order.createdAt!)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>
                            {order.estimatedDeliveryDate
                              ? ordersService.formatDate(order.estimatedDeliveryDate)
                              : 'A definir'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {order.trackingNumber ? (
                            <Chip
                              label={order.trackingNumber}
                              size='small'
                              variant='outlined'
                              clickable
                            />
                          ) : (
                            <Typography variant='body2' color='text.secondary'>
                              Sem rastreamento
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title='Ver Timeline'>
                              <IconButton size='small' onClick={() => handleViewTimeline(order)}>
                                <TimelineIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Ver Detalhes'>
                              <IconButton
                                size='small'
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
              Timeline do Pedido #{selectedOrder?.id.slice(0, 8)}
            </Typography>
            <IconButton onClick={handleCloseTimeline}>
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
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>
                        Status Atual
                      </Typography>
                      <Chip
                        icon={getStatusIcon(orderHistory.order.status)}
                        label={ordersService.getStatusLabel(orderHistory.order.status)}
                        color={ordersService.getStatusColor(orderHistory.order.status)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>
                        Total do Pedido
                      </Typography>
                      <Typography variant='h6' color='primary'>
                        {ordersService.formatPrice(orderHistory.order.totalAmount)}
                      </Typography>
                    </Grid>
                    {orderHistory.order.trackingNumber && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant='body2' color='text.secondary'>
                          Código de Rastreamento
                        </Typography>
                        <Typography variant='body1' fontWeight='medium'>
                          {orderHistory.order.trackingNumber}
                        </Typography>
                      </Grid>
                    )}
                    {orderHistory.order.estimatedDeliveryDate && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant='body2' color='text.secondary'>
                          Entrega Estimada
                        </Typography>
                        <Typography variant='body1' fontWeight='medium'>
                          {ordersService.formatDate(orderHistory.order.estimatedDeliveryDate)}
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
                      {ordersService.formatDate(item.date)}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color={getTimelineDotColor(item.status)}>
                        {getStatusIcon(item.status)}
                      </TimelineDot>
                      {index < orderHistory.timeline.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant='h6'>
                        {ordersService.getStatusLabel(item.status)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {item.description}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </>
          ) : (
            <Alert severity='error'>Erro ao carregar histórico do pedido</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTimeline}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyOrdersPage;
