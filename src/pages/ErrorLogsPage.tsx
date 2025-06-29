import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
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
  Download
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

  const exportLogs = async () => {
    // Implement export functionality here
    alert('Export logs feature is not yet implemented.')
  }

  const filteredErrors = errorLogs.filter(error => {
    const matchesSearch = error.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    switch (severity) {
      case 'critical': return XCircle
      case 'high': return AlertTriangle
      case 'medium': return Clock
      case 'low': return CheckCircle
      default: return AlertTriangle
    }
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-quickcart-600 mr-2 sm:mr-3" />
            Error Logs
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor system errors and issues</p>
        </div>
        <Button onClick={exportLogs} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search errors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
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
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
            >
              <option value="">All Status</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
            </select>
            
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              {filteredErrors.length} errors found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <div className="space-y-4">
        {filteredErrors.map(error => {
          const SeverityIcon = getSeverityIcon(error.severity)
          return (
            <Card key={error.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <SeverityIcon className={`h-6 w-6 mt-1 ${
                      error.severity === 'critical' ? 'text-red-600' :
                      error.severity === 'high' ? 'text-orange-600' :
                      error.severity === 'medium' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {getErrorTypeLabel(error.error_type)}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(error.severity)}`}>
                          {error.severity.toUpperCase()}
                        </span>
                        {error.resolved ? (
                          <span className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolved
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 text-sm">
                            <XCircle className="h-4 w-4 mr-1" />
                            Unresolved
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-3">{error.description}</p>
                      
                      {error.product && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Product:</span> {error.product.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">SKU:</span> {error.product.sku}
                          </p>
                        </div>
                      )}
                      
                      {error.expected_value && error.actual_value && (
                        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-gray-600">Expected:</span>
                            <p className="font-medium">{formatCurrency(error.expected_value)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Actual:</span>
                            <p className="font-medium">{formatCurrency(error.actual_value)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Discrepancy:</span>
                            <p className="font-medium text-red-600">
                              {formatCurrency(Math.abs(error.expected_value - error.actual_value))}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Detected: {formatDateTime(error.created_at)}</span>
                        {error.resolved && error.resolved_at && (
                          <span>Resolved: {formatDateTime(error.resolved_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedError(error)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    {!error.resolved && (
                      <Button
                        size="sm"
                        onClick={() => resolveError(error.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        
        {filteredErrors.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Errors Found</h3>
              <p className="text-gray-600">
                {searchTerm || severityFilter || statusFilter
                  ? 'No errors match your current filters.'
                  : 'Great! No system errors detected.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSelectedError(null)} />
            
            <Card className="relative w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Error Details</span>
                  <button
                    onClick={() => setSelectedError(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Error Type</label>
                  <p className="text-gray-900">{getErrorTypeLabel(selectedError.error_type)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900">{selectedError.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(selectedError.severity)}`}>
                      {selectedError.severity.toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`flex items-center ${selectedError.resolved ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedError.resolved ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolved
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Unresolved
                        </>
                      )}
                    </span>
                  </div>
                </div>
                
                {selectedError.product && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Related Product</label>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="font-medium">{selectedError.product.name}</p>
                      <p className="text-sm text-gray-600">SKU: {selectedError.product.sku}</p>
                      <p className="text-sm text-gray-600">Current Stock: {selectedError.product.current_stock}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900">{formatDateTime(selectedError.created_at)}</p>
                  </div>
                  
                  {selectedError.resolved_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Resolved</label>
                      <p className="text-gray-900">{formatDateTime(selectedError.resolved_at)}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedError(null)}>
                    Close
                  </Button>
                  {!selectedError.resolved && (
                    <Button
                      onClick={() => resolveError(selectedError.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark as Resolved
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}