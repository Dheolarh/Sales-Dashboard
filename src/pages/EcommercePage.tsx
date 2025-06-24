import React, { useState, useEffect } from 'react'
import { ShoppingCart, Star, Filter, Search, Check } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase, dbService, type Product, type Category, type Company } from '../lib/supabase'
import { formatCurrency } from '../utils/format'
import { EcommerceCart } from '../components/ecommerce/EcommerceCart'
import { EcommerceHeader } from '../components/ecommerce/EcommerceHeader'

interface CartItem {
  product: Product
  quantity: number
}

export const EcommercePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [showCart, setShowCart] = useState(false)
  const [justAddedProductId, setJustAddedProductId] = useState<string | null>(null)

  useEffect(() => {
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
        console.error('Failed to load ecommerce data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Realtime subscription for product updates (e.g., stock changes)
    const subscription = supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const updatedProduct = payload.new as Product
          setProducts(prevProducts =>
            prevProducts.map(p =>
              p.id === updatedProduct.id ? updatedProduct : p
            )
          )
        }
      )
      .subscribe()

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory
    const matchesCompany = !selectedCompany || product.company_id === selectedCompany
    
    return matchesSearch && matchesCategory && matchesCompany && product.is_active
  })

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.current_stock) }
            : item
        )
      }
      return [...prevCart, { product, quantity: 1 }]
    })

    // Show "Added!" notifier
    setJustAddedProductId(product.id)
    setTimeout(() => {
      setJustAddedProductId(null)
    }, 2000)
  }

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.product.id !== productId))
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.min(quantity, item.product.current_stock) }
            : item
        )
      )
    }
  }

  const getTotalItems = () => cart.reduce((sum, item) => sum + item.quantity, 0)
  const getTotalPrice = () => cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse p-8">
          <div className="h-16 bg-gray-200 rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EcommerceHeader 
        cartItemCount={getTotalItems()}
        onCartClick={() => setShowCart(true)}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
            >
              <option value="">All Brands</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              {filteredProducts.length} products found
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const isJustAdded = justAddedProductId === product.id
            const isOutOfStock = product.current_stock === 0
            
            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-w-1 aspect-h-1 bg-gray-200">
                  <img
                    src={product.image_url || `https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=400`}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.company?.name}</p>
                    <p className="text-sm text-quickcart-600">{product.category?.name}</p>
                  </div>
                  
                  <div className="flex items-center mb-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 ml-2">(4.5)</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(product.selling_price)}
                      </span>
                      <p className={`text-sm ${isOutOfStock ? 'text-red-500' : 'text-gray-600'}`}>
                        {isOutOfStock ? 'Out of stock' : `${product.current_stock} in stock`}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => addToCart(product)}
                    className={`w-full ${isJustAdded ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    disabled={isOutOfStock || isJustAdded}
                  >
                    {isJustAdded ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Added!
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No products found matching your criteria</div>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <EcommerceCart
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        totalPrice={getTotalPrice()}
      />
    </div>
  )
}