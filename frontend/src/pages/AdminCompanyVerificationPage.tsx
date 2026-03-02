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
  InputAdornment,
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
  Menu as MenuIcon,
  Notifications,
  People,
  Analytics,
  Settings,
  Search,
  FilterList,
  Close,
  Check,
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
          page: String(page),
          limit: '10',
          filter,
        },
      }) as { data: unknown };

      setVerificationQueue(response.data as Parameters<typeof setVerificationQueue>[0]);
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
      }) as { data: { message: string } };

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
      ) as { data: { user: Parameters<typeof setSelectedCompany>[0] } };

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

      {/* Statistics Chart area replaced with simple cards for now due to library limits */}
      {verificationQueue && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Pending sx={{ fontSize: 40, color: 'warning.main' }} />
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
            <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' }}>
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
            <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Warning sx={{ fontSize: 40, color: 'error.main' }} />
                <Typography variant='h6' sx={{ mt: 1 }}>
                  Pendências
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  CNPJs não validados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Queue Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            Verification Queue
            <Chip label={`${verificationQueue?.totalCount || 0} Pending`} size="small" sx={{ bgcolor: 'primary.light', color: 'primary.main', fontWeight: 'bold', height: 20, fontSize: '0.75rem' }} />
          </Typography>
          <Button variant="text" size="small" sx={{ fontWeight: 'medium' }}>View All</Button>
        </Box>

        {/* Filter Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
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

        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by CNPJ or Name"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }
            }}
          />
          <Button variant="outlined" color="inherit" sx={{ minWidth: 'auto', px: 2, borderColor: 'divider' }}>
            <FilterList />
          </Button>
        </Box>

        {/* Queue Items */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {loading && !verificationQueue?.companies.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={30} /></Box>
          ) : verificationQueue?.companies.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Nenhuma empresa encontrada.</Typography>
          ) : (
            verificationQueue?.companies.map((company, idx) => (
              <Box
                key={company.id}
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  p: 2,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  border: 1,
                  borderColor: 'divider',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: company.status !== 'pending' ? 0.75 : 1
                }}
              >
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: company.status === 'pending' ? 'warning.main' : company.status === 'approved' ? 'success.main' : 'error.main' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, pl: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{company.companyName}</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      CNPJ: {company.cnpj}
                      {company.cnpjValidated ? <CheckCircle sx={{ fontSize: 12, color: 'success.main' }} /> : <Warning sx={{ fontSize: 12, color: 'warning.main' }} />}
                    </Typography>
                  </Box>
                  <Chip label={formatDate(company.createdAt).split(',')[0]} size="small" sx={{ bgcolor: 'action.hover', color: 'text.secondary', height: 20, fontSize: '0.65rem' }} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pl: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.6rem', color: 'text.secondary' }}>Location</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 'medium' }}>{company.city || 'N/A'}, {company.state || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {company.status === 'pending' ? (
                      <>
                        <IconButton
                          size="small"
                          sx={{ bgcolor: 'error.light', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white' }, width: 32, height: 32, borderRadius: 1 }}
                          onClick={() => {
                            setSelectedCompany(company);
                            handleVerifyCompany(company.id, 'rejected');
                          }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          sx={{ bgcolor: 'success.light', color: 'success.main', '&:hover': { bgcolor: 'success.main', color: 'white' }, width: 32, height: 32, borderRadius: 1 }}
                          onClick={() => {
                            setSelectedCompany(company);
                            handleVerifyCompany(company.id, 'approved');
                          }}
                        >
                          <Check fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', fontStyle: 'italic', mr: 1 }}>
                        {company.status === 'approved' ? 'Approved' : 'Rejected'}
                      </Typography>
                    )}
                    <IconButton
                      size="small"
                      sx={{ bgcolor: 'action.hover', color: 'text.secondary', width: 32, height: 32, borderRadius: 1 }}
                      onClick={() => {
                        setSelectedCompany(company);
                        setDetailsDialog(true);
                      }}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Pagination placeholder if needed */}
      {verificationQueue && verificationQueue.totalPages > 1 && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <Typography variant='body2' color='text.secondary'>
            Página {verificationQueue.currentPage} de {verificationQueue.totalPages}
          </Typography>
        </Box>
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationReason(e.target.value)}
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
