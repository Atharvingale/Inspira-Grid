"use client";

import React, { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, AlertCircle, Loader2 } from "lucide-react";

const inputVariants = cva(
  "flex w-full rounded-2xl border backdrop-blur-sm transition-all duration-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-dark-surface/50 border-dark-border text-white placeholder:text-text-tertiary focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/20 hover:border-brand-primary/50",
        filled: "bg-dark-card border-dark-border text-white placeholder:text-text-tertiary focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/20",
        ghost: "bg-transparent border-transparent text-white placeholder:text-text-tertiary focus:bg-dark-surface/30 focus:border-brand-primary hover:bg-dark-surface/20",
        error: "bg-dark-surface/50 border-red-500 text-white placeholder:text-text-tertiary focus:border-red-500 focus:ring-4 focus:ring-red-500/20",
        success: "bg-dark-surface/50 border-green-500 text-white placeholder:text-text-tertiary focus:border-green-500 focus:ring-4 focus:ring-green-500/20",
      },
      size: {
        sm: "h-10 px-3 text-sm",
        default: "h-12 px-4 text-base",
        lg: "h-14 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 
    "size" | 'onDrag' | 'onDragEnd' | 'onDragStart' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop' |
    'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
  >,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    type = "text", 
    label, 
    error, 
    success, 
    hint, 
    leftIcon, 
    rightIcon, 
    loading, 
    showPasswordToggle, 
    ...props 
  }, ref) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
    
    const finalVariant = error ? "error" : success ? "success" : variant;
    const inputType = type === "password" && showPassword ? "text" : type;
    
    const handleFocus = () => {
      setFocused(true);
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      setHasValue(e.target.value.length > 0);
      props.onBlur?.(e);
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <motion.label 
            className="text-sm font-medium text-white flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
            {props.required && <span className="text-red-400">*</span>}
          </motion.label>
        )}
        
        {/* Input Container */}
        <div className="relative group">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-brand-primary transition-colors z-10">
              {leftIcon}
            </div>
          )}
          
          {/* Input Field */}
          <motion.input
            ref={ref}
            type={inputType}
            data-input="true"
            className={cn(
              inputVariants({ variant: finalVariant, size }),
              leftIcon && "pl-10",
              (rightIcon || loading || error || success || (type === "password" && showPasswordToggle)) && "pr-12",
              "!text-white",
              className
            )}
            style={{
              color: '#ffffff',
              caretColor: '#ffffff',
              WebkitTextFillColor: '#ffffff',
              colorScheme: 'dark',
            } as React.CSSProperties}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            disabled={loading || props.disabled}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.1 }}
            {...props}
          />
          
          {/* Right Side Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            {loading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-4 h-4 text-brand-primary" />
              </motion.div>
            )}
            
            {!loading && error && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <AlertCircle className="w-4 h-4 text-red-400" />
              </motion.div>
            )}
            
            {!loading && !error && success && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <Check className="w-4 h-4 text-green-400" />
              </motion.div>
            )}
            
            {!loading && !error && !success && type === "password" && showPasswordToggle && (
              <motion.button
                type="button"
                className="text-text-tertiary hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </motion.button>
            )}
            
            {!loading && !error && !success && rightIcon && type !== "password" && (
              <div className="text-text-tertiary group-focus-within:text-brand-primary transition-colors">
                {rightIcon}
              </div>
            )}
          </div>
        </div>
        
        {/* Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              key="error"
              className="flex items-center gap-2 text-sm text-red-400"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
          
          {!error && success && (
            <motion.div 
              key="success"
              className="flex items-center gap-2 text-sm text-green-400"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Check className="w-4 h-4 flex-shrink-0" />
              {success}
            </motion.div>
          )}
          
          {!error && !success && hint && (
            <motion.p 
              key="hint"
              className="text-sm text-text-tertiary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
