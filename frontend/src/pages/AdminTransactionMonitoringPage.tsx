import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  ShoppingCart,
  Timeline,
  Visibility,
  FileDownload,
  Refresh,
  FilterList,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

interface TransactionData {
  orders: OrderDetail[];
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  totalOrders: number;
}

interface OrderDetail {
  id: string;
  status: string;
  companyId: number;
  quotationId: number;
  totalAmount: number;
  estimatedDeliveryDate?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    companyName: string;
    role: string;
  };
  quotation: {
    id: number;
    totalAmount: number;
    status: string;
  };
}

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  growthRate: number;
}

const AdminTransactionMonitoringPage: React.FC = () => {
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [orderDetailDialog, setOrderDetailDialog] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [statusFilter, setStatusFilter] = useState('');

  const loadTransactionData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params: Record<string, string> = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (statusFilter) params.status = statusFilter;

      const response = await authService.adminRequest('/admin/transaction-monitoring', {
        params,
      });

      setTransactionData(response.data);

      // Calculate metrics
      const data = response.data;
      const calculateMetrics = (): DashboardMetrics => {
        const totalOrders = data.totalOrders;
        const totalRevenue = data.totalRevenue;
        const pendingOrders = data.ordersByStatus.pending || 0;
        const completedOrders = data.ordersByStatus.delivered || 0;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Mock growth rate calculation (in a real app, you'd compare with previous period)
        const growthRate = 15.3; // Example growth rate

        return {
          totalRevenue,
          totalOrders,
          pendingOrders,
          completedOrders,
          averageOrderValue,
          growthRate,
        };
      };

      setMetrics(calculateMetrics());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading transaction data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dateRange, statusFilter]);

  useEffect(() => {
    loadTransactionData();
  }, [loadTransactionData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'info';
      case 'processing':
        return 'warning';
      case 'pending':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pendente',
      processing: 'Processando',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  // Generate chart data
  const generateRevenueChartData = () => {
    if (!transactionData?.orders) return [];

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const dayOrders = transactionData.orders.filter(
        order => order.createdAt.split('T')[0] === date
      );
      const revenue = dayOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

      return {
        date: new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        revenue,
        orders: dayOrders.length,
      };
    });
  };

  // Generate pie chart data for order status
  const generateStatusPieData = () => {
    if (!transactionData?.ordersByStatus) return [];

    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return Object.entries(transactionData.ordersByStatus).map(([status, count], index) => ({
      name: getStatusLabel(status),
      value: count,
      fill: colors[index % colors.length],
    }));
  };

  const handleExportData = () => {
    if (!transactionData) return;

    const csvData = transactionData.orders.map(order => ({
      'ID do Pedido': order.id,
      Empresa: order.user.companyName,
      Status: getStatusLabel(order.status),
      'Valor Total': order.totalAmount,
      'Data de Criação': formatDate(order.createdAt),
      'Data de Entrega': order.estimatedDeliveryDate
        ? formatDate(order.estimatedDeliveryDate)
        : 'N/A',
      'Número de Rastreamento': order.trackingNumber || 'N/A',
    }));

    // Simple CSV export (in a real app, you'd use a proper CSV library)
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes_${dateRange.startDate}_${dateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Relatório exportado com sucesso!');
  };

  if (loading && !transactionData) {
    return (
      <Container maxWidth='lg'>
        <Box display='flex' justifyContent='center' alignItems='center' minHeight='50vh'>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const revenueChartData = generateRevenueChartData();
  const statusPieData = generateStatusPieData();

  return (
    <Container maxWidth='lg'>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant='h4' component='h1'>
            Monitoramento de Transações
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              startIcon={<Refresh />}
              onClick={loadTransactionData}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button
              variant='contained'
              startIcon={<FileDownload />}
              onClick={handleExportData}
              disabled={!transactionData?.orders.length}
            >
              Exportar
            </Button>
          </Box>
        </Box>
        <Typography variant='body1' color='text.secondary'>
          Acompanhe as vendas, receitas e tendências do marketplace
        </Typography>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography
            variant='h6'
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <FilterList /> Filtros
          </Typography>
          <Grid container spacing={3} alignItems='center'>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label='Data Inicial'
                type='date'
                value={dateRange.startDate}
                onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label='Data Final'
                type='date'
                value={dateRange.endDate}
                onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
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
                  <MenuItem value=''>Todos</MenuItem>
                  <MenuItem value='pending'>Pendente</MenuItem>
                  <MenuItem value='processing'>Processando</MenuItem>
                  <MenuItem value='shipped'>Enviado</MenuItem>
                  <MenuItem value='delivered'>Entregue</MenuItem>
                  <MenuItem value='cancelled'>Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant='outlined'
                onClick={loadTransactionData}
                sx={{ height: '56px' }}
              >
                Aplicar Filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography color='textSecondary' gutterBottom variant='body2'>
                      Receita Total
                    </Typography>
                    <Typography variant='h4'>{formatCurrency(metrics.totalRevenue)}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} fontSize='small' />
                      <Typography variant='body2' sx={{ color: 'success.main' }}>
                        +{metrics.growthRate}%
                      </Typography>
                    </Box>
                  </Box>
                  <AttachMoney sx={{ fontSize: 40, color: 'primary.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography color='textSecondary' gutterBottom variant='body2'>
                      Total de Pedidos
                    </Typography>
                    <Typography variant='h4'>{metrics.totalOrders}</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                      {metrics.pendingOrders} pendentes
                    </Typography>
                  </Box>
                  <ShoppingCart sx={{ fontSize: 40, color: 'info.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography color='textSecondary' gutterBottom variant='body2'>
                      Valor Médio do Pedido
                    </Typography>
                    <Typography variant='h4'>
                      {formatCurrency(metrics.averageOrderValue)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                      Por pedido
                    </Typography>
                  </Box>
                  <Timeline sx={{ fontSize: 40, color: 'warning.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography color='textSecondary' gutterBottom variant='body2'>
                      Taxa de Conclusão
                    </Typography>
                    <Typography variant='h4'>
                      {metrics.totalOrders > 0
                        ? Math.round((metrics.completedOrders / metrics.totalOrders) * 100)
                        : 0}
                      %
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                      {metrics.completedOrders} entregues
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Receita dos Últimos 30 Dias
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='date' />
                    <YAxis tickFormatter={value => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={value => [formatCurrency(value as number), 'Receita']} />
                    <Line type='monotone' dataKey='revenue' stroke='#1976d2' strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Status dos Pedidos
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx='50%'
                      cy='50%'
                      outerRadius={80}
                      dataKey='value'
                      label={entry => `${entry.name}: ${entry.value}`}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Orders Table */}
      <Card>
        <CardContent>
          <Typography variant='h6' gutterBottom>
            Transações Recentes
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID do Pedido</TableCell>
                  <TableCell>Empresa</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align='right'>Valor</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell align='center'>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactionData?.orders.slice(0, 10).map(order => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant='body2' fontFamily='monospace'>
                        #{order.id.slice(0, 8)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant='subtitle2'>{order.user.companyName}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {order.user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(order.status)}
                        size='small'
                        color={getStatusColor(order.status) as any}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='subtitle2' color='primary'>
                        {formatCurrency(parseFloat(order.totalAmount))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{formatDate(order.createdAt)}</Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <IconButton
                        size='small'
                        onClick={() => {
                          setSelectedOrder(order);
                          setOrderDetailDialog(true);
                        }}
                        title='Ver detalhes'
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {(!transactionData?.orders || transactionData.orders.length === 0) && (
            <Box textAlign='center' py={4}>
              <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant='h6' color='text.secondary' gutterBottom>
                Nenhuma transação encontrada
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Ajuste os filtros para ver mais transações
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog
        open={orderDetailDialog}
        onClose={() => setOrderDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Detalhes do Pedido #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant='subtitle2'>Empresa</Typography>
                  <Typography variant='body2' sx={{ mb: 2 }}>
                    {selectedOrder.user.companyName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant='subtitle2'>Email</Typography>
                  <Typography variant='body2' sx={{ mb: 2 }}>
                    {selectedOrder.user.email}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant='subtitle2'>Status</Typography>
                  <Chip
                    label={getStatusLabel(selectedOrder.status)}
                    size='small'
                    color={getStatusColor(selectedOrder.status) as any}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant='subtitle2'>Valor Total</Typography>
                  <Typography variant='h6' color='primary' sx={{ mb: 2 }}>
                    {formatCurrency(parseFloat(selectedOrder.totalAmount))}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant='subtitle2'>Data de Criação</Typography>
                  <Typography variant='body2' sx={{ mb: 2 }}>
                    {formatDate(selectedOrder.createdAt)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant='subtitle2'>Data de Entrega Estimada</Typography>
                  <Typography variant='body2' sx={{ mb: 2 }}>
                    {selectedOrder.estimatedDeliveryDate
                      ? formatDate(selectedOrder.estimatedDeliveryDate)
                      : 'Não definida'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant='subtitle2'>Número de Rastreamento</Typography>
                  <Typography variant='body2' sx={{ mb: 2 }}>
                    {selectedOrder.trackingNumber || 'Não disponível'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant='subtitle2'>ID da Cotação</Typography>
                  <Typography variant='body2' sx={{ mb: 2 }}>
                    #{selectedOrder.quotationId}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDetailDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminTransactionMonitoringPage;
