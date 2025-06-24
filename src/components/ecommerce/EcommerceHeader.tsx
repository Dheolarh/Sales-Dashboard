import React from 'react'
import { ShoppingCart, User } from 'lucide-react'

interface EcommerceHeaderProps {
  cartItemCount: number
  onCartClick: () => void
}

export const EcommerceHeader: React.FC<EcommerceHeaderProps> = ({
  cartItemCount,
  onCartClick
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <ShoppingCart className="h-8 w-8 text-quickcart-600" />
            </div>
            <div>
              <span className="text-2xl font-bold text-quickcart-700">QuickCart</span>
              <div className="text-xs text-gray-500">Online Store</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#" className="text-gray-700 hover:text-quickcart-600 font-medium">Home</a>
            <a href="#" className="text-gray-700 hover:text-quickcart-600 font-medium">Categories</a>
            <a href="#" className="text-gray-700 hover:text-quickcart-600 font-medium">Brands</a>
            <a href="#" className="text-gray-700 hover:text-quickcart-600 font-medium">Deals</a>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              <User className="h-5 w-5" />
            </button>
            
            <button
              onClick={onCartClick}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-quickcart-600 text-white text-xs rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}