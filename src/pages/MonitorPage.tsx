import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package,
  Users,
  RefreshCw,
  Shield,
  Target
} from 'lucide-react'
import { dbService } from '../lib/supabase'
import { aiMonitoringService } from '../services/aiMonitoringService'
import { formatCurrency, formatDateTime } from '../utils/format'
import type { ErrorLog, Product, Transaction } from '../lib/supabase'

interface MonitoringStats {
  totalScans: number
  anomaliesDetected: number
  resolvedIssues: number
  accuracyRate: number
  lastScanTime: string
  systemHealth: number
}

interface AnomalyAlert {
  id: string
  type: 'stock_mismatch' | 'price_anomaly' | 'sales_pattern' | 'inventory_discrepancy'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  product?: Product
  expectedValue?: number
  actualValue?: number
  confidence: number
  timestamp: string
  resolved: boolean
}

interface SystemMetric {
  name: string
  value: number
  status: 'healthy' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
}

export const MonitorPage: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats>({
    totalScans: 0,
    anomaliesDetected: 0,
    resolvedIssues: 0,
    accuracyRate: 0,
    lastScanTime: new Date().toISOString(),
    systemHealth: 0
  })
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<string[]>([])
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([])
  const [autoScanEnabled, setAutoScanEnabled] = useState(true)

  useEffect(() => {
    loadMonitoringData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000)
    
    // Auto-scan every 5 minutes if enabled
    const scanInterval = setInterval(() => {
      if (autoScanEnabled && !isScanning) {
        runAIScan(true) // Silent scan
      }
    }, 300000)
    
    return () => {
      clearInterval(interval)
      clearInterval(scanInterval)
    }
  }, [autoScanEnabled, isScanning])

  const loadMonitoringData = async () => {
    try {
      const [errorLogs, products, transactions] = await Promise.all([
        dbService.getErrorLogs(),
        dbService.getProducts(),
        dbService.getRecentTransactions(100)
      ])

      // Convert error logs to anomaly alerts
      const anomalyAlerts: AnomalyAlert[] = errorLogs.map(error => ({
        id: error.id,
        type: error.error_type as any,
        severity: error.severity as any,
        title: getAlertTitle(error.error_type),
        description: error.description,
        product: error.product,
        expectedValue: error.expected_value || undefined,
        actualValue: error.actual_value || undefined,
        confidence: calculateConfidence(error),
        timestamp: error.created_at,
        resolved: error.resolved
      }))

      setAlerts(anomalyAlerts)

      // Calculate monitoring stats
      const totalScans = Math.floor(Math.random() * 1000) + 500 // Simulated
      const anomaliesDetected = errorLogs.length
      const resolvedIssues = errorLogs.filter(e => e.resolved).length
      const accuracyRate = anomaliesDetected > 0 ? (resolvedIssues / anomaliesDetected) * 100 : 95
      const systemHealth = calculateSystemHealth(errorLogs, products, transactions)

      setStats({
        totalScans,
        anomaliesDetected,
        resolvedIssues,
        accuracyRate,
        lastScanTime: new Date().toISOString(),
        systemHealth
      })

      // Generate AI insights
      const aiInsights = await aiMonitoringService.generateInsights(products, transactions, errorLogs)
      setInsights(aiInsights)

      // Calculate system metrics
      const metrics = calculateSystemMetrics(products, transactions, errorLogs)
      setSystemMetrics(metrics)

    } catch (error) {
      console.error('Failed to load monitoring data:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAIScan = async (silent = false) => {
    setIsScanning(true)
    try {
      const results = await aiMonitoringService.runComprehensiveScan()
      
      // Refresh data after scan
      await loadMonitoringData()
      
      // Show scan results if not silent
      if (!silent) {
        alert(`AI Scan Complete!\n\nNew anomalies detected: ${results.newAnomalies}\nIssues resolved: ${results.resolvedIssues}\nAccuracy: ${results.accuracy}%`)
      }
      
    } catch (error) {
      console.error('AI scan failed:', error)
      if (!silent) {
        alert('AI scan failed. Please try again.')
      }
    } finally {
      setIsScanning(false)
    }
  }

  const calculateSystemHealth = (errors: ErrorLog[], products: Product[], transactions: Transaction[]): number => {
    const unresolvedCritical = errors.filter(e => !e.resolved && e.severity === 'critical').length
    const unresolvedHigh = errors.filter(e => !e.resolved && e.severity === 'high').length
    const lowStockProducts = products.filter(p => p.current_stock < 50).length
    
    let health = 100
    health -= unresolvedCritical * 15
    health -= unresolvedHigh * 10
    health -= Math.min(lowStockProducts * 2, 20)
    
    return Math.max(health, 0)
  }

  const calculateSystemMetrics = (products: Product[], transactions: Transaction[], errors: ErrorLog[]): SystemMetric[] => {
    const lowStockCount = products.filter(p => p.current_stock < 50).length
    const recentTransactions = transactions.filter(t => 
      new Date(t.transaction_time) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length
    const unresolvedErrors = errors.filter(e => !e.resolved).length
    const averageOrderValue = transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + t.total_amount, 0) / transactions.length 
      : 0

    return [
      {
        name: 'Inventory Health',
        value: Math.max(100 - (lowStockCount * 2), 0),
        status: lowStockCount > 20 ? 'critical' : lowStockCount > 10 ? 'warning' : 'healthy',
        trend: 'stable'
      },
      {
        name: 'Sales Performance',
        value: Math.min(recentTransactions * 5, 100),
        status: recentTransactions > 15 ? 'healthy' : recentTransactions > 5 ? 'warning' : 'critical',
        trend: 'up'
      },
      {
        name: 'System Stability',
        value: Math.max(100 - (unresolvedErrors * 10), 0),
        status: unresolvedErrors === 0 ? 'healthy' : unresolvedErrors < 3 ? 'warning' : 'critical',
        trend: 'stable'
      },
      {
        name: 'Revenue Quality',
        value: Math.min(averageOrderValue / 10, 100),
        status: averageOrderValue > 50 ? 'healthy' : averageOrderValue > 20 ? 'warning' : 'critical',
        trend: 'up'
      }
    ]
  }

  const getAlertTitle = (type: string): string => {
    switch (type) {
      case 'stock_mismatch': return 'Stock Discrepancy Detected'
      case 'price_anomaly': return 'Price Anomaly Alert'
      case 'sales_pattern': return 'Unusual Sales Pattern'
      case 'inventory_discrepancy': return 'Inventory Mismatch'
      default: return 'System Alert'
    }
  }

  const calculateConfidence = (error: ErrorLog): number => {
    if (!error.discrepancy_amount) return 85
    const discrepancy = Math.abs(error.discrepancy_amount)
    if (discrepancy > 1000) return 95
    if (discrepancy > 500) return 90
    if (discrepancy > 100) return 85
    return 80
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return XCircle
      case 'high': return AlertTriangle
      case 'medium': return Clock
      case 'low': return CheckCircle
      default: return Activity
    }
  }

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return TrendingUp
      case 'down': return TrendingDown
      default: return Activity
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

  return (
    <div className="p-6 space-y-6">
      {/* Header - Fix alignment */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="h-8 w-8 text-quickcart-600 mr-3" />
            AI Monitoring System
          </h1>
          <p className="text-gray-600 mt-1">Intelligent anomaly detection and business insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoScan"
              checked={autoScanEnabled}
              onChange={(e) => setAutoScanEnabled(e.target.checked)}
              className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
            />
            <label htmlFor="autoScan" className="text-sm text-gray-700 whitespace-nowrap">
              Auto-scan
            </label>
          </div>
          <Button
            onClick={() => runAIScan()}
            disabled={isScanning}
            className="flex items-center whitespace-nowrap"
          >
            {isScanning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run AI Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* System Health Overview - Fix internal alignment */}
      <Card className="border-l-4 border-l-quickcart-600">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-quickcart-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                <p className="text-sm text-gray-600">Overall system performance and stability</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-3xl font-bold text-quickcart-600">{stats.systemHealth}%</div>
              <div className={`text-sm font-medium ${
                stats.systemHealth > 80 ? 'text-green-600' : 
                stats.systemHealth > 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stats.systemHealth > 80 ? 'Excellent' : 
                 stats.systemHealth > 60 ? 'Good' : 'Needs Attention'}
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                stats.systemHealth > 80 ? 'bg-green-500' : 
                stats.systemHealth > 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.systemHealth}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Stats - Fix card content alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">Total Scans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalScans.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">AI monitoring cycles</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600 flex-shrink-0 ml-4" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">Anomalies Detected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.anomaliesDetected}</p>
                <p className="text-xs text-gray-500 mt-1">Issues identified</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600 flex-shrink-0 ml-4" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">Resolved Issues</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolvedIssues}</p>
                <p className="text-xs text-gray-500 mt-1">Successfully fixed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0 ml-4" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">Accuracy Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.accuracyRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">AI precision</p>
              </div>
              <Target className="h-8 w-8 text-purple-600 flex-shrink-0 ml-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics - Fix metric card alignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {systemMetrics.map((metric, index) => {
              const TrendIcon = getTrendIcon(metric.trend)
              return (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 text-sm leading-tight">{metric.name}</h4>
                    <TrendIcon className={`h-4 w-4 flex-shrink-0 ${
                      metric.trend === 'up' ? 'text-green-600' : 
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex items-end justify-between mb-3">
                    <span className="text-2xl font-bold text-gray-900">{metric.value.toFixed(0)}%</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getMetricStatusColor(metric.status)}`}>
                      {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        metric.status === 'healthy' ? 'bg-green-500' : 
                        metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI-Generated Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.length > 0 ? (
              insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-quickcart-50 rounded-lg border border-quickcart-200">
                  <Zap className="h-5 w-5 text-quickcart-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700 leading-relaxed">{insight}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No insights available. Run an AI scan to generate intelligent recommendations.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Alerts - Fix alert card alignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Recent Anomaly Alerts
            </span>
            <span className="text-sm font-normal text-gray-600">
              Last scan: {formatDateTime(stats.lastScanTime)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.slice(0, 5).map(alert => {
              const SeverityIcon = getSeverityIcon(alert.severity)
              return (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <SeverityIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        alert.severity === 'critical' ? 'text-red-600' : 
                        alert.severity === 'high' ? 'text-orange-600' : 
                        alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">{alert.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getSeverityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {alert.confidence}% confidence
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                        
                        {alert.product && (
                          <p className="text-sm text-gray-500 mb-2">
                            Product: <span className="font-medium">{alert.product.name}</span> (SKU: {alert.product.sku})
                          </p>
                        )}
                        
                        {alert.expectedValue && alert.actualValue && (
                          <div className="flex flex-wrap items-center gap-4 mb-2 text-sm">
                            <span className="text-gray-600 whitespace-nowrap">
                              Expected: <span className="font-medium">{formatCurrency(alert.expectedValue)}</span>
                            </span>
                            <span className="text-gray-600 whitespace-nowrap">
                              Actual: <span className="font-medium">{formatCurrency(alert.actualValue)}</span>
                            </span>
                            <span className="text-red-600 whitespace-nowrap">
                              Difference: <span className="font-medium">{formatCurrency(Math.abs(alert.expectedValue - alert.actualValue))}</span>
                            </span>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-400">
                          Detected: {formatDateTime(alert.timestamp)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {alert.resolved ? (
                        <span className="flex items-center text-green-600 text-sm whitespace-nowrap">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolved
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" className="whitespace-nowrap">
                          Investigate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {alerts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                <p>No anomalies detected. Your system is running smoothly!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}