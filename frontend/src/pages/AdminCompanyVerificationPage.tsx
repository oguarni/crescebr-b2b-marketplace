import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
} from '@mui/material';
import {
  Verified,
  Pending,
  Cancel,
  Visibility,
  Business,
  CheckCircle,
  Warning,
  ExpandMore,
  Refresh,
  Email,
  Phone,
  LocationOn,
  Category,
} from '@mui/icons-material';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

interface Company {
  id: number;
  email: string;
  cpf: string;
  companyName: string;
  corporateName: string;
  cnpj: string;
  cnpjValidated: boolean;
  industrySector: string;
  companyType: 'buyer' | 'supplier' | 'both';
  status: 'pending' | 'approved' | 'rejected';
  address: string;
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  contactPerson?: string;
  contactTitle?: string;
  companySize?: string;
  annualRevenue?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

interface VerificationQueue {
  companies: Company[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

const AdminCompanyVerificationPage: React.FC = () => {
  const [verificationQueue, setVerificationQueue] = useState<VerificationQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [filter, setFilter] = useState<'all' | 'pending' | 'unvalidated_cnpj'>('pending');
  const [page, setPage] = useState(1);
  const [verificationReason, setVerificationReason] = useState('');
  const [cnpjValidating, setCnpjValidating] = useState(false);

  const loadVerificationQueue = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await authService.adminRequest('/admin/verification-queue', {
        params: {
          page,
          limit: 10,
          filter,
        },
      });

      setVerificationQueue(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading verification queue';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    loadVerificationQueue();
  }, [loadVerificationQueue]);

  const handleVerifyCompany = async (companyId: number, status: 'approved' | 'rejected') => {
    try {
      const response = await authService.adminRequest(`/admin/companies/${companyId}/verify`, {
        method: 'POST',
        data: {
          status,
          reason: verificationReason || undefined,
          validateCNPJ: status === 'approved',
        },
      });

      toast.success(response.data.message);
      setVerificationDialog(false);
      setVerificationReason('');
      setSelectedCompany(null);
      loadVerificationQueue();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error verifying company';
      toast.error(errorMessage);
    }
  };

  const handleValidateCNPJ = async (companyId: number) => {
    setCnpjValidating(true);
    try {
      const response = await authService.adminRequest(
        `/admin/companies/${companyId}/validate-cnpj`,
        {
          method: 'POST',
        }
      );

      toast.success('CNPJ validation completed successfully');

      // Update the selected company data
      if (selectedCompany?.id === companyId) {
        setSelectedCompany(response.data.user);
      }

      loadVerificationQueue();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error validating CNPJ';
      toast.error(errorMessage);
    } finally {
      setCnpjValidating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle />;
      case 'rejected':
        return <Cancel />;
      case 'pending':
        return <Pending />;
      default:
        return <Warning />;
    }
  };

  const getSectorLabel = (sector: string) => {
    const sectorMap: Record<string, string> = {
      machinery: 'Máquinas',
      raw_materials: 'Matérias-primas',
      components: 'Componentes',
      electronics: 'Eletrônicos',
      textiles: 'Têxteis',
      chemicals: 'Químicos',
      automotive: 'Automotivo',
      food_beverage: 'Alimentos e Bebidas',
      construction: 'Construção',
      pharmaceutical: 'Farmacêutico',
      other: 'Outros',
    };
    return sectorMap[sector] || sector;
  };

  const getCompanyTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      buyer: 'Comprador',
      supplier: 'Fornecedor',
      both: 'Ambos',
    };
    return typeMap[type] || type;
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

