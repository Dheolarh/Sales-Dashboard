import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  AlertTriangle,
  TrendingUp,
  Eye,
  X
} from 'lucide-react'
import { dbService } from '../lib/supabase'
import { formatDateTime } from '../utils/format'
import type { AccessLog } from '../lib/supabase'

export const AccessLogsPage: React.FC = () => {
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null)
  const [stats, setStats] = useState({
    totalAttempts: 0,
    successfulLogins: 0,
    failedAttempts: 0,
    uniqueUsers: 0,
    todaysLogins: 0
  })

  useEffect(() => {
    loadAccessLogs()
  }, [])

  const loadAccessLogs = async () => {
    try {
      const data = await dbService.getAccessLogs()
      setAccessLogs(data)
      
      // Calculate stats
      const successfulLogins = data.filter(log => log.success).length
      const failedAttempts = data.filter(log => !log.success).length
      const uniqueUsers = new Set(data.map(log => log.email)).size
      const today = new Date().toDateString()
      const todaysLogins = data.filter(log => 
        new Date(log.login_time).toDateString() === today && log.success
      ).length

      setStats({
        totalAttempts: data.length,
        successfulLogins,
        failedAttempts,
        uniqueUsers,
        todaysLogins
      })
    } catch (error) {
      console.error('Failed to load access logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = accessLogs.filter(log => {
    const matchesSearch = log.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.admin?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'success' && log.success) ||
                         (statusFilter === 'failed' && !log.success)
    
    const matchesDate = !dateFilter || 
                       new Date(log.login_time).toDateString() === new Date(dateFilter).toDateString()
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const exportLogs = () => {
    const csvContent = [
      ['Email', 'Admin Name', 'Login Time', 'Location', 'IP Address', 'User Agent', 'Status'],
      ...filteredLogs.map(log => [
        log.email,
        log.admin?.full_name || 'Unknown',
        new Date(log.login_time).toLocaleString(),
        log.location,
        log.ip_address,
        log.user_agent,
        log.success ? 'Success' : 'Failed'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `access_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.toLowerCase().includes('mobile') || userAgent.toLowerCase().includes('android') || userAgent.toLowerCase().includes('iphone')) {
      return Smartphone
    }
    return Monitor
  }

  const getBrowserName = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  const getLocationFlag = (location: string) => {
    // Simple country detection from location string
    if (location.includes('USA') || location.includes('United States')) return '🇺🇸'
    if (location.includes('UK') || location.includes('United Kingdom')) return '🇬🇧'
    if (location.includes('Canada')) return '🇨🇦'
    if (location.includes('Germany')) return '🇩🇪'
    if (location.includes('France')) return '🇫🇷'
    if (location.includes('Japan')) return '🇯🇵'
    if (location.includes('Australia')) return '🇦🇺'
    if (location.includes('India')) return '🇮🇳'
    if (location.includes('Brazil')) return '🇧🇷'
    if (location.includes('Spain')) return '🇪🇸'
    return '🌍'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
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
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-quickcart-600 mr-2 sm:mr-3" />
            Access Logs & Security
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor login attempts and security events</p>
        </div>
        <Button onClick={exportLogs} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Attempts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Successful Logins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successfulLogins}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Attempts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failedAttempts}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueUsers}</p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Logins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todaysLogins}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
            >
              <option value="">All Status</option>
              <option value="success">Successful</option>
              <option value="failed">Failed</option>
            </select>
            
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter by date"
            />
            
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              {filteredLogs.length} logs found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Login Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map(log => {
                  const DeviceIcon = getDeviceIcon(log.user_agent)
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.admin?.full_name || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">{log.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDateTime(log.login_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <span className="mr-2">{getLocationFlag(log.location)}</span>
                          {log.location}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <DeviceIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {getBrowserName(log.user_agent)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          log.success 
                            ? 'text-green-600 bg-green-100' 
                            : 'text-red-600 bg-red-100'
                        }`}>
                          {log.success ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Success
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Access Logs Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter || dateFilter
                  ? 'No access logs match your current filters.'
                  : 'No access logs have been recorded yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Security Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Failed Login Attempts */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <h4 className="font-medium text-red-900">Failed Attempts</h4>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.failedAttempts}</p>
              <p className="text-sm text-red-700">
                {stats.totalAttempts > 0 
                  ? `${((stats.failedAttempts / stats.totalAttempts) * 100).toFixed(1)}% of total attempts`
                  : 'No attempts recorded'
                }
              </p>
            </div>

            {/* Success Rate */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <h4 className="font-medium text-green-900">Success Rate</h4>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {stats.totalAttempts > 0 
                  ? `${((stats.successfulLogins / stats.totalAttempts) * 100).toFixed(1)}%`
                  : '0%'
                }
              </p>
              <p className="text-sm text-green-700">Login success rate</p>
            </div>

            {/* Active Users Today */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-blue-900">Today's Activity</h4>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.todaysLogins}</p>
              <p className="text-sm text-blue-700">Successful logins today</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSelectedLog(null)} />
            
            <Card className="relative w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Access Log Details</span>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className={`p-3 rounded-lg ${
                    selectedLog.success ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {selectedLog.success ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedLog.success ? 'Successful Login' : 'Failed Login Attempt'}
                    </h3>
                    <p className="text-gray-600">{selectedLog.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin User</label>
                    <p className="text-gray-900">{selectedLog.admin?.full_name || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Login Time</label>
                    <p className="text-gray-900">{formatDateTime(selectedLog.login_time)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <div className="flex items-center">
                      <span className="mr-2">{getLocationFlag(selectedLog.location)}</span>
                      <p className="text-gray-900">{selectedLog.location}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <p className="text-gray-900 font-mono">{selectedLog.ip_address}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700 break-all">{selectedLog.user_agent}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Browser & Device</label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{getBrowserName(selectedLog.user_agent)}</span>
                    </div>
                    <div className="flex items-center">
                      {React.createElement(getDeviceIcon(selectedLog.user_agent), {
                        className: "h-4 w-4 text-gray-400 mr-2"
                      })}
                      <span className="text-gray-900">
                        {selectedLog.user_agent.toLowerCase().includes('mobile') ? 'Mobile' : 'Desktop'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedLog(null)}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}