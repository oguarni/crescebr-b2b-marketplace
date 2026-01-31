import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack,
  Schedule,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Edit,
} from '@mui/icons-material';
import { Quotation } from '@shared/types';
import { quotationsService } from '../services/quotationsService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const QuotationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuotation = async () => {
      if (!id) return;
      
      try {
        const data = await quotationsService.getQuotationById(parseInt(id));
        setQuotation(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar cotação';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [id, navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processed':
        return 'info';
      case 'completed':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'processed':
        return 'Processada';
      case 'completed':
        return 'Concluída';
      case 'rejected':
        return 'Rejeitada';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <HourglassEmpty />;
      case 'processed':
        return <Schedule />;
      case 'completed':
        return <CheckCircle />;
      case 'rejected':
        return <Cancel />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const calculateTotalReferenceValue = () => {
    if (!quotation) return 0;
    return quotation.items.reduce((total, item) => 
      total + (item.product.price * item.quantity), 0
    );
  };

  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            component={Link}
            to="/"
            startIcon={<ArrowBack />}
          >
            Voltar para Início
          </Button>
        </Box>
      </Container>
    );
  }

  if (!quotation) {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Alert severity="error" sx={{ mb: 4 }}>
            Cotação não encontrada.
          </Alert>
          <Button
            variant="contained"
            component={Link}
            to="/"
            startIcon={<ArrowBack />}
          >
            Voltar ao Início
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            Cotação #{quotation.id}
          </Typography>
          <Chip
            icon={getStatusIcon(quotation.status)}
            label={getStatusLabel(quotation.status)}
            color={getStatusColor(quotation.status) as any}
            size="large"
          />
        </Box>
        <Typography variant="body1" color="text.secondary">
          Solicitada em: {formatDate(quotation.createdAt)}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Customer Information - Only for Admin */}
        {isAdmin && quotation.user && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informações do Cliente
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Email:
                  </Typography>
                  <Typography variant="body1">
                    {quotation.user.email}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    CPF:
                  </Typography>
                  <Typography variant="body1">
                    {quotation.user.cpf}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Endereço:
                  </Typography>
                  <Typography variant="body1">
                    {quotation.user.address}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Quotation Summary */}
        <Grid item xs={12} md={isAdmin ? 6 : 12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumo da Cotação
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total de itens:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {quotation.items.reduce((total, item) => total + item.quantity, 0)} unidades
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Valor de referência total:
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatPrice(calculateTotalReferenceValue())}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                * Valor apenas para referência. O preço final será definido após análise.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Items */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Itens da Cotação
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="center">Quantidade</TableCell>
                      <TableCell align="right">Preço de Referência</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quotation.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              variant="rounded"
                              sx={{ width: 60, height: 60, mr: 2 }}
                            />
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                {item.product.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {item.product.category}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body1" fontWeight="medium">
                            {item.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1">
                            {formatPrice(item.product.price)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" fontWeight="medium">
                            {formatPrice(item.product.price * item.quantity)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Admin Notes */}
        {quotation.adminNotes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Observações do Administrador
                </Typography>
                <Typography variant="body1">
                  {quotation.adminNotes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Actions */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          component={Link}
          to={isAdmin ? '/admin/quotations' : '/my-quotations'}
        >
          Voltar
        </Button>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<Edit />}
            component={Link}
            to={`/admin/quotations`}
          >
            Editar Cotação
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default QuotationDetailPage;