  if (loading && !verificationQueue) {
    return (
      <Container maxWidth='lg'>
        <Box display='flex' justifyContent='center' alignItems='center' minHeight='50vh'>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='lg'>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant='h4' component='h1'>
            Verificação de Empresas
          </Typography>
          <Button
            variant='outlined'
            startIcon={<Refresh />}
            onClick={() => loadVerificationQueue()}
            disabled={loading}
          >
            Atualizar
          </Button>
        </Box>
        <Typography variant='body1' color='text.secondary'>
          Gerencie as solicitações de cadastro de empresas fornecedoras
        </Typography>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {verificationQueue && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Badge badgeContent={verificationQueue.totalCount} color='warning' max={999}>
                  <Pending sx={{ fontSize: 40, color: 'warning.main' }} />
                </Badge>
                <Typography variant='h6' sx={{ mt: 1 }}>
                  Total na Fila
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Empresas aguardando verificação
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Verified sx={{ fontSize: 40, color: 'success.main' }} />
                <Typography variant='h6' sx={{ mt: 1 }}>
                  Verificadas
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Empresas aprovadas hoje
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Warning sx={{ fontSize: 40, color: 'error.main' }} />
                <Typography variant='h6' sx={{ mt: 1 }}>
                  CNPJ Pendentes
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Requerem validação de CNPJ
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => {
            setCurrentTab(newValue);
            const filters: Array<'all' | 'pending' | 'unvalidated_cnpj'> = ['pending', 'all', 'unvalidated_cnpj'];
            setFilter(filters[newValue]);
            setPage(1);
          }}
        >
          <Tab label='Pendentes' />
          <Tab label='Todas' />
          <Tab label='CNPJ Inválidos' />
        </Tabs>
      </Box>

      {/* Companies Table */}
      {verificationQueue?.companies.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Business sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant='h6' color='text.secondary' gutterBottom>
              Nenhuma empresa encontrada
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Todas as empresas foram processadas ou não há novas solicitações
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Empresa</TableCell>
                    <TableCell>CNPJ</TableCell>
                    <TableCell>Setor</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell align='center'>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {verificationQueue?.companies.map(company => (
                    <TableRow key={company.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant='subtitle2'>{company.companyName}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {company.corporateName}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {company.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant='body2'>{company.cnpj}</Typography>
                          {company.cnpjValidated ? (
                            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                          ) : (
                            <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getSectorLabel(company.industrySector)}
                          size='small'
                          variant='outlined'
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getCompanyTypeLabel(company.companyType)}
                          size='small'
                          color={company.companyType === 'supplier' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(company.status)}
                          label={company.status}
                          size='small'
                          color={getStatusColor(company.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{formatDate(company.createdAt)}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size='small'
                            onClick={() => {
                              setSelectedCompany(company);
                              setDetailsDialog(true);
                            }}
                            title='Ver detalhes'
                          >
                            <Visibility />
                          </IconButton>
                          {company.status === 'pending' && (
                            <Button
                              size='small'
                              variant='outlined'
                              onClick={() => {
                                setSelectedCompany(company);
                                setVerificationDialog(true);
                              }}
                            >
                              Verificar
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Company Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth='md' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business />
          Detalhes da Empresa
        </DialogTitle>
        <DialogContent>
          {selectedCompany && (
            <Box sx={{ mt: 1 }}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant='h6'>Informações Básicas</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Business color='primary' />
                        <Box>
                          <Typography variant='subtitle2'>Nome Fantasia</Typography>
                          <Typography variant='body2'>{selectedCompany.companyName}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Business color='primary' />
                        <Box>
                          <Typography variant='subtitle2'>Razão Social</Typography>
                          <Typography variant='body2'>{selectedCompany.corporateName}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Email color='primary' />
                        <Box>
                          <Typography variant='subtitle2'>Email</Typography>
                          <Typography variant='body2'>{selectedCompany.email}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Phone color='primary' />
                        <Box>
                          <Typography variant='subtitle2'>Telefone</Typography>
                          <Typography variant='body2'>
                            {selectedCompany.phone || 'Não informado'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant='h6'>Documentação</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='subtitle2'>CPF do Responsável</Typography>
                      <Typography variant='body2' sx={{ mb: 2 }}>
                        {selectedCompany.cpf}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='subtitle2'>CNPJ</Typography>
                        {selectedCompany.cnpjValidated ? (
                          <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                        )}
                      </Box>
                      <Typography variant='body2' sx={{ mb: 1 }}>
                        {selectedCompany.cnpj}
                      </Typography>
                      {!selectedCompany.cnpjValidated && (
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() => handleValidateCNPJ(selectedCompany.id)}
                          disabled={cnpjValidating}
                          startIcon={
                            cnpjValidating ? <CircularProgress size={16} /> : <CheckCircle />
                          }
                        >
                          Validar CNPJ
                        </Button>
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant='h6'>Endereço</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <LocationOn color='primary' />
                    <Box>
                      <Typography variant='body2'>{selectedCompany.address}</Typography>
                      {selectedCompany.street && (
                        <Typography variant='caption' color='text.secondary'>
                          {selectedCompany.street}, {selectedCompany.number}
                          {selectedCompany.city &&
                            ` - ${selectedCompany.city}/${selectedCompany.state}`}
                          {selectedCompany.zipCode && ` - CEP: ${selectedCompany.zipCode}`}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant='h6'>Informações Comerciais</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Category color='primary' />
                        <Box>
                          <Typography variant='subtitle2'>Setor</Typography>
                          <Typography variant='body2'>
                            {getSectorLabel(selectedCompany.industrySector)}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='subtitle2'>Tipo de Empresa</Typography>
                      <Typography variant='body2'>
                        {getCompanyTypeLabel(selectedCompany.companyType)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='subtitle2'>Porte</Typography>
                      <Typography variant='body2'>
                        {selectedCompany.companySize || 'Não informado'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='subtitle2'>Faturamento</Typography>
                      <Typography variant='body2'>
                        {selectedCompany.annualRevenue || 'Não informado'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant='subtitle2'>Website</Typography>
                      <Typography variant='body2'>
                        {selectedCompany.website || 'Não informado'}
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant='h6'>Contato</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='subtitle2'>Pessoa de Contato</Typography>
                      <Typography variant='body2'>
                        {selectedCompany.contactPerson || 'Não informado'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='subtitle2'>Cargo</Typography>
                      <Typography variant='body2'>
                        {selectedCompany.contactTitle || 'Não informado'}
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Fechar</Button>
          {selectedCompany?.status === 'pending' && (
            <Button
              variant='contained'
              onClick={() => {
                setDetailsDialog(false);
                setVerificationDialog(true);
              }}
            >
              Verificar Empresa
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog
        open={verificationDialog}
        onClose={() => setVerificationDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Verificar Empresa: {selectedCompany?.companyName}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              Escolha a ação para esta empresa. Se aprovada, a empresa poderá acessar o marketplace.
            </Typography>

            <TextField
              fullWidth
              label='Motivo (opcional)'
              multiline
              rows={3}
              value={verificationReason}
              onChange={e => setVerificationReason(e.target.value)}
              placeholder='Adicione uma observação sobre a verificação...'
              sx={{ mb: 2 }}
            />

            {selectedCompany && !selectedCompany.cnpjValidated && (
              <Alert severity='warning' sx={{ mb: 2 }}>
                <Typography variant='body2'>
                  O CNPJ desta empresa ainda não foi validado. Recomenda-se validar antes de
                  aprovar.
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerificationDialog(false)}>Cancelar</Button>
          <Button
            variant='outlined'
            color='error'
            onClick={() => selectedCompany && handleVerifyCompany(selectedCompany.id, 'rejected')}
          >
            Rejeitar
          </Button>
          <Button
            variant='contained'
            color='success'
            onClick={() => selectedCompany && handleVerifyCompany(selectedCompany.id, 'approved')}
          >
            Aprovar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminCompanyVerificationPage;
