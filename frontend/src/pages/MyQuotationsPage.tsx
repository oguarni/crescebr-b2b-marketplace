import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from '@mui/material';
import {
  ArrowBack,
  Visibility,
  Schedule,
  CheckCircle,
  Cancel,
  HourglassEmpty,
} from '@mui/icons-material';
import { Quotation } from '@shared/types';
import { quotationsService } from '../services/quotationsService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const MyQuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const data = await quotationsService.getCustomerQuotations();
        setQuotations(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar cotações';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'customer') {
      fetchQuotations();
    } else {
      setLoading(false);
    }
  }, [user]);

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
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
    });
  };

  if (user?.role !== 'customer') {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Alert severity="error" sx={{ mb: 4 }}>
            Acesso negado. Apenas clientes podem visualizar cotações.
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

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (quotations.length === 0) {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h4" gutterBottom>
            Nenhuma cotação encontrada
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Você ainda não possui cotações solicitadas
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/"
            startIcon={<ArrowBack />}
          >
            Navegar Produtos
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Minhas Cotações
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {quotations.length} cotação{quotations.length !== 1 ? 'ões' : ''} encontrada{quotations.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {quotations.map((quotation) => (
          <Grid item xs={12} key={quotation.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Cotação #{quotation.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Solicitada em: {formatDate(quotation.createdAt)}
                    </Typography>
                  </Box>
                  <Chip
                    icon={getStatusIcon(quotation.status)}
                    label={getStatusLabel(quotation.status)}
                    color={getStatusColor(quotation.status)}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Itens da cotação:
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {quotation.items.slice(0, 3).map((item, index) => (
                    <Grid item xs={12} sm={4} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          variant="rounded"
                          sx={{ width: 40, height: 40, mr: 1 }}
                          imgProps={{
                            onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAxMkwyOCAyMEgyNFYyOEgxNlYyMEgxMkwyMCAxMloiIGZpbGw9IiM5MDkwOTAiLz4KPHN2Zz4K';
                            }
                          }}
                        />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Qtd: {item.quantity}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                  {quotation.items.length > 3 && (
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        +{quotation.items.length - 3} item{quotation.items.length - 3 !== 1 ? 's' : ''} adicionai{quotation.items.length - 3 !== 1 ? 's' : ''}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                {quotation.adminNotes && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Observações do administrador:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {quotation.adminNotes}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    component={Link}
                    to={`/quotations/${quotation.id}`}
                  >
                    Ver Detalhes
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="outlined"
          component={Link}
          to="/"
          startIcon={<ArrowBack />}
        >
          Continuar Navegando
        </Button>
      </Box>
    </Container>
  );
};

export default MyQuotationsPage;