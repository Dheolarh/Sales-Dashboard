import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  PlusSquare,
  X,
  Save,
} from 'lucide-react';
import { dbService, supabase } from '../lib/supabase';
import { formatCurrency, formatDateTime } from '../utils/format';
import { useAuthContext } from '../hooks/AuthContext';
import type { Product, Category, Company } from '../lib/supabase';

interface ProductFormData {
  name: string;
  sku: string;
  company_id: string;
  category_id: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  description: string;
  image_url: string;
  is_active: boolean;
}

export const ProductsPage: React.FC = () => {
  const { admin } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [stockToAdd, setStockToAdd] = useState<number>(0);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    company_id: '',
    category_id: '',
    cost_price: 0,
    selling_price: 0,
    current_stock: 0,
    description: '',
    image_url: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
    if (admin) {
      dbService.logActivity({
        admin_id: admin.id,
        action_type: 'PAGE_VISIT',
        details: { page: '/products' }
      });
    }
  }, [admin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData, companiesData] = await Promise.all([
        dbService.getProducts(),
        dbService.getCategories(),
        dbService.getCompanies()
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.category_id === categoryFilter;
    const matchesCompany = !companyFilter || product.company_id === companyFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active) ||
      (statusFilter === 'low_stock' && product.current_stock < 50);

    return matchesSearch && matchesCategory && matchesCompany && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) {
      alert("You must be logged in to perform this action.");
      return;
    }

    try {
      // Prepare the product data for insertion/update
      const productData = {
        name: formData.name,
        sku: formData.sku,
        company_id: formData.company_id,
        category_id: formData.category_id,
        cost_price: formData.cost_price,
        selling_price: formData.selling_price,
        current_stock: formData.current_stock,
        description: formData.description,
        image_url: formData.image_url,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      let savedProduct: Product | null = null;
      if (editingProduct) {
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .select()
          .single();
        if (error) throw error;
        savedProduct = data;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({ 
            ...productData, 
            created_at: new Date().toISOString() 
          })
          .select()
          .single();
        if (error) throw error;
        savedProduct = data;
      }

      // Log the activity
      if (savedProduct && admin) {
        dbService.logActivity({
          admin_id: admin.id,
          action_type: editingProduct ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
          details: {
            productId: savedProduct.id,
            productName: savedProduct.name,
          },
        });
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForStock || !admin || !stockToAdd || stockToAdd <= 0) return;

    const new_stock = selectedProductForStock.current_stock + stockToAdd;

    try {
      await supabase
        .from('products')
        .update({ current_stock: new_stock, updated_at: new Date().toISOString() })
        .eq('id', selectedProductForStock.id);

      // Log the inventory change
      await supabase.from('inventory_logs').insert({
        product_id: selectedProductForStock.id,
        admin_id: admin.id,
        change_type: 'restock',
        quantity_change: stockToAdd,
        previous_stock: selectedProductForStock.current_stock,
        new_stock: new_stock,
        reason: 'Manual stock addition by admin'
      });

      // Log this as a general activity
      dbService.logActivity({
        admin_id: admin.id,
        action_type: 'UPDATE_STOCK',
        details: {
          productId: selectedProductForStock.id,
          productName: selectedProductForStock.name,
          quantityAdded: stockToAdd,
          newStock: new_stock
        }
      });

      await loadData();
      closeStockModal();
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      company_id: product.company_id,
      category_id: product.category_id,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      current_stock: product.current_stock,
      description: product.description,
      image_url: product.image_url,
      is_active: product.is_active
    });
    setShowAddModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const productToDelete = products.find(p => p.id === productId);
      if (admin && productToDelete) {
        dbService.logActivity({
          admin_id: admin.id,
          action_type: 'DELETE_PRODUCT',
          details: {
            productId: productToDelete.id,
            productName: productToDelete.name
          }
        });
      }

      await supabase.from('products').delete().eq('id', productId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      sku: '', 
      company_id: '', 
      category_id: '', 
      cost_price: 0, 
      selling_price: 0, 
      current_stock: 0, 
      description: '', 
      image_url: '', 
      is_active: true 
    });
    setEditingProduct(null);
    setShowAddModal(false);
  };

  const openStockModal = (product: Product) => {
    setSelectedProductForStock(product);
    setStockToAdd(0);
    setShowStockModal(true);
  };

  const closeStockModal = () => {
    setShowStockModal(false);
    setSelectedProductForStock(null);
    setStockToAdd(0);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (stock < 50) return { label: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { label: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-quickcart-600 mr-2 sm:mr-3" />
            Products
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your product inventory</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500">
              <option value="">All Categories</option>
              {categories.map(category => (<option key={category.id} value={category.id}>{category.name}</option>))}
            </select>
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500">
              <option value="">All Companies</option>
              {companies.map(company => (<option key={company.id} value={company.id}>{company.name}</option>))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="low_stock">Low Stock</option>
            </select>
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              {filteredProducts.length} products found
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map(product => {
                  const stockStatus = getStockStatus(product.current_stock);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img src={product.image_url || `https://via.placeholder.com/40`} alt={product.name} className="w-10 h-10 object-cover rounded mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.company?.name || 'Unknown'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(product.selling_price)}</div>
                        <div className="text-sm text-gray-500">Cost: {formatCurrency(product.cost_price)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.current_stock}</div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>{stockStatus.label}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.is_active ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>{product.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openStockModal(product)} title="Add Stock">
                          <PlusSquare className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(product)} title="Edit Product">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-700" title="Delete Product">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={resetForm} />
            <Card className="relative w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{editingProduct ? 'Edit Product' : 'Add New Product'}</span>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Product Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    <Input label="SKU" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <select value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500" required>
                        <option value="">Select Company</option>
                        {companies.map(company => (<option key={company.id} value={company.id}>{company.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500" required>
                        <option value="">Select Category</option>
                        {categories.map(category => (<option key={category.id} value={category.id}>{category.name}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="Cost Price" type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })} required />
                    <Input label="Selling Price" type="number" step="0.01" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })} required />
                    <Input label="Current Stock" type="number" value={formData.current_stock} onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })} required />
                  </div>
                  <Input label="Image URL" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://example.com/image.jpg" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500" rows={3} placeholder="Product description..." />
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500" />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">Product is active</label>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button type="submit"><Save className="h-4 w-4 mr-1" />{editingProduct ? 'Update Product' : 'Create Product'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {showStockModal && selectedProductForStock && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeStockModal} />
            <Card className="relative w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Add Stock for {selectedProductForStock.name}</span>
                  <button onClick={closeStockModal} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStockUpdate} className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Stock: <span className="font-bold">{selectedProductForStock.current_stock}</span></p>
                  </div>
                  <Input
                    label="Quantity to Add"
                    type="number"
                    value={stockToAdd || ''}
                    onChange={(e) => setStockToAdd(parseInt(e.target.value) || 0)}
                    placeholder="e.g., 100"
                    required
                    min="1"
                  />
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={closeStockModal}>Cancel</Button>
                    <Button type="submit"><Plus className="h-4 w-4 mr-1" />Add Stock</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};