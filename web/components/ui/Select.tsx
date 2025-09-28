"use client";

import React, { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, AlertCircle, Loader2 } from "lucide-react";

const selectVariants = cva(
  "flex w-full rounded-2xl border backdrop-blur-sm transition-all duration-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-dark-surface/50 border-dark-border text-white hover:border-brand-primary/50",
        filled: "bg-dark-card border-dark-border text-white",
        ghost: "bg-transparent border-transparent text-white hover:bg-dark-surface/20",
        error: "bg-dark-surface/50 border-red-500 text-white",
        success: "bg-dark-surface/50 border-green-500 text-white",
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

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends VariantProps<typeof selectVariants> {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  success?: string;
  hint?: string;
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ 
    className, 
    variant, 
    size, 
    label, 
    placeholder = "Select an option...",
    options,
    value,
    onChange,
    error, 
    success, 
    hint, 
    loading, 
    disabled,
    required,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || "");
    
    const finalVariant = error ? "error" : success ? "success" : variant;
    const selectedOption = options.find(option => option.value === selectedValue);
    
    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      onChange?.(optionValue);
      setIsOpen(false);
    };

    return (
      <div className="space-y-2" ref={ref} {...props}>
        {/* Label */}
        {label && (
          <motion.label 
            className="text-sm font-medium text-white flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
            {required && <span className="text-red-400">*</span>}
          </motion.label>
        )}
        
        {/* Select Container */}
        <div className="relative">
          {/* Select Button */}
          <motion.button
            type="button"
            className={cn(
              selectVariants({ variant: finalVariant, size }),
              "justify-between items-center",
              (loading || error || success) && "pr-12",
              className
            )}
            onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
            disabled={disabled || loading}
            whileTap={{ scale: 0.995 }}
            style={{
              color: '#ffffff',
              WebkitTextFillColor: '#ffffff',
            }}
          >
            <span className={selectedOption ? "text-white" : "text-text-tertiary"}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            </motion.div>
          </motion.button>
          
          {/* Status Icons */}
          <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center space-x-2">
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
          </div>
          
          {/* Dropdown */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="absolute top-full left-0 right-0 mt-2 bg-dark-card/95 backdrop-blur-xl border border-dark-border rounded-2xl shadow-xl z-50 max-h-60 overflow-auto custom-scrollbar"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {options.map((option, index) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between",
                      "hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed",
                      selectedValue === option.value && "bg-brand-primary/10 text-brand-primary",
                      index === 0 && "rounded-t-2xl",
                      index === options.length - 1 && "rounded-b-2xl"
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    whileHover={{ x: 4 }}
                  >
                    <span className="text-white">{option.label}</span>
                    {selectedValue === option.value && (
                      <Check className="w-4 h-4 text-brand-primary" />
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
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
        
        {/* Click outside to close */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;