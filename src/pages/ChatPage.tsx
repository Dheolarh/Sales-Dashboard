import React, { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  TrendingUp, 
  Package, 
  DollarSign,
  AlertTriangle,
  Clock,
  Lightbulb,
  BarChart3,
  ShoppingCart,
  Zap,
  RefreshCw,
  Mic,
  MicOff,
  Copy,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { dbService } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../utils/format'
import { useAuthContext } from '../hooks/AuthContext'
import type { Product, Transaction, ErrorLog } from '../lib/supabase'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
  data?: any
  isTyping?: boolean
}

interface BusinessContext {
  products: Product[]
  transactions: Transaction[]
  errorLogs: ErrorLog[]
  stats: {
    totalRevenue: number
    totalProducts: number
    totalTransactions: number
    unresolvedErrors: number
  }
}

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: 'Show revenue trends', query: 'Show me the revenue trends for the last 30 days' },
  { icon: Package, label: 'Low stock alerts', query: 'Which products have low stock?' },
  { icon: AlertTriangle, label: 'Recent errors', query: 'What are the recent system errors?' },
  { icon: BarChart3, label: 'Top products', query: 'What are our best-selling products?' },
  { icon: DollarSign, label: 'Profit analysis', query: 'Analyze our profit margins' },
  { icon: ShoppingCart, label: 'Order insights', query: 'Give me insights about recent orders' }
]

const SAMPLE_QUESTIONS = [
  "What's our total revenue this month?",
  "Which products are running low on stock?",
  "Show me the top 5 best-selling products",
  "What errors need my attention?",
  "How is our business performing?",
  "What are the recent sales trends?",
  "Which categories are most profitable?",
  "What's our average order value?"
]

