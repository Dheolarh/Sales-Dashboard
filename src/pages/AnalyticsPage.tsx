import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart,
  Users,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Target,
  PieChart,
  Activity,
  Globe,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { dbService } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../utils/format'
import type { Product, Transaction, Category, Company } from '../lib/supabase'

// Colors for Pie chart slices
const COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#f59e42', // orange
  '#a21caf', // purple
  '#e11d48', // red
  '#0ea5e9', // sky
  '#fbbf24', // yellow
  '#6366f1', // indigo
]

interface AnalyticsData {
  revenue: {
    total: number
    growth: number
    trend: 'up' | 'down' | 'stable'
    daily: Array<{ date: string; revenue: number; transactions: number }>
  }
  products: {
    total: number
    lowStock: number
    topSelling: Array<{ product: Product; sales: number; revenue: number }>
    categoryPerformance: Array<{ category: string; revenue: number; count: number }>
  }
  customers: {
    totalOrders: number
    averageOrderValue: number
    topLocations: Array<{ location: string; orders: number; revenue: number }>
    orderTrends: Array<{ date: string; orders: number }>
  }
  performance: {
    conversionRate: number
    returnRate: number
    profitMargin: number
    inventoryTurnover: number
  }
}

interface DateRange {
  start: string
  end: string
  label: string
}

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    label: 'Last 30 Days'
  })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const [products, transactions, categories, companies] = await Promise.all([
        dbService.getProducts(),
        dbService.getRecentTransactions(1000),
        dbService.getCategories(),
        dbService.getCompanies()
      ])

      // Filter transactions by date range
      const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.transaction_time).toISOString().split('T')[0]
        return transactionDate >= dateRange.start && transactionDate <= dateRange.end
      })

      const analyticsData = await generateAnalytics(products, filteredTransactions, categories, companies)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAnalytics = async (
    products: Product[], 
    transactions: Transaction[], 
    categories: Category[],
    companies: Company[]
  ): Promise<AnalyticsData> => {
    // Revenue Analytics
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total_amount, 0)
    const dailyRevenue = generateDailyRevenue(transactions)
    const revenueGrowth = calculateGrowth(dailyRevenue)

    // Product Analytics
    const productSales = calculateProductSales(transactions, products)
    const topSellingProducts = productSales.slice(0, 10)
    const categoryPerformance = calculateCategoryPerformance(transactions, products, categories)
    const lowStockProducts = products.filter(p => p.current_stock < 50 && p.is_active).length

    // Customer Analytics
    const totalOrders = transactions.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const topLocations = calculateTopLocations(transactions)
    const orderTrends = generateOrderTrends(transactions)

    // Performance Metrics
    const totalCost = transactions.reduce((sum, t) => {
      const product = products.find(p => p.id === t.product_id)
      return sum + (product ? product.cost_price * t.quantity : 0)
    }, 0)
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

    return {
      revenue: {
        total: totalRevenue,
        growth: revenueGrowth,
        trend: revenueGrowth > 5 ? 'up' : revenueGrowth < -5 ? 'down' : 'stable',
        daily: dailyRevenue
      },
      products: {
        total: products.length,
        lowStock: lowStockProducts,
        topSelling: topSellingProducts,
        categoryPerformance
      },
      customers: {
        totalOrders,
        averageOrderValue,
        topLocations,
        orderTrends
      },
      performance: {
        conversionRate: 85.5, // Simulated
        returnRate: 2.3, // Simulated
        profitMargin,
        inventoryTurnover: 4.2 // Simulated
      }
    }
  }

  const generateDailyRevenue = (transactions: Transaction[]) => {
    if (!transactions || transactions.length === 0) return [];
    const dailyData: Record<string, { revenue: number; transactions: number }> = {}
    
    transactions.forEach(t => {
      const date = new Date(t.transaction_time).toISOString().split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, transactions: 0 }
      }
      dailyData[date].revenue += t.total_amount
      dailyData[date].transactions += 1
    })

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const calculateGrowth = (dailyData: Array<{ date: string; revenue: number }>) => {
    if (!dailyData || dailyData.length < 2) return 0
    
    const midpoint = Math.floor(dailyData.length / 2)
    const firstHalf = dailyData.slice(0, midpoint).reduce((sum, d) => sum + d.revenue, 0)
    const secondHalf = dailyData.slice(midpoint).reduce((sum, d) => sum + d.revenue, 0)
    
    if (firstHalf === 0) return secondHalf > 0 ? 100 : 0;
    return ((secondHalf - firstHalf) / firstHalf) * 100
  }

  const calculateProductSales = (transactions: Transaction[], products: Product[]) => {
    if (!transactions || transactions.length === 0) return [];
    const productSales: Record<string, { sales: number; revenue: number; product: Product }> = {}
    
    transactions.forEach(t => {
      const product = products.find(p => p.id === t.product_id)
      if (product) {
        if (!productSales[t.product_id]) {
          productSales[t.product_id] = { sales: 0, revenue: 0, product }
        }
        productSales[t.product_id].sales += t.quantity
        productSales[t.product_id].revenue += t.total_amount
      }
    })

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
  }

  const calculateCategoryPerformance = (transactions: Transaction[], products: Product[], categories: Category[]) => {
    if (!transactions || transactions.length === 0) return [];
    const categoryData: Record<string, { revenue: number; count: number }> = {}
    
    transactions.forEach(t => {
      const product = products.find(p => p.id === t.product_id)
      if (product) {
        const category = categories.find(c => c.id === product.category_id)
        const categoryName = category?.name || 'Unknown'
        
        if (!categoryData[categoryName]) {
          categoryData[categoryName] = { revenue: 0, count: 0 }
        }
        categoryData[categoryName].revenue += t.total_amount
        categoryData[categoryName].count += 1
      }
    })

    return Object.entries(categoryData)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
  }

  const calculateTopLocations = (transactions: Transaction[]) => {
    if (!transactions || transactions.length === 0) return [];
    const locationData: Record<string, { orders: number; revenue: number }> = {}
    
    transactions.forEach(t => {
      const location = t.customer_location || 'Unknown'
      if (!locationData[location]) {
        locationData[location] = { orders: 0, revenue: 0 }
      }
      locationData[location].orders += 1
      locationData[location].revenue += t.total_amount
    })

    return Object.entries(locationData)
      .map(([location, data]) => ({ location, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }

  const generateOrderTrends = (transactions: Transaction[]) => {
    if (!transactions || transactions.length === 0) return [];
    const dailyOrders: Record<string, number> = {}
    
    transactions.forEach(t => {
      const date = new Date(t.transaction_time).toISOString().split('T')[0]
      dailyOrders[date] = (dailyOrders[date] || 0) + 1
    })

    return Object.entries(dailyOrders)
      .map(([date, orders]) => ({ date, orders }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const refreshAnalytics = async () => {
    setRefreshing(true)
    await loadAnalytics()
    setRefreshing(false)
  }

  const exportReport = () => {
    if (!analytics) return

    const reportData = {
      dateRange: `${dateRange.start} to ${dateRange.end}`,
      revenue: analytics.revenue,
      products: analytics.products,
      customers: analytics.customers,
      performance: analytics.performance,
      generatedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_report_${dateRange.start}_${dateRange.end}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const setQuickDateRange = (days: number, label: string) => {
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setDateRange({ start, end, label })
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-600" />
      case 'down': return <ArrowDown className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600">Unable to load analytics data. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Fix alignment */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-quickcart-600 mr-2 sm:mr-3" />
            Analytics & Reporting
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Comprehensive business intelligence and performance insights</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            onClick={refreshAnalytics} 
            disabled={refreshing}
            className="w-full sm:w-auto"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={exportReport}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Range Filter - Fix alignment and functionality */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1">
              {/* Quick Date Range Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={dateRange.label === 'Last 7 Days' ? 'primary' : 'outline'}
                  onClick={() => setQuickDateRange(7, 'Last 7 Days')}
                >
                  7 Days
                </Button>
                <Button
                  size="sm"
                  variant={dateRange.label === 'Last 30 Days' ? 'primary' : 'outline'}
                  onClick={() => setQuickDateRange(30, 'Last 30 Days')}
                >
                  30 Days
                </Button>
                <Button
                  size="sm"
                  variant={dateRange.label === 'Last 90 Days' ? 'primary' : 'outline'}
                  onClick={() => setQuickDateRange(90, 'Last 90 Days')}
                >
                  90 Days
                </Button>
              </div>
              
              {/* Custom Date Range */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value, label: 'Custom Range'})}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500 w-full sm:w-auto"
                />
                <span className="text-sm text-gray-600 hidden sm:inline">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value, label: 'Custom Range'})}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500 w-full sm:w-auto"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards - Fix responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(analytics.revenue.total)}</p>
                <div className={`flex items-center mt-1 ${getTrendColor(analytics.revenue.trend)}`}>
                  {getTrendIcon(analytics.revenue.trend)}
                  <span className="text-sm ml-1">
                    {analytics.revenue.growth > 0 ? '+' : ''}{analytics.revenue.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{analytics.customers.totalOrders.toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Avg: {formatCurrency(analytics.customers.averageOrderValue)}
                </p>
              </div>
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Active Products</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{analytics.products.total}</p>
                <p className="text-sm text-red-600 mt-1">
                  {analytics.products.lowStock} low stock
                </p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Profit Margin</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{analytics.performance.profitMargin.toFixed(1)}%</p>
                <p className="text-sm text-gray-600 mt-1">
                  Conversion: {analytics.performance.conversionRate}%
                </p>
              </div>
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenue.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tickFormatter={(value) => `$${value.toFixed(0)}`} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value as number) : value,
                      name === 'revenue' ? 'Revenue' : 'Transactions'
                    ]}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#2563eb" 
                    fill="#2563eb" 
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Order Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.customers.orderTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value, 'Orders']}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Bar dataKey="orders" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Category Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={analytics.products.categoryPerformance.slice(0, 6)}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ category, revenue }) => `${category}: ${formatCurrency(revenue)}`}
                  >
                    {analytics.products.categoryPerformance.slice(0, 6).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.products.topSelling.slice(0, 5).map((item, index) => (
                <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-quickcart-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-600">{item.sales} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(item.revenue)}</p>
                    <p className="text-sm text-gray-600">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Performance & Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Top Customer Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.customers.topLocations.slice(0, 8).map((location, index) => (
                <div key={location.location} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-gray-900">{location.location}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(location.revenue)}</p>
                    <p className="text-sm text-gray-600">{location.orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Conversion Rate</span>
                  <span className="text-sm font-bold text-gray-900">{analytics.performance.conversionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.performance.conversionRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Profit Margin</span>
                  <span className="text-sm font-bold text-gray-900">{analytics.performance.profitMargin.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(analytics.performance.profitMargin, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Inventory Turnover</span>
                  <span className="text-sm font-bold text-gray-900">{analytics.performance.inventoryTurnover}x</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(analytics.performance.inventoryTurnover * 20, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Return Rate</span>
                  <span className="text-sm font-bold text-gray-900">{analytics.performance.returnRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.performance.returnRate * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Insights - Fix duplicated content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-blue-900">Revenue Growth</h4>
              </div>
              <p className="text-sm text-blue-800">
                {analytics.revenue.growth > 0 
                  ? `Revenue is up ${analytics.revenue.growth.toFixed(1)}% compared to the previous period. Strong performance!`
                  : analytics.revenue.growth < 0
                  ? `Revenue is down ${Math.abs(analytics.revenue.growth).toFixed(1)}% compared to the previous period. Consider promotional strategies.`
                  : 'Revenue is stable compared to the previous period.'
                }
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Package className="h-5 w-5 text-green-600 mr-2" />
                <h4 className="font-medium text-green-900">Inventory Health</h4>
              </div>
              <p className="text-sm text-green-800">
                {analytics.products.lowStock > 0 
                  ? `${analytics.products.lowStock} products have low stock. Consider restocking to avoid stockouts.`
                  : 'All products have healthy stock levels. Great inventory management!'
                }
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Target className="h-5 w-5 text-purple-600 mr-2" />
                <h4 className="font-medium text-purple-900">Performance</h4>
              </div>
              <p className="text-sm text-purple-800">
                {analytics.performance.profitMargin > 30 
                  ? 'Excellent profit margins! Your pricing strategy is working well.'
                  : analytics.performance.profitMargin > 15
                  ? 'Good profit margins. Consider optimizing costs for better profitability.'
                  : 'Profit margins could be improved. Review pricing and cost structure.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
