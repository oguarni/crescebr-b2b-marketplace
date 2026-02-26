import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Fab,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  FileUpload,
  FileDownload,
  Search,
  ViewModule,
  ViewList,
  Inventory,
  Warning,
  CheckCircle,
  Cancel,
  Schedule,
} from '@mui/icons-material';
import { Product } from '@shared/types';
import { productsService } from '../services/productsService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  unitPrice: number;
  minimumOrderQuantity: number;
  leadTime: number;
  availability: 'in_stock' | 'out_of_stock' | 'limited' | 'custom_order';
  specifications: Record<string, string>;
  tierPricing: Array<{
    minQuantity: number;
    maxQuantity: number | null;
    discount: number;
  }>;
}

const initialFormData: ProductFormData = {
  name: '',
  description: '',
  price: 0,
  imageUrl: '',
  category: '',
  unitPrice: 0,
  minimumOrderQuantity: 1,
  leadTime: 7,
  availability: 'in_stock',
  specifications: {},
  tierPricing: [],
};

const SupplierProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedTab, setSelectedTab] = useState(0);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('');

  const { user } = useAuth();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productsService.getAllProducts({
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        availability: availabilityFilter ? [availabilityFilter] : undefined,
      });
      setProducts(response.products);
    } catch (_error) {
      console.error('Error loading products:', _error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, availabilityFilter]);

  const loadCategories = async () => {
    try {
      const categoriesData = await productsService.getCategories();
      setCategories(categoriesData);
    } catch (_error) {
      console.error('Error loading categories:', _error);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [loadProducts]);

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      unitPrice: product.unitPrice,
      minimumOrderQuantity: product.minimumOrderQuantity,
      leadTime: product.leadTime,
      availability: product.availability,
      specifications: product.specifications as Record<string, string> || {},
      tierPricing: product.tierPricing || [],
    });
    setDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productsService.deleteProduct(productId);
      toast.success('Product deleted successfully');
      loadProducts();
    } catch (_error) {
      toast.error('Error deleting product');
    }
  };

  const handleSaveProduct = async () => {
    try {
      const supplierId = user?.id;
      if (!supplierId) {
        toast.error('User not authenticated');
        return;
      }

      const productData = {
        ...formData,
        supplierId,
      };

      if (editingProduct) {
        await productsService.updateProduct(editingProduct.id, productData);
        toast.success('Product updated successfully');
      } else {
        await productsService.createProduct(productData);
        toast.success('Product created successfully');
      }

      setDialogOpen(false);
      loadProducts();
    } catch (_error) {
      toast.error('Error saving product');
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast('CSV import feature coming soon');
    } catch (_error) {
      toast.error('Error importing products');
    }

    // Reset file input
    event.target.value = '';
  };

  const handleCSVExport = async () => {
    try {
      toast('CSV export feature coming soon');
    } catch (_error) {
      toast.error('Error exporting products');
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'in_stock':
        return 'success';
      case 'limited':
        return 'warning';
      case 'out_of_stock':
        return 'error';
      case 'custom_order':
        return 'info';
      default:
        return 'default';
    }
  };

  const getAvailabilityIcon = (availability: string) => {
    switch (availability) {
      case 'in_stock':
        return <CheckCircle />;
      case 'limited':
        return <Warning />;
      case 'out_of_stock':
        return <Cancel />;
      case 'custom_order':
        return <Schedule />;
      default:
        return null;
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesAvailability = !availabilityFilter || product.availability === availabilityFilter;

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const productsByStatus = {
    active: filteredProducts.filter(p => p.availability !== 'out_of_stock'),
    outOfStock: filteredProducts.filter(p => p.availability === 'out_of_stock'),
    all: filteredProducts,
  };

  return (
    <Container maxWidth='xl' sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={4}>
        <Box>
          <Typography variant='h4' component='h1' gutterBottom>
            Product Management
          </Typography>
          <Typography variant='subtitle1' color='text.secondary'>
            Manage your product catalog, inventory, and pricing
          </Typography>
        </Box>
        <Box display='flex' gap={2}>
          <Button variant='outlined' startIcon={<FileDownload />} onClick={handleCSVExport}>
            Export CSV
          </Button>
          <input
            type='file'
            accept='.csv'
            onChange={handleCSVImport}
            style={{ display: 'none' }}
            id='csv-import'
          />
          <label htmlFor='csv-import'>
            <Button variant='outlined' component='span' startIcon={<FileUpload />}>
              Import CSV
            </Button>
          </label>
          <Button variant='contained' startIcon={<Add />} onClick={handleCreateProduct}>
            Add Product
          </Button>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Inventory color='primary' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    Total Products
                  </Typography>
                  <Typography variant='h6'>{products.length}</Typography>
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
                    In Stock
                  </Typography>
                  <Typography variant='h6'>
                    {products.filter(p => p.availability === 'in_stock').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Warning color='warning' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    Limited Stock
                  </Typography>
                  <Typography variant='h6'>
                    {products.filter(p => p.availability === 'limited').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <Cancel color='error' sx={{ mr: 1 }} />
                <Box>
                  <Typography color='text.secondary' variant='body2'>
                    Out of Stock
                  </Typography>
                  <Typography variant='h6'>
                    {products.filter(p => p.availability === 'out_of_stock').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems='center'>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                placeholder='Search products...'
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
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label='Category'
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value=''>All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Availability</InputLabel>
                <Select
                  value={availabilityFilter}
                  label='Availability'
                  onChange={e => setAvailabilityFilter(e.target.value)}
                >
                  <MenuItem value=''>All</MenuItem>
                  <MenuItem value='in_stock'>In Stock</MenuItem>
                  <MenuItem value='limited'>Limited</MenuItem>
                  <MenuItem value='out_of_stock'>Out of Stock</MenuItem>
                  <MenuItem value='custom_order'>Custom Order</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Box display='flex' justifyContent='flex-end'>
                <Button
                  variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('grid')}
                  sx={{ mr: 1 }}
                >
                  <ViewModule />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('table')}
                >
                  <ViewList />
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <Box display='flex' justifyContent='center' mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Tabs */}
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
            sx={{ mb: 2 }}
          >
            <Tab label={`All Products (${productsByStatus.all.length})`} />
            <Tab label={`Active (${productsByStatus.active.length})`} />
            <Tab label={`Out of Stock (${productsByStatus.outOfStock.length})`} />
          </Tabs>

          {/* Product List */}
          {(() => {
            let displayProducts = productsByStatus.all;
            if (selectedTab === 1) displayProducts = productsByStatus.active;
            if (selectedTab === 2) displayProducts = productsByStatus.outOfStock;

            if (displayProducts.length === 0) {
              return (
                <Alert severity='info' sx={{ mt: 2 }}>
                  {selectedTab === 0
                    ? 'No products found. Start by adding your first product!'
                    : selectedTab === 1
                      ? 'No active products found.'
                      : 'No out of stock products.'}
                </Alert>
              );
            }

            if (viewMode === 'grid') {
              return (
                <Grid container spacing={3}>
                  {displayProducts.map(product => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                      <Card>
                        <CardMedia
                          component='img'
                          height='200'
                          image={product.imageUrl || '/placeholder-product.jpg'}
                          alt={product.name}
                        />
                        <CardContent>
                          <Typography variant='h6' noWrap title={product.name}>
                            {product.name}
                          </Typography>
                          <Typography variant='body2' color='text.secondary' noWrap>
                            {product.description}
                          </Typography>
                          <Box mt={1} mb={1}>
                            <Chip
                              label={product.availability.replace('_', ' ')}
                              color={getAvailabilityColor(product.availability) as 'success' | 'warning' | 'error' | 'info' | 'default'}
                              size='small'
                              icon={getAvailabilityIcon(product.availability) ?? undefined}
                            />
                          </Box>
                          <Typography variant='h6' color='primary'>
                            R$ {product.price.toLocaleString()}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            MOQ: {product.minimumOrderQuantity}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <IconButton onClick={() => handleEditProduct(product)} size='small'>
                            <Edit />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteProduct(product.id)} size='small'>
                            <Delete />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              );
            } else {
              return (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>MOQ</TableCell>
                        <TableCell>Lead Time</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayProducts.map(product => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Box display='flex' alignItems='center'>
                              <img
                                src={product.imageUrl || '/placeholder-product.jpg'}
                                alt={product.name}
                                style={{
                                  width: 50,
                                  height: 50,
                                  marginRight: 16,
                                  objectFit: 'cover',
                                }}
                              />
                              <Box>
                                <Typography variant='subtitle1'>{product.name}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  {product.description.substring(0, 50)}...
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>R$ {product.price.toLocaleString()}</TableCell>
                          <TableCell>{product.minimumOrderQuantity}</TableCell>
                          <TableCell>{product.leadTime} days</TableCell>
                          <TableCell>
                            <Chip
                              label={product.availability.replace('_', ' ')}
                              color={getAvailabilityColor(product.availability) as 'success' | 'warning' | 'error' | 'info' | 'default'}
                              size='small'
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton onClick={() => handleEditProduct(product)} size='small'>
                              <Edit />
                            </IconButton>
                            <IconButton
                              onClick={() => handleDeleteProduct(product.id)}
                              size='small'
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              );
            }
          })()}
        </>
      )}

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Product Name'
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label='Category'
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label='Description'
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type='number'
                label='Price (R$)'
                value={formData.price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type='number'
                label='Unit Price (R$)'
                value={formData.unitPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type='number'
                label='Minimum Order Quantity'
                value={formData.minimumOrderQuantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, minimumOrderQuantity: Number(e.target.value) })
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type='number'
                label='Lead Time (days)'
                value={formData.leadTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, leadTime: Number(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Availability</InputLabel>
                <Select
                  value={formData.availability}
                  label='Availability'
                  onChange={e => setFormData({ ...formData, availability: e.target.value as 'in_stock' | 'out_of_stock' | 'limited' | 'custom_order' })}
                >
                  <MenuItem value='in_stock'>In Stock</MenuItem>
                  <MenuItem value='limited'>Limited</MenuItem>
                  <MenuItem value='out_of_stock'>Out of Stock</MenuItem>
                  <MenuItem value='custom_order'>Custom Order</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Image URL'
                value={formData.imageUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProduct} variant='contained'>
            {editingProduct ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Quick Add */}
      <Fab
        color='primary'
        aria-label='add'
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleCreateProduct}
      >
        <Add />
      </Fab>
    </Container>
  );
};

export default SupplierProductsPage;
