import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Visibility,
  Schedule,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Check,
  Close,
} from '@mui/icons-material';
import { Quotation } from '@shared/types';
import { quotationsService } from '../services/quotationsService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const AdminQuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const data = await quotationsService.getAllQuotations();
        setQuotations(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar cotações';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      fetchQuotations();
    } else {
      setLoading(false);
    }
  }, [user]);

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

  const handleEditQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setUpdateStatus(quotation.status);
    setUpdateNotes(quotation.adminNotes || '');
    setUpdateDialogOpen(true);
  };

  const handleUpdateQuotation = async () => {
    if (!selectedQuotation) return;

    setUpdating(true);
    try {
      const updatedQuotation = await quotationsService.updateQuotation(selectedQuotation.id, {
        status: updateStatus as 'pending' | 'processed' | 'completed' | 'rejected',
        adminNotes: updateNotes,
      });

      // Update the quotation in the list
      setQuotations(prev => prev.map(q => (q.id === selectedQuotation.id ? updatedQuotation : q)));

      toast.success('Cotação atualizada com sucesso!');
      setUpdateDialogOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar cotação';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseDialog = () => {
    setUpdateDialogOpen(false);
    setSelectedQuotation(null);
    setUpdateStatus('');
    setUpdateNotes('');
  };

  const handleAcceptQuotation = async (quotation: Quotation) => {
    if (!window.confirm('Tem certeza que deseja aceitar esta cotação?')) {
      return;
    }

    try {
      const updatedQuotation = await quotationsService.updateQuotation(quotation.id, {
        status: 'completed',
        adminNotes: quotation.adminNotes || '',
      });

      setQuotations(prev => prev.map(q => (q.id === quotation.id ? updatedQuotation : q)));

      toast.success('Cotação aceita com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao aceitar cotação';
      toast.error(errorMessage);
    }
  };

  const handleRejectQuotation = async (quotation: Quotation) => {
    if (!window.confirm('Tem certeza que deseja recusar esta cotação?')) {
      return;
    }

    try {
      const updatedQuotation = await quotationsService.updateQuotation(quotation.id, {
        status: 'rejected',
        adminNotes: quotation.adminNotes || '',
      });

      setQuotations(prev => prev.map(q => (q.id === quotation.id ? updatedQuotation : q)));

      toast.success('Cotação recusada com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao recusar cotação';
      toast.error(errorMessage);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Container maxWidth='md'>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Alert severity='error' sx={{ mb: 4 }}>
            Acesso negado. Apenas administradores podem gerenciar cotações.
          </Alert>
          <Button variant='contained' component={Link} to='/' startIcon={<ArrowBack />}>
            Voltar ao Início
          </Button>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth='md'>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='xl'>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' gutterBottom>
          Gerenciar Cotações
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          {quotations.length} cotação{quotations.length !== 1 ? 'ões' : ''} encontrada
          {quotations.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {quotations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant='h6' color='text.secondary' gutterBottom>
            Nenhuma cotação encontrada
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Aguardando solicitações de cotação dos clientes
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Itens</TableCell>
                <TableCell>Data</TableCell>
                <TableCell align='center'>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotations.map(quotation => (
                <TableRow key={quotation.id} hover>
                  <TableCell>#{quotation.id}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant='body2' fontWeight='medium'>
                        {quotation.user?.email}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        CPF: {quotation.user?.cpf}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(quotation.status)}
                      label={getStatusLabel(quotation.status)}
                      color={getStatusColor(quotation.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      size='small'
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {quotation.items.slice(0, 2).map((item, index) => (
                        <Avatar
                          key={index}
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          variant='rounded'
                          sx={{ width: 30, height: 30, mr: 0.5 }}
                        />
                      ))}
                      {quotation.items.length > 2 && (
                        <Typography variant='caption' color='text.secondary'>
                          +{quotation.items.length - 2}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{formatDate(quotation.createdAt)}</Typography>
                  </TableCell>
                  <TableCell align='center'>
                    <Box
                      sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}
                    >
                      <Button
                        size='small'
                        variant='outlined'
                        startIcon={<Visibility />}
                        component={Link}
                        to={`/quotations/${quotation.id}`}
                      >
                        Ver
                      </Button>

                      {quotation.status === 'pending' && (
                        <>
                          <Button
                            size='small'
                            variant='contained'
                            color='success'
                            startIcon={<Check />}
                            onClick={() => handleAcceptQuotation(quotation)}
                          >
                            Aceitar
                          </Button>
                          <Button
                            size='small'
                            variant='contained'
                            color='error'
                            startIcon={<Close />}
                            onClick={() => handleRejectQuotation(quotation)}
                          >
                            Recusar
                          </Button>
                        </>
                      )}

                      <Button
                        size='small'
                        variant='outlined'
                        startIcon={<Edit />}
                        onClick={() => handleEditQuotation(quotation)}
                      >
                        Editar
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button variant='outlined' component={Link} to='/' startIcon={<ArrowBack />}>
          Voltar ao Dashboard
        </Button>
      </Box>

      {/* Update Quotation Dialog */}
      <Dialog open={updateDialogOpen} onClose={handleCloseDialog} maxWidth='sm' fullWidth>
        <DialogTitle>Atualizar Cotação #{selectedQuotation?.id}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={updateStatus}
                label='Status'
                onChange={e => setUpdateStatus(e.target.value)}
              >
                <MenuItem value='pending'>Pendente</MenuItem>
                <MenuItem value='processed'>Processada</MenuItem>
                <MenuItem value='completed'>Concluída</MenuItem>
                <MenuItem value='rejected'>Rejeitada</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='Observações do Administrador'
              multiline
              rows={4}
              fullWidth
              value={updateNotes}
              onChange={e => setUpdateNotes(e.target.value)}
              placeholder='Adicione observações sobre esta cotação...'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleUpdateQuotation} variant='contained' disabled={updating}>
            {updating ? <CircularProgress size={20} /> : 'Atualizar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminQuotationsPage;
