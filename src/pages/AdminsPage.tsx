import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Mail,
  User,
  X,
  Save,
  UserCheck,
  UserX,
  Crown,
  Settings
} from 'lucide-react'
import { dbService, supabase } from '../lib/supabase'
import { formatDateTime } from '../utils/format'
import { useAuthContext } from '../hooks/AuthContext'
import type { Admin } from '../lib/supabase'

interface AdminFormData {
  email: string
  username: string
  full_name: string
  role: string
  location: string
  is_active: boolean
}

export const AdminsPage: React.FC = () => {
  const { admin: currentAdmin } = useAuthContext()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [formData, setFormData] = useState<AdminFormData>({
    email: '',
    username: '',
    full_name: '',
    role: 'admin',
    location: '',
    is_active: true
  })

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      const data = await dbService.getAdmins()
      setAdmins(data)
    } catch (error) {
      console.error('Failed to load admins:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = !roleFilter || admin.role === roleFilter
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'active' && admin.is_active) ||
                         (statusFilter === 'inactive' && !admin.is_active)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Update handleSubmit function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Prepare admin data for Supabase
      const adminData = {
        email: formData.email,
        username: formData.username,
        full_name: formData.full_name,
        role: formData.role,
        location: formData.location,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      }

      if (editingAdmin) {
        await supabase
          .from('admins')
          .update(adminData)
          .eq('id', editingAdmin.id)
      } else {
        await supabase
          .from('admins')
          .insert({
            ...adminData,
            created_at: new Date().toISOString(),
          })
      }
      
      await loadAdmins()
      resetForm()
    } catch (error) {
      console.error('Failed to save admin:', error)
      alert('Failed to save admin. Please try again.')
    }
  }

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin)
    setFormData({
      email: admin.email,
      username: admin.username,
      full_name: admin.full_name,
      role: admin.role,
      location: admin.location,
      is_active: admin.is_active
    })
    setShowAddModal(true)
  }

  const handleDelete = async (adminId: string) => {
    if (adminId === currentAdmin?.id) {
      alert('You cannot delete your own account.')
      return
    }

    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) return
    
    try {
      await supabase
        .from('admins')
        .delete()
        .eq('id', adminId)
      
      await loadAdmins()
    } catch (error) {
      console.error('Failed to delete admin:', error)
      alert('Failed to delete admin. Please try again.')
    }
  }

  const toggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    if (adminId === currentAdmin?.id) {
      alert('You cannot deactivate your own account.')
      return
    }

    try {
      await supabase
        .from('admins')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminId)
      
      await loadAdmins()
    } catch (error) {
      console.error('Failed to update admin status:', error)
      alert('Failed to update admin status. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      full_name: '',
      role: 'admin',
      location: '',
      is_active: true
    })
    setEditingAdmin(null)
    setShowAddModal(false)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'text-purple-600 bg-purple-100 border-purple-200'
      case 'admin': return 'text-blue-600 bg-blue-100 border-blue-200'
      case 'manager': return 'text-green-600 bg-green-100 border-green-200'
      case 'viewer': return 'text-gray-600 bg-gray-100 border-gray-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return Crown
      case 'admin': return Shield
      case 'manager': return Settings
      case 'viewer': return Eye
      default: return User
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'text-green-600 bg-green-100' 
      : 'text-red-600 bg-red-100'
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
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-quickcart-600 mr-2 sm:mr-3" />
            Admin Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage admin users and permissions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Admins</p>
                <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {admins.filter(a => a.is_active).length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Super Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {admins.filter(a => a.role === 'super_admin').length}
                </p>
              </div>
              <Crown className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Logins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {admins.filter(a => a.last_login && 
                    new Date(a.last_login) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
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
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="viewer">Viewer</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              {filteredAdmins.length} admins found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAdmins.map(admin => {
          const RoleIcon = getRoleIcon(admin.role)
          const isCurrentUser = admin.id === currentAdmin?.id
          
          return (
            <Card key={admin.id} className={`hover:shadow-lg transition-shadow ${
              isCurrentUser ? 'ring-2 ring-quickcart-500 bg-quickcart-50' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      admin.is_active ? 'bg-quickcart-100' : 'bg-gray-100'
                    }`}>
                      <RoleIcon className={`h-6 w-6 ${
                        admin.is_active ? 'text-quickcart-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center">
                        {admin.full_name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-quickcart-600 text-white px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">@{admin.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAdmin(admin)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(admin)}
                      disabled={!isCurrentUser && currentAdmin?.role !== 'super_admin'}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!isCurrentUser && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(admin.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={currentAdmin?.role !== 'super_admin'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {admin.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {admin.location || 'Location not set'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(admin.role)}`}>
                      {admin.role.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(admin.is_active)}`}>
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  {!isCurrentUser && currentAdmin?.role === 'super_admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                      className={admin.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {admin.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 mt-4 pt-3 border-t">
                  {admin.last_login ? (
                    <>Last login: {formatDateTime(admin.last_login)}</>
                  ) : (
                    'Never logged in'
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredAdmins.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Admins Found</h3>
            <p className="text-gray-600">
              {searchTerm || roleFilter || statusFilter
                ? 'No admins match your current filters.'
                : 'No administrators have been added yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={resetForm} />
            
            <Card className="relative w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</span>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      required
                    />
                    <Input
                      label="Username"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      required
                    />
                  </div>
                  
                  <Input
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quickcart-500"
                        required
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="viewer">Viewer</option>
                        {currentAdmin?.role === 'super_admin' && (
                          <option value="super_admin">Super Admin</option>
                        )}
                      </select>
                    </div>
                    
                    <Input
                      label="Location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="City, Country"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded border-gray-300 text-quickcart-600 focus:ring-quickcart-500"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                      Admin is active
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-1" />
                      {editingAdmin ? 'Update Admin' : 'Create Admin'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Admin Detail Modal */}
      {selectedAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSelectedAdmin(null)} />
            
            <Card className="relative w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Admin Details</span>
                  <button
                    onClick={() => setSelectedAdmin(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 bg-quickcart-100 rounded-lg">
                    {React.createElement(getRoleIcon(selectedAdmin.role), {
                      className: "h-8 w-8 text-quickcart-600"
                    })}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedAdmin.full_name}</h3>
                    <p className="text-gray-600">@{selectedAdmin.username}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{selectedAdmin.email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(selectedAdmin.role)}`}>
                      {selectedAdmin.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-gray-900">{selectedAdmin.location || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedAdmin.is_active)}`}>
                      {selectedAdmin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900">{formatDateTime(selectedAdmin.created_at)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
                    <p className="text-gray-900">
                      {selectedAdmin.last_login ? formatDateTime(selectedAdmin.last_login) : 'Never'}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedAdmin(null)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setSelectedAdmin(null)
                    handleEdit(selectedAdmin)
                  }}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Admin
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