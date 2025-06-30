import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Bell,
  Users, 
  AlertTriangle, 
  BarChart3, 
  MessageSquare,
  Building2,
  Tags,
  Activity,
  Shield,
  Settings,
  Menu,
  X
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from '../ui/Button'
import { ExternalLink } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Transactions', href: '/transactions', icon: ShoppingCart },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Categories', href: '/categories', icon: Tags },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Admins', href: '/admins', icon: Users },
  { name: 'Error Logs', href: '/errors', icon: AlertTriangle },
  { name: 'Access Logs', href: '/access-logs', icon: Shield },
  { name: 'AI Monitor', href: '/monitor', icon: Activity },
  { name: 'Chat (Stella)', href: '/chat', icon: MessageSquare },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export const Sidebar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button - Fix z-index issue */}
      <button
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 rounded-md bg-white shadow-md border border-gray-200"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Adjust z-index */}
      <div className={`
        flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm
        fixed lg:static inset-y-0 left-0 z-50
        transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
      `}>
        {/* Add padding-top for mobile to avoid hamburger overlap */}
        <div className="pt-16 lg:pt-0">
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <ShoppingCart className="h-8 w-8 text-quickcart-600" />
                <BarChart3 className="h-4 w-4 text-quickcart-500 absolute -top-1 -right-1" />
              </div>
              <span className="text-xl font-bold text-quickcart-700">QuickCart</span>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)} // Close mobile menu on navigation
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-quickcart-100 text-quickcart-700 border-r-2 border-quickcart-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
          
          {/* Add Visit Store button for mobile view */}
          <div className="px-4 py-2 border-t border-gray-200 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/store', '_blank')}
              className="w-full justify-start"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Store
            </Button>
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              QuickCart Dashboard v2.0
            </div>
          </div>
        </div>
      </div>
    </>
  )
}