export const ChatPage: React.FC = () => {
  const { admin } = useAuthContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadBusinessContext()
    initializeChat()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadBusinessContext = async () => {
    try {
      const [products, transactions, errorLogs] = await Promise.all([
        dbService.getProducts(),
        dbService.getRecentTransactions(500),
        dbService.getErrorLogs()
      ])

      const stats = {
        totalRevenue: transactions.reduce((sum, t) => sum + t.total_amount, 0),
        totalProducts: products.length,
        totalTransactions: transactions.length,
        unresolvedErrors: errorLogs.filter(e => !e.resolved).length
      }

      setBusinessContext({ products, transactions, errorLogs, stats })
    } catch (error) {
      console.error('Failed to load business context:', error)
    }
  }

  const initializeChat = () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: `Hello ${admin?.full_name || 'there'}! 👋 I'm Stella, your AI business assistant. I can help you analyze your QuickCart data, answer questions about your business performance, and provide insights to help you make better decisions.\n\nWhat would you like to know about your business today?`,
      timestamp: new Date(),
      suggestions: [
        'Show business overview',
        'Analyze sales performance',
        'Check inventory status',
        'Review recent errors'
      ]
    }
    setMessages([welcomeMessage])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (message?: string) => {
    const messageText = message || inputValue.trim()
    if (!messageText || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    }
    setMessages(prev => [...prev, typingMessage])

    try {
      const response = await processUserQuery(messageText)
      
      // Remove typing indicator and add response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing')
        return [...filtered, response]
      })
    } catch (error) {
      console.error('Failed to process query:', error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error while processing your request. Please try again or rephrase your question.",
        timestamp: new Date()
      }
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing')
        return [...filtered, errorMessage]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const processUserQuery = async (query: string): Promise<ChatMessage> => {
    if (!businessContext) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I'm still loading your business data. Please wait a moment and try again.",
        timestamp: new Date()
      }
    }

    const lowerQuery = query.toLowerCase()
    
    // Revenue-related queries
    if (lowerQuery.includes('revenue') || lowerQuery.includes('sales') || lowerQuery.includes('income')) {
      return handleRevenueQuery(query)
    }
    
    // Product-related queries
    if (lowerQuery.includes('product') || lowerQuery.includes('inventory') || lowerQuery.includes('stock')) {
      return handleProductQuery(query)
    }
    
    // Error-related queries
    if (lowerQuery.includes('error') || lowerQuery.includes('problem') || lowerQuery.includes('issue')) {
      return handleErrorQuery(query)
    }
    
    // Performance/analytics queries
    if (lowerQuery.includes('performance') || lowerQuery.includes('analytics') || lowerQuery.includes('insight')) {
      return handlePerformanceQuery(query)
    }
    
    // Order-related queries
    if (lowerQuery.includes('order') || lowerQuery.includes('transaction') || lowerQuery.includes('customer')) {
      return handleOrderQuery(query)
    }
    
    // Business overview
    if (lowerQuery.includes('overview') || lowerQuery.includes('summary') || lowerQuery.includes('dashboard')) {
      return handleOverviewQuery(query)
    }
    
    // Default response with suggestions
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: "I can help you with various aspects of your business. Here are some things you can ask me about:",
      timestamp: new Date(),
      suggestions: [
        'Show revenue trends',
        'Check product inventory',
        'Review system errors',
        'Analyze customer orders',
        'Business performance summary'
      ]
    }
  }

  const handleRevenueQuery = (query: string): ChatMessage => {
    const { transactions, stats } = businessContext!
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const recentTransactions = transactions.filter(t => 
      new Date(t.transaction_time) >= thirtyDaysAgo
    )
    const recentRevenue = recentTransactions.reduce((sum, t) => sum + t.total_amount, 0)
    
    // Calculate daily average
    const dailyAverage = recentRevenue / 30
    
    // Find best day
    const dailyRevenue: Record<string, number> = {}
    recentTransactions.forEach(t => {
      const date = new Date(t.transaction_time).toDateString()
      dailyRevenue[date] = (dailyRevenue[date] || 0) + t.total_amount
    })
    
    const bestDay = Object.entries(dailyRevenue)
      .sort(([,a], [,b]) => b - a)[0]

    let content = `📊 **Revenue Analysis**\n\n`
    content += `• **Total Revenue (All Time):** ${formatCurrency(stats.totalRevenue)}\n`
    content += `• **Last 30 Days:** ${formatCurrency(recentRevenue)}\n`
    content += `• **Daily Average:** ${formatCurrency(dailyAverage)}\n`
    
    if (bestDay) {
      content += `• **Best Day:** ${new Date(bestDay[0]).toLocaleDateString()} (${formatCurrency(bestDay[1])})\n`
    }
    
    content += `\n💡 **Insights:**\n`
    if (recentRevenue > stats.totalRevenue * 0.3) {
      content += `• Strong recent performance! Last 30 days represent ${((recentRevenue / stats.totalRevenue) * 100).toFixed(1)}% of total revenue.`
    } else {
      content += `• Consider implementing promotional strategies to boost recent sales performance.`
    }

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: ['Show top-selling products', 'Analyze profit margins', 'Check order trends']
    }
  }

  const handleProductQuery = (query: string): ChatMessage => {
    const { products } = businessContext!
    const lowerQuery = query.toLowerCase()
    
    let content = ''
    let suggestions: string[] = []

    if (lowerQuery.includes('low stock') || lowerQuery.includes('inventory')) {
      const lowStockProducts = products.filter(p => p.current_stock < 50 && p.is_active)
      
      content = `📦 **Inventory Status**\n\n`
      content += `• **Total Active Products:** ${products.filter(p => p.is_active).length}\n`
      content += `• **Low Stock Products:** ${lowStockProducts.length}\n\n`
      
      if (lowStockProducts.length > 0) {
        content += `⚠️ **Products Needing Attention:**\n`
        lowStockProducts.slice(0, 5).forEach(product => {
          content += `• ${product.name} - ${product.current_stock} units (SKU: ${product.sku})\n`
        })
        
        if (lowStockProducts.length > 5) {
          content += `• ...and ${lowStockProducts.length - 5} more products\n`
        }
      } else {
        content += `✅ All products have healthy stock levels!`
      }
      
      suggestions = ['Show best-selling products', 'Check product categories', 'Analyze product performance']
    } else if (lowerQuery.includes('best') || lowerQuery.includes('top') || lowerQuery.includes('selling')) {
      const { transactions } = businessContext!
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
      
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
      
      content = `🏆 **Top-Selling Products**\n\n`
      topProducts.forEach((item, index) => {
        content += `${index + 1}. **${item.product.name}**\n`
        content += `   • Revenue: ${formatCurrency(item.revenue)}\n`
        content += `   • Units Sold: ${item.sales}\n`
        content += `   • Current Stock: ${item.product.current_stock}\n\n`
      })
      
      suggestions = ['Check inventory levels', 'Analyze profit margins', 'Show category performance']
    } else {
      // General product overview
      const activeProducts = products.filter(p => p.is_active)
      const totalValue = activeProducts.reduce((sum, p) => sum + (p.selling_price * p.current_stock), 0)
      
      content = `📦 **Product Overview**\n\n`
      content += `• **Total Products:** ${products.length}\n`
      content += `• **Active Products:** ${activeProducts.length}\n`
      content += `• **Total Inventory Value:** ${formatCurrency(totalValue)}\n`
      content += `• **Average Product Price:** ${formatCurrency(activeProducts.reduce((sum, p) => sum + p.selling_price, 0) / activeProducts.length)}\n`
      
      suggestions = ['Show low stock products', 'Top-selling products', 'Product categories']
    }

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      suggestions
    }
  }

  const handleErrorQuery = (query: string): ChatMessage => {
    const { errorLogs } = businessContext!
    const unresolvedErrors = errorLogs.filter(e => !e.resolved)
    const recentErrors = errorLogs.filter(e => 
      new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )
    
    let content = `🚨 **System Status**\n\n`
    content += `• **Total Errors:** ${errorLogs.length}\n`
    content += `• **Unresolved:** ${unresolvedErrors.length}\n`
    content += `• **Recent (7 days):** ${recentErrors.length}\n\n`
    
    if (unresolvedErrors.length > 0) {
      content += `⚠️ **Unresolved Issues:**\n`
      unresolvedErrors.slice(0, 3).forEach(error => {
        const severityEmoji = error.severity === 'critical' ? '🔴' : 
                             error.severity === 'high' ? '🟠' : 
                             error.severity === 'medium' ? '🟡' : '🟢'
        content += `${severityEmoji} ${error.error_type.replace('_', ' ').toUpperCase()}\n`
        content += `   ${error.description}\n`
        content += `   Created: ${formatDateTime(error.created_at)}\n\n`
      })
      
      if (unresolvedErrors.length > 3) {
        content += `...and ${unresolvedErrors.length - 3} more issues\n\n`
      }
      
      content += `💡 **Recommendation:** Review and resolve critical and high-priority errors first.`
    } else {
      content += `✅ **Great news!** No unresolved errors in the system.`
    }

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: ['Show system performance', 'Check inventory status', 'Business overview']
    }
  }

  const handlePerformanceQuery = (query: string): ChatMessage => {
    const { transactions, products, stats } = businessContext!
    
    // Calculate performance metrics
    const totalCost = transactions.reduce((sum, t) => {
      const product = products.find(p => p.id === t.product_id)
      return sum + (product ? product.cost_price * t.quantity : 0)
    }, 0)
    
    const profitMargin = stats.totalRevenue > 0 ? ((stats.totalRevenue - totalCost) / stats.totalRevenue) * 100 : 0
    const averageOrderValue = stats.totalTransactions > 0 ? stats.totalRevenue / stats.totalTransactions : 0
    
    // Recent performance (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentTransactions = transactions.filter(t => new Date(t.transaction_time) >= thirtyDaysAgo)
    const recentRevenue = recentTransactions.reduce((sum, t) => sum + t.total_amount, 0)
    
    let content = `📈 **Business Performance Analysis**\n\n`
    content += `**Financial Metrics:**\n`
    content += `• **Total Revenue:** ${formatCurrency(stats.totalRevenue)}\n`
    content += `• **Profit Margin:** ${profitMargin.toFixed(1)}%\n`
    content += `• **Average Order Value:** ${formatCurrency(averageOrderValue)}\n`
    content += `• **Recent Revenue (30d):** ${formatCurrency(recentRevenue)}\n\n`
    
    content += `**Operational Metrics:**\n`
    content += `• **Total Orders:** ${stats.totalTransactions.toLocaleString()}\n`
    content += `• **Active Products:** ${products.filter(p => p.is_active).length}\n`
    content += `• **System Health:** ${stats.unresolvedErrors === 0 ? '✅ Excellent' : `⚠️ ${stats.unresolvedErrors} issues`}\n\n`
    
    content += `**Performance Insights:**\n`
    if (profitMargin > 30) {
      content += `• 🎯 Excellent profit margins! Your pricing strategy is working well.\n`
    } else if (profitMargin > 15) {
      content += `• 📊 Good profit margins. Consider optimizing costs for better profitability.\n`
    } else {
      content += `• 📉 Profit margins could be improved. Review pricing and cost structure.\n`
    }
    
    if (averageOrderValue > 50) {
      content += `• 💰 Strong average order value indicates good customer engagement.\n`
    } else {
      content += `• 🎯 Consider upselling strategies to increase average order value.\n`
    }

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: ['Show revenue trends', 'Analyze top products', 'Check customer insights']
    }
  }

  const handleOrderQuery = (query: string): ChatMessage => {
    const { transactions } = businessContext!
    
    // Recent orders analysis
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const todayOrders = transactions.filter(t => 
      new Date(t.transaction_time).toDateString() === today.toDateString()
    )
    const yesterdayOrders = transactions.filter(t => 
      new Date(t.transaction_time).toDateString() === yesterday.toDateString()
    )
    const weeklyOrders = transactions.filter(t => new Date(t.transaction_time) >= lastWeek)
    
    // Location analysis
    const locationData: Record<string, { orders: number; revenue: number }> = {}
    transactions.forEach(t => {
      const location = t.customer_location || 'Unknown'
      if (!locationData[location]) {
        locationData[location] = { orders: 0, revenue: 0 }
      }
      locationData[location].orders += 1
      locationData[location].revenue += t.total_amount
    })
    
    const topLocations = Object.entries(locationData)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .slice(0, 5)
    
    let content = `🛒 **Order Analysis**\n\n`
    content += `**Recent Activity:**\n`
    content += `• **Today:** ${todayOrders.length} orders (${formatCurrency(todayOrders.reduce((sum, t) => sum + t.total_amount, 0))})\n`
    content += `• **Yesterday:** ${yesterdayOrders.length} orders (${formatCurrency(yesterdayOrders.reduce((sum, t) => sum + t.total_amount, 0))})\n`
    content += `• **Last 7 Days:** ${weeklyOrders.length} orders (${formatCurrency(weeklyOrders.reduce((sum, t) => sum + t.total_amount, 0))})\n\n`
    
    content += `**Top Customer Locations:**\n`
    topLocations.forEach(([location, data], index) => {
      content += `${index + 1}. **${location}** - ${data.orders} orders (${formatCurrency(data.revenue)})\n`
    })
    
    content += `\n**Order Insights:**\n`
    const avgDailyOrders = weeklyOrders.length / 7
    if (todayOrders.length > avgDailyOrders * 1.2) {
      content += `• 📈 Today's order volume is above average - great performance!\n`
    } else if (todayOrders.length < avgDailyOrders * 0.8) {
      content += `• 📉 Today's order volume is below average - consider promotional activities.\n`
    } else {
      content += `• 📊 Order volume is consistent with recent trends.\n`
    }

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: ['Show customer locations', 'Analyze order trends', 'Check product performance']
    }
  }

  const handleOverviewQuery = (query: string): ChatMessage => {
    const { stats, products, transactions, errorLogs } = businessContext!
    
    const lowStockCount = products.filter(p => p.current_stock < 50 && p.is_active).length
    const recentTransactions = transactions.filter(t => 
      new Date(t.transaction_time) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    )
    
    let content = `🏢 **QuickCart Business Overview**\n\n`
    content += `**📊 Key Metrics:**\n`
    content += `• **Total Revenue:** ${formatCurrency(stats.totalRevenue)}\n`
    content += `• **Total Orders:** ${stats.totalTransactions.toLocaleString()}\n`
    content += `• **Active Products:** ${products.filter(p => p.is_active).length}\n`
    content += `• **Today's Orders:** ${recentTransactions.length}\n\n`
    
    content += `**🎯 System Health:**\n`
    if (stats.unresolvedErrors === 0) {
      content += `• ✅ No unresolved system errors\n`
    } else {
      content += `• ⚠️ ${stats.unresolvedErrors} unresolved errors need attention\n`
    }
    
    if (lowStockCount === 0) {
      content += `• ✅ All products have healthy stock levels\n`
    } else {
      content += `• 📦 ${lowStockCount} products have low stock\n`
    }
    
    content += `\n**💡 Quick Insights:**\n`
    const avgOrderValue = stats.totalRevenue / stats.totalTransactions
    content += `• Average order value: ${formatCurrency(avgOrderValue)}\n`
    
    if (recentTransactions.length > 0) {
      content += `• Recent activity looks ${recentTransactions.length > 10 ? 'strong' : 'moderate'}\n`
    }
    
    content += `\n**🚀 What would you like to explore next?**`

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: [
        'Analyze revenue trends',
        'Check inventory status',
        'Review system errors',
        'Show top products',
        'Customer insights'
      ]
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      
      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInputValue(transcript)
      }
      
      recognition.start()
    }
  }

  return (
    <div className="p-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bot className="h-8 w-8 text-quickcart-600 mr-3" />
            Stella - AI Business Assistant
          </h1>
          <p className="text-gray-600 mt-1">Your intelligent business companion for data insights and analysis</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>AI Assistant Online</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Zap className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="flex items-center justify-start p-3 h-auto text-left"
                  onClick={() => handleSendMessage(action.query)}
                >
                  <action.icon className="h-4 w-4 mr-2 text-quickcart-600" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-quickcart-600 text-white' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  }`}>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>
                  
                  <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-quickcart-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.isTyping ? (
                        <div className="flex items-center space-x-1">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                          <span className="text-sm text-gray-600 ml-2">Stella is thinking...</span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-line">{message.content}</div>
                      )}
                    </div>
                    
                    {message.type === 'assistant' && !message.isTyping && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyMessage(message.content)}
                          className="text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendMessage(suggestion)}
                            className="text-xs"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your business..."
                  disabled={isLoading}
                  className="pr-12"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={startVoiceInput}
                  disabled={isLoading || isListening}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="flex items-center"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Sample Questions */}
            {messages.length <= 1 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_QUESTIONS.slice(0, 4).map((question, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSendMessage(question)}
                      className="text-xs text-gray-600 hover:text-quickcart-600"
                    >
                      "{question}"
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}