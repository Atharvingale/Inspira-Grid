"use client";

import React from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:shadow-xl hover:shadow-brand-primary/30 hover:-translate-y-0.5 active:translate-y-0",
        secondary: "bg-white/5 text-text-primary border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm",
        outline: "border-2 border-brand-primary/50 text-brand-primary hover:bg-brand-primary hover:text-white hover:border-brand-primary backdrop-blur-sm",
        ghost: "text-text-tertiary hover:bg-white/5 hover:text-text-primary",
        success: "bg-gradient-to-r from-success-500 to-success-600 text-white hover:shadow-xl hover:shadow-success-500/30 hover:-translate-y-0.5",
        warning: "bg-gradient-to-r from-warning-500 to-warning-600 text-white hover:shadow-xl hover:shadow-warning-500/30 hover:-translate-y-0.5",
        danger: "bg-gradient-to-r from-danger-500 to-danger-600 text-white hover:shadow-xl hover:shadow-danger-500/30 hover:-translate-y-0.5",
        glass: "bg-white/5 text-text-primary border border-white/20 backdrop-blur-md hover:bg-white/10",
      },
      size: {
        xs: "h-7 px-3 text-xs",
        sm: "h-9 px-4 text-sm",
        default: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 
    'onDrag' | 'onDragEnd' | 'onDragStart' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop' |
    'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
  >,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {loading && (
          <motion.div
            className="mr-2"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </motion.div>
        )}
        
        {leftIcon && !loading && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
        
        {/* Shine effect */}
        {variant === "primary" && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
            whileHover={{
              translateX: "200%",
              transition: { duration: 0.6, ease: "easeInOut" }
            }}
          />
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export default Button;