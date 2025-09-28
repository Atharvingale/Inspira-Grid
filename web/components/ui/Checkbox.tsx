"use client";

import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

const checkboxVariants = cva(
  "relative inline-flex items-center justify-center rounded-lg border-2 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "w-4 h-4",
        default: "w-5 h-5",
        lg: "w-6 h-6",
      },
      variant: {
        default: "border-gray-400 hover:border-brand-primary data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary",
        error: "border-red-500 hover:border-red-400 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500",
        success: "border-green-500 hover:border-green-400 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof checkboxVariants> {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, size, variant, label, description, error, indeterminate, ...props }, ref) => {
    const finalVariant = error ? "error" : variant;
    
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              ref={ref}
              className="sr-only peer"
              {...props}
            />
            <motion.div
              className={cn(
                checkboxVariants({ size, variant: finalVariant }),
                props.checked && "bg-brand-primary border-brand-primary",
                indeterminate && "bg-brand-primary border-brand-primary",
                error && "border-red-500",
                className
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-state={props.checked ? "checked" : "unchecked"}
            >
              {/* Check Icon */}
              {props.checked && !indeterminate && (
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ type: "spring", bounce: 0.5, duration: 0.3 }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
              
              {/* Indeterminate Icon */}
              {indeterminate && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", bounce: 0.5, duration: 0.3 }}
                >
                  <Minus className="w-3 h-3 text-white" />
                </motion.div>
              )}
              
              {/* Focus ring */}
              <div className="absolute inset-0 rounded-lg ring-4 ring-brand-primary/20 opacity-0 peer-focus-visible:opacity-100 transition-opacity" />
            </motion.div>
          </div>
          
          {(label || description) && (
            <div className="space-y-1">
              {label && (
                <motion.label
                  className="text-sm font-medium text-white cursor-pointer select-none"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
                    if (input) input.click();
                  }}
                >
                  {label}
                  {props.required && <span className="text-red-400 ml-1">*</span>}
                </motion.label>
              )}
              
              {description && (
                <p className="text-sm text-text-tertiary">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <motion.p
            className="text-sm text-red-400 ml-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;