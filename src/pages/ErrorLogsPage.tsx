import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge' // Add this import
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Eye,
  Check,
  X,
  Download,
  AlertCircle
} from 'lucide-react'
import { dbService, supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../utils/format'
import { useAuthContext } from '../hooks/AuthContext'
import type { ErrorLog } from '../lib/supabase'

export const ErrorLogsPage: React.FC = () => {
  const { admin } = useAuthContext()
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)

  // Calculate stats from errorLogs
  const stats = {
    totalErrors: errorLogs.length,
    criticalErrors: errorLogs.filter(log => log.severity === 'critical').length,
    warnings: errorLogs.filter(log => log.severity === 'warning' || log.severity === 'medium').length,
    resolvedErrors: errorLogs.filter(log => log.resolved).length
  }

  useEffect(() => {
    loadErrorLogs()
  }, [])

  const loadErrorLogs = async () => {
    try {
      const data = await dbService.getErrorLogs()
      setErrorLogs(data)
    } catch (error) {
      console.error('Failed to load error logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveError = async (errorId: string) => {
    try {
      await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_by: admin?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', errorId)

      // Refresh the list
      await loadErrorLogs()
      setSelectedError(null)
    } catch (error) {
      console.error('Failed to resolve error:', error)
      alert('Failed to resolve error. Please try again.')
    }
  }

  // Add missing functions
  const handleStatusChange = async (errorId: string, status: string) => {
    if (status === 'resolved') {
      await resolveError(errorId)
    }
  }

  const handleViewDetails = (log: ErrorLog) => {
    setSelectedError(log)
    // You can implement a modal or navigate to details page
    console.log('View details for:', log)
  }

  const exportLogs = async () => {
    // Implement export functionality here
    alert('Export logs feature is not yet implemented.')
  }

  const filteredErrors = errorLogs.filter(error => {
    const matchesSearch = error.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.error_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSeverity = !severityFilter || error.severity === severityFilter
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'resolved' && error.resolved) ||
                         (statusFilter === 'unresolved' && !error.resolved)
    
    return matchesSearch && matchesSeverity && matchesStatus
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    const IconComponent = (() => {
      switch (severity) {
        case 'critical': return XCircle
        case 'high': return AlertTriangle
        case 'medium': return Clock
        case 'low': return CheckCircle
        default: return AlertTriangle
      }
    })()
    return <IconComponent className="h-4 w-4" />
  }

  const getErrorTypeLabel = (type: string) => {
    switch (type) {
      case 'stock_mismatch': return 'Stock Mismatch'
      case 'price_anomaly': return 'Price Anomaly'
      case 'sales_pattern': return 'Sales Pattern'
      case 'inventory_discrepancy': return 'Inventory Discrepancy'
      case 'data_inconsistency': return 'Data Inconsistency'
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
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
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-quickcart-600 mr-2 sm:mr-3" />
            Error Logs
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor system errors and issues</p>
        </div>
        <Button 
          onClick={exportLogs} 
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards - Fix responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Errors</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalErrors}</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Critical</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.criticalErrors}</p>
              </div>
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Warnings</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.warnings}</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.resolvedErrors}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Fix mobile layout */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search errors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-quickcart-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-quickcart-500 text-sm w-full sm:w-auto"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-quickcart-500 text-sm w-full sm:w-auto"
              >
                <option value="">All Status</option>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Count Display */}
      <div className="flex items-center text-sm text-gray-600">
        <Filter className="h-4 w-4 mr-2" />
        {filteredErrors.length} error{filteredErrors.length !== 1 ? 's' : ''} found
      </div>

      {/* Error List - Fix mobile responsive cards */}
      <div className="space-y-4">
        {filteredErrors.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No errors found</h3>
              <p className="text-gray-600">No errors match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredErrors.map(log => (
            <Card key={log.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 p-2 rounded-full border ${getSeverityColor(log.severity)}`}>
                    {getSeverityIcon(log.severity)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {getErrorTypeLabel(log.error_type)}
                        </h3>
                        <Badge 
                          variant={
                            log.severity === 'critical' ? 'error' :
                            log.severity === 'high' ? 'error' :
                            log.severity === 'medium' ? 'warning' :
                            'default'
                          }
                        >
                          {log.severity.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant={log.resolved ? 'primary' : 'outline'}
                          onClick={() => handleStatusChange(log.id, 'resolved')}
                          disabled={log.resolved}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {log.resolved ? 'Resolved' : 'Mark Resolved'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{log.description}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Product:</span>
                        <p className="font-medium">{log.product?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">SKU:</span>
                        <p className="font-medium">{log.product?.sku || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Detected:</span>
                        <p className="font-medium">{formatDateTime(log.created_at)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <p className={`font-medium ${log.resolved ? 'text-green-600' : 'text-red-600'}`}>
                          {log.resolved ? 'Resolved' : 'Unresolved'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Error Details Modal - existing code... */}
    </div>
  )
}