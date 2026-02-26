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
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Cancel,
  Search,
  Assignment,
  Schedule,
  Info,
  Business,
  Email,
  Phone,
  Send,
  TrendingUp,
  PlayArrow,
} from '@mui/icons-material';
import { Quotation } from '@shared/types';
import { quotationsService } from '../services/quotationsService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface QuotationResponse {
  quotationId: number;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    leadTime: number;
    availability: string;
    notes?: string;
  }>;
  totalAmount: number;
  validUntil: string;
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
}

interface ResponseDialog {
  open: boolean;
  quotation: Quotation | null;
  response: QuotationResponse;
}

const initialResponse: QuotationResponse = {
  quotationId: 0,
  items: [],
  totalAmount: 0,
  validUntil: '',
  deliveryTerms: '',
  paymentTerms: '',
  notes: '',
};

const SupplierQuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [responseDialog, setResponseDialog] = useState<ResponseDialog>({
    open: false,
    quotation: null,
    response: initialResponse,
  });
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  const { user } = useAuth();

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    try {
      // This would ideally be a supplier-specific endpoint
      // For now, using the admin endpoint and filtering
      const data = await quotationsService.getAllQuotations();
      // Filter quotations that include products from this supplier
      const supplierQuotations = data.filter((quotation: Quotation) =>
        quotation.items?.some(item => item.product?.supplierId === user?.id)
      );
      setQuotations(supplierQuotations);
    } catch (_error) {
      console.error('Error loading quotations:', _error);
      toast.error('Error loading quotations');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const handleViewDetails = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDetailsDialogOpen(true);
  };

  const handleRespond = (quotation: Quotation) => {
    const response: QuotationResponse = {
      quotationId: quotation.id,
      items:
        quotation.items?.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.product?.unitPrice || 0,
          totalPrice: (item.product?.unitPrice || 0) * item.quantity,
          leadTime: item.product?.leadTime || 7,
          availability: item.product?.availability || 'in_stock',
          notes: '',
        })) || [],
      totalAmount: 0,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      deliveryTerms: 'FOB Origin',
      paymentTerms: 'Net 30',
      notes: '',
    };

    // Calculate total
    response.totalAmount = response.items.reduce((sum, item) => sum + item.totalPrice, 0);

    setResponseDialog({
      open: true,
      quotation,
      response,
    });
  };

  const handleAcceptQuotation = async (_quotationId: number) => {
    try {
      // This would call a supplier-specific accept endpoint
      toast.success('Quotation accepted successfully');
      loadQuotations();
    } catch (_error) {
      toast.error('Error accepting quotation');
    }
  };

  const handleRejectQuotation = async (_quotationId: number, _reason: string) => {
    try {
      // This would call a supplier-specific reject endpoint
      toast.success('Quotation rejected');
      loadQuotations();
    } catch (_error) {
      toast.error('Error rejecting quotation');
    }
  };

  const handleSubmitResponse = async () => {
    try {
      // This would submit the quotation response
      toast.success('Quotation response submitted successfully');
      setResponseDialog({
        open: false,
        quotation: null,
        response: initialResponse,
      });
      loadQuotations();
    } catch (_error) {
      toast.error('Error submitting quotation response');
    }
  };

  const updateItemPrice = (index: number, unitPrice: number) => {
    const updatedItems = [...responseDialog.response.items];
    updatedItems[index].unitPrice = unitPrice;
    updatedItems[index].totalPrice = unitPrice * updatedItems[index].quantity;

    const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    setResponseDialog({
      ...responseDialog,
      response: {
        ...responseDialog.response,
        items: updatedItems,
        totalAmount,
      },
    });
  };

  const updateItemAvailability = (index: number, availability: string) => {
    const updatedItems = [...responseDialog.response.items];
    updatedItems[index].availability = availability;

    setResponseDialog({
      ...responseDialog,
      response: {
        ...responseDialog.response,
        items: updatedItems,
      },
    });
  };

  const getStatusColor = (
    status: string
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Schedule />;
      case 'processed':
        return <PlayArrow />;
      case 'completed':
        return <CheckCircle />;
      case 'rejected':
        return <Cancel />;
      default:
        return <Info />;
    }
  };

  const getPriorityColor = (
    requestedDeliveryDate?: Date
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (!requestedDeliveryDate) return 'default';

    const now = new Date();
    const delivery = new Date(requestedDeliveryDate);
    const daysDiff = Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 7) return 'error'; // Urgent
    if (daysDiff < 14) return 'warning'; // High
    if (daysDiff < 30) return 'info'; // Medium
    return 'success'; // Low
  };

  const getPriorityLabel = (requestedDeliveryDate?: Date) => {
    if (!requestedDeliveryDate) return 'No deadline';

    const now = new Date();
    const delivery = new Date(requestedDeliveryDate);
    const daysDiff = Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 7) return 'Urgent';
    if (daysDiff < 14) return 'High';
    if (daysDiff < 30) return 'Medium';
    return 'Low';
  };

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch =
      quotation.id.toString().includes(searchTerm) ||
      quotation.company?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || quotation.status === statusFilter;

    let matchesDate = true;
    if (dateFilter) {
      const quotationDate = new Date(quotation.createdAt!);
      const today = new Date();
      const daysDiff = Math.floor(
        (today.getTime() - quotationDate.getTime()) / (1000 * 60 * 60 * 24)
      );

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

    let matchesPriority = true;
    if (priorityFilter) {
      const priority = getPriorityLabel(quotation.requestedDeliveryDate);
      matchesPriority = priority.toLowerCase() === priorityFilter.toLowerCase();
    }

    return matchesSearch && matchesStatus && matchesDate && matchesPriority;
  });

  const quotationsByStatus = {
    pending: filteredQuotations.filter(q => q.status === 'pending'),
    processed: filteredQuotations.filter(q => q.status === 'processed'),
    completed: filteredQuotations.filter(q => q.status === 'completed'),
    rejected: filteredQuotations.filter(q => q.status === 'rejected'),
    all: filteredQuotations,
  };

  const QuotationCard: React.FC<{ quotation: Quotation }> = ({ quotation }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='start' mb={2}>
          <Box>
            <Typography variant='h6'>Quote Request #{quotation.id}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {quotation.company?.companyName}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {new Date(quotation.createdAt!).toLocaleDateString()}
            </Typography>
          </Box>
          <Box display='flex' gap={1} flexDirection='column' alignItems='flex-end'>
            <Chip
              label={quotation.status}
              color={getStatusColor(quotation.status)}
              icon={getStatusIcon(quotation.status)}
            />
            {quotation.requestedDeliveryDate && (
              <Chip
                label={getPriorityLabel(quotation.requestedDeliveryDate)}
                color={getPriorityColor(quotation.requestedDeliveryDate)}
                size='small'
              />
            )}
          </Box>
        </Box>

        <Box mb={2}>
          <Typography variant='body2' color='text.secondary'>
            Items: {quotation.items?.length || 0}
          </Typography>
          {quotation.totalAmount && (
            <Typography variant='body2' color='text.secondary'>
              Estimated Value: R$ {quotation.totalAmount.toLocaleString()}
            </Typography>
          )}
          {quotation.requestedDeliveryDate && (
            <Typography variant='body2' color='text.secondary'>
              Requested Delivery: {new Date(quotation.requestedDeliveryDate).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        <Box display='flex' alignItems='center' gap={1}>
          {quotation.items?.slice(0, 3).map((item, index) => (
            <Chip
              key={index}
              label={`${item.quantity}x ${item.product?.name || 'Product'}`}
              size='small'
              variant='outlined'
            />
          ))}
          {(quotation.items?.length || 0) > 3 && (
            <Chip
              label={`+${(quotation.items?.length || 0) - 3} more`}
              size='small'
              variant='outlined'
            />
          )}
        </Box>
      </CardContent>

      <CardActions>
        <Button
          size='small'
          startIcon={<Visibility />}
          onClick={() => handleViewDetails(quotation)}
        >
          Details
        </Button>
        {quotation.status === 'pending' && (
          <>
            <Button
              size='small'
              variant='contained'
              startIcon={<Send />}
              onClick={() => handleRespond(quotation)}
            >
              Respond
            </Button>
            <Button
              size='small'
              variant='outlined'
              color='success'
              startIcon={<CheckCircle />}
              onClick={() => handleAcceptQuotation(quotation.id)}
            >
              Accept
            </Button>
            <Button
              size='small'
              variant='outlined'
              color='error'
              startIcon={<Cancel />}
              onClick={() => handleRejectQuotation(quotation.id, 'Not available')}
            >
              Decline
            </Button>
          </>
        )}
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
          Quotation Management
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          Manage quotation requests from buyers and send competitive quotes
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
                    Total Requests
                  </Typography>
                  <Typography variant='h6'>{quotations.length}</Typography>
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
                    Pending Response
                  </Typography>
                  <Typography variant='h6'>{quotationsByStatus.pending.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <CheckCircle color='success' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    Completed
                  </Typography>
                  <Typography variant='h6'>{quotationsByStatus.completed.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <TrendingUp color='info' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    Win Rate
                  </Typography>
                  <Typography variant='h6'>
                    {quotations.length > 0
                      ? Math.round((quotationsByStatus.completed.length / quotations.length) * 100)
                      : 0}
                    %
                  </Typography>
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
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                placeholder='Search quotations...'
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
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label='Status'
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <MenuItem value=''>All Status</MenuItem>
                  <MenuItem value='pending'>Pending</MenuItem>
                  <MenuItem value='processed'>Processed</MenuItem>
                  <MenuItem value='completed'>Completed</MenuItem>
                  <MenuItem value='rejected'>Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  label='Priority'
                  onChange={e => setPriorityFilter(e.target.value)}
                >
                  <MenuItem value=''>All Priority</MenuItem>
                  <MenuItem value='urgent'>Urgent</MenuItem>
                  <MenuItem value='high'>High</MenuItem>
                  <MenuItem value='medium'>Medium</MenuItem>
                  <MenuItem value='low'>Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
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
        <Tab label={`All (${quotationsByStatus.all.length})`} />
        <Tab label={`Pending (${quotationsByStatus.pending.length})`} />
        <Tab label={`Processed (${quotationsByStatus.processed.length})`} />
        <Tab label={`Completed (${quotationsByStatus.completed.length})`} />
        <Tab label={`Rejected (${quotationsByStatus.rejected.length})`} />
      </Tabs>

      {/* Quotations List */}
      {(() => {
        let displayQuotations = quotationsByStatus.all;
        if (selectedTab === 1) displayQuotations = quotationsByStatus.pending;
        if (selectedTab === 2) displayQuotations = quotationsByStatus.processed;
        if (selectedTab === 3) displayQuotations = quotationsByStatus.completed;
        if (selectedTab === 4) displayQuotations = quotationsByStatus.rejected;

        if (displayQuotations.length === 0) {
          return (
            <Alert severity='info' sx={{ mt: 2 }}>
              {selectedTab === 0
                ? 'No quotation requests found.'
                : `No ${
                    selectedTab === 1
                      ? 'pending'
                      : selectedTab === 2
                        ? 'processed'
                        : selectedTab === 3
                          ? 'completed'
                          : 'rejected'
                  } quotations found.`}
            </Alert>
          );
        }

        return displayQuotations.map(quotation => (
          <QuotationCard key={quotation.id} quotation={quotation} />
        ));
      })()}

      {/* Response Dialog */}
      <Dialog
        open={responseDialog.open}
        onClose={() =>
          setResponseDialog({ open: false, quotation: null, response: initialResponse })
        }
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>Respond to Quote Request #{responseDialog.quotation?.id}</DialogTitle>
        <DialogContent>
          {responseDialog.quotation && (
            <Box>
              {/* Customer Info */}
              <Box mb={3}>
                <Typography variant='h6' gutterBottom>
                  Customer Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Company: {responseDialog.quotation.company?.companyName}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Email: {responseDialog.quotation.company?.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Requested Delivery:{' '}
                      {responseDialog.quotation.requestedDeliveryDate
                        ? new Date(
                            responseDialog.quotation.requestedDeliveryDate
                          ).toLocaleDateString()
                        : 'Not specified'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Quote Items */}
              <Typography variant='h6' gutterBottom>
                Quote Items
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Unit Price (R$)</TableCell>
                      <TableCell>Total (R$)</TableCell>
                      <TableCell>Availability</TableCell>
                      <TableCell>Lead Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {responseDialog.response.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {responseDialog.quotation?.items?.[index]?.product?.name || 'Product'}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <TextField
                            type='number'
                            size='small'
                            value={item.unitPrice}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItemPrice(index, Number(e.target.value))}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </TableCell>
                        <TableCell>R$ {item.totalPrice.toLocaleString()}</TableCell>
                        <TableCell>
                          <Select
                            size='small'
                            value={item.availability}
                            onChange={e => updateItemAvailability(index, e.target.value)}
                          >
                            <MenuItem value='in_stock'>In Stock</MenuItem>
                            <MenuItem value='limited'>Limited</MenuItem>
                            <MenuItem value='out_of_stock'>Out of Stock</MenuItem>
                            <MenuItem value='custom_order'>Custom Order</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>{item.leadTime} days</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Quote Terms */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label='Total Amount (R$)'
                    value={responseDialog.response.totalAmount.toLocaleString()}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type='date'
                    label='Valid Until'
                    value={responseDialog.response.validUntil}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setResponseDialog({
                        ...responseDialog,
                        response: { ...responseDialog.response, validUntil: e.target.value },
                      })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label='Payment Terms'
                    value={responseDialog.response.paymentTerms}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setResponseDialog({
                        ...responseDialog,
                        response: { ...responseDialog.response, paymentTerms: e.target.value },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Delivery Terms'
                    value={responseDialog.response.deliveryTerms}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setResponseDialog({
                        ...responseDialog,
                        response: { ...responseDialog.response, deliveryTerms: e.target.value },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label='Additional Notes'
                    value={responseDialog.response.notes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setResponseDialog({
                        ...responseDialog,
                        response: { ...responseDialog.response, notes: e.target.value },
                      })
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setResponseDialog({ open: false, quotation: null, response: initialResponse })
            }
          >
            Cancel
          </Button>
          <Button onClick={handleSubmitResponse} variant='contained'>
            Submit Quote
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Quotation Details - #{selectedQuotation?.id}</DialogTitle>
        <DialogContent>
          {selectedQuotation && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' gutterBottom>
                    Customer Information
                  </Typography>
                  <Box display='flex' alignItems='center' mb={1}>
                    <Business sx={{ mr: 1 }} />
                    <Typography>{selectedQuotation.company?.companyName}</Typography>
                  </Box>
                  <Box display='flex' alignItems='center' mb={1}>
                    <Email sx={{ mr: 1 }} />
                    <Typography>{selectedQuotation.company?.email}</Typography>
                  </Box>
                  {selectedQuotation.company?.phone && (
                    <Box display='flex' alignItems='center' mb={1}>
                      <Phone sx={{ mr: 1 }} />
                      <Typography>{selectedQuotation.company.phone}</Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' gutterBottom>
                    Request Information
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Created: {new Date(selectedQuotation.createdAt!).toLocaleString()}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Status:{' '}
                    <Chip
                      label={selectedQuotation.status}
                      color={getStatusColor(selectedQuotation.status)}
                      size='small'
                    />
                  </Typography>
                  {selectedQuotation.requestedDeliveryDate && (
                    <Typography variant='body2' color='text.secondary'>
                      Requested Delivery:{' '}
                      {new Date(selectedQuotation.requestedDeliveryDate).toLocaleDateString()}
                    </Typography>
                  )}
                  {selectedQuotation.adminNotes && (
                    <Typography variant='body2' color='text.secondary'>
                      Notes: {selectedQuotation.adminNotes}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              <Typography variant='h6' gutterBottom>
                Requested Items
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Specifications</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedQuotation.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box>
                            <Typography variant='body2'>
                              {item.product?.name || 'Product'}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {item.product?.category}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          {item.product?.specifications &&
                          Object.keys(item.product.specifications).length > 0 ? (
                            <Box>
                              {Object.entries(item.product.specifications).map(([key, value]) => (
                                <Typography key={key} variant='caption' display='block'>
                                  {key}: {value}
                                </Typography>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant='caption' color='text.secondary'>
                              No specifications
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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

export default SupplierQuotationsPage;
