import React, { useState } from 'react'
import { X, Plus, Minus, CreditCard } from 'lucide-react'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../utils/format'
import { supabase } from '../../lib/supabase'
import { detectLocation, getCurrentUTCTime } from '../../utils/location'
import type { Product } from '../../lib/supabase'

interface CartItem {
  product: Product
  quantity: number
}

interface EcommerceCartProps {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  totalPrice: number
}

export const EcommerceCart: React.FC<EcommerceCartProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  totalPrice
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)

  // ... inside the EcommerceCart component

  const processCheckout = async () => {
    setIsProcessing(true);
    // Call the 'ai-chat' function and specify the task
    const { error } = await supabase.functions.invoke('ai-chat', {
      body: {
        cart, // Send the cart data
        task: 'process_checkout' // This tells the backend to run the checkout logic
      },
    });

    if (error) {
      console.error("Checkout failed:", error);
      alert(`Checkout failed: ${error.message}`); // Show error to user
    } else {
      console.log("Checkout successful!");
      setOrderComplete(true);
      // Optional: clear the cart after a delay
      setTimeout(() => {
        window.location.reload(); // Reload to reflect changes
      }, 3000);
    }
    setIsProcessing(false);
  };

  // ...

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Shopping Cart</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {orderComplete ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Complete!</h3>
                <p className="text-gray-600">Thank you for your purchase. This page will now reload.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Your cart is empty</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={item.product.image_url || `https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=100`}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{item.product.name}</h4>
                          <p className="text-sm text-gray-600">{formatCurrency(item.product.selling_price)}</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <span className="w-8 text-center font-medium">{item.quantity}</span>

                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            disabled={item.quantity >= item.product.current_stock}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>

                  <Button
                    onClick={processCheckout}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </div>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Checkout
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}