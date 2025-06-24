import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  PlusSquare, // New Icon
  X,
  Save,
} from 'lucide-react'
import { dbService, supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../utils/format'
import { useAuthContext } from '../hooks/AuthContext' // New Import
import type { Product, Category, Company } from '../lib/supabase'

interface ProductFormData {
  name: string
  sku: string
  company_id: string
  category_id: string
  cost_price: number
  selling_price: number
  current_stock: number
  description: string
  image_url: string
  is_active: boolean
}

export const ProductsPage: React.FC = () => {
  const { admin } = useAuthContext(); // New: Get the logged-in admin
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // State for Add/Edit Product Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // New: State for the Add Stock Modal
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null)
  const [stockToAdd, setStockToAdd] = useState<number>(0)

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
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [productsData, categoriesData, companiesData] = await Promise.all([
        dbService.getProducts(),
        dbService.getCategories(),
        dbService.getCompanies()
      ])
      
      setProducts(productsData)
      setCategories(categoriesData)
      setCompanies(companiesData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || product.category_id === categoryFilter
    const matchesCompany = !companyFilter || product.company_id === companyFilter
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'active' && product.is_active) ||
                         (statusFilter === 'inactive' && !product.is_active) ||
                         (statusFilter === 'low_stock' && product.current_stock < 50)
    
    return matchesSearch && matchesCategory && matchesCompany && matchesStatus
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingProduct) {
        await supabase.from('products').update({ ...formData, updated_at: new Date().toISOString() }).eq('id', editingProduct.id)
      } else {
        await supabase.from('products').insert({ ...formData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      }
      await loadData()
      resetForm()
    } catch (error) {
      console.error('Failed to save product:', error)
      alert('Failed to save product. Please try again.')
    }
  }
  
  // New: Function to handle adding stock
  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForStock || !admin || stockToAdd <= 0) return;

    const new_stock = selectedProductForStock.current_stock + stockToAdd;

    try {
      // 1. Update the product's stock count
      await supabase
        .from('products')
        .update({ current_stock: new_stock })
        .eq('id', selectedProductForStock.id);

      // 2. Create an inventory log for the restock event
      await supabase.from('inventory_logs').insert({
        product_id: selectedProductForStock.id,
        admin_id: admin.id,
        change_type: 'restock',
        quantity_change: stockToAdd,
        previous_stock: selectedProductForStock.current_stock,
        new_stock: new_stock,
        reason: 'Manual stock addition by admin'
      });
      
      await loadData();
      closeStockModal();
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock.');
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
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
    })
    setShowAddModal(true)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      await supabase.from('products').delete().eq('id', productId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('Failed to delete product. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', sku: '', company_id: '', category_id: '', cost_price: 0, selling_price: 0, current_stock: 0, description: '', image_url: '', is_active: true })
    setEditingProduct(null)
    setShowAddModal(false)
  }

  // New: Functions to open and close the stock modal
  const openStockModal = (product: Product) => {
    setSelectedProductForStock(product);
    setStockToAdd(0);
    setShowStockModal(true);
  }
  const closeStockModal = () => {
    setShowStockModal(false);
    setSelectedProductForStock(null);
    setStockToAdd(0);
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-100' }
    if (stock < 50) return { label: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' }
    return { label: 'In Stock', color: 'text-green-600 bg-green-100' }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Package className="h-8 w-8 text-quickcart-600 mr-3" />
            Product Management
          </h1>
          <p className="text-gray-600 mt-1">Manage your product catalog and inventory</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters Card... (no changes here) */}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
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
                        {/* New Add Stock Button */}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Product Modal... (no changes here) */}

      {/* New: Add Stock Modal */}
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
  )
}