import React from 'react'
import { cn } from '../../utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quickcart-500 disabled:pointer-events-none disabled:opacity-50'
  
  const variants = {
    primary: 'bg-quickcart-600 text-white hover:bg-quickcart-700',
    secondary: 'bg-quickcart-100 text-quickcart-900 hover:bg-quickcart-200',
    outline: 'border border-quickcart-300 bg-transparent hover:bg-quickcart-50',
    ghost: 'hover:bg-quickcart-100 hover:text-quickcart-900',
    destructive: 'bg-red-600 text-white hover:bg-red-700'
  }
  
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8'
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}