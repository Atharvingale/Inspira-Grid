"use client";

import React, { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, Loader2 } from "lucide-react";

const textareaVariants = cva(
  "flex w-full rounded-2xl border backdrop-blur-sm transition-all duration-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
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
        sm: "min-h-[80px] px-3 py-2 text-sm",
        default: "min-h-[100px] px-4 py-3 text-base",
        lg: "min-h-[120px] px-6 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 
    "size" | 'onDrag' | 'onDragEnd' | 'onDragStart' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop' |
    'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
  >,
    VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  loading?: boolean;
  characterLimit?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    size, 
    label, 
    error, 
    success, 
    hint, 
    loading, 
    characterLimit,
    ...props 
  }, ref) => {
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
    const [currentLength, setCurrentLength] = useState(
      typeof props.value === 'string' ? props.value.length : 0
    );
    
    const finalVariant = error ? "error" : success ? "success" : variant;
    
    const handleFocus = () => {
      setFocused(true);
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setFocused(false);
      setHasValue(e.target.value.length > 0);
      props.onBlur?.(e);
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(e.target.value.length > 0);
      setCurrentLength(e.target.value.length);
      props.onChange?.(e);
    };

    const isOverLimit = characterLimit ? currentLength > characterLimit : false;

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
        
        {/* Textarea Container */}
        <div className="relative group">
          {/* Textarea Field */}
          <motion.textarea
            ref={ref}
            data-textarea="true"
            className={cn(
              textareaVariants({ variant: finalVariant, size }),
              (loading || error || success) && "pr-12",
              isOverLimit && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
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
          
          {/* Status Icons */}
          <div className="absolute top-3 right-3 flex items-center space-x-2">
            {loading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-4 h-4 text-brand-primary" />
              </motion.div>
            )}
            
            {!loading && (error || isOverLimit) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <AlertCircle className="w-4 h-4 text-red-400" />
              </motion.div>
            )}
            
            {!loading && !error && !isOverLimit && success && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <Check className="w-4 h-4 text-green-400" />
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Character Counter */}
        {characterLimit && (
          <div className="flex justify-end">
            <span className={cn(
              "text-xs",
              isOverLimit ? "text-red-400" : currentLength > characterLimit * 0.8 ? "text-yellow-400" : "text-text-tertiary"
            )}>
              {currentLength}/{characterLimit}
            </span>
          </div>
        )}
        
        {/* Messages */}
        <AnimatePresence mode="wait">
          {(error || isOverLimit) && (
            <motion.div 
              key="error"
              className="flex items-center gap-2 text-sm text-red-400"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {isOverLimit ? `Message is too long (${currentLength - (characterLimit || 0)} characters over limit)` : error}
            </motion.div>
          )}
          
          {!error && !isOverLimit && success && (
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
          
          {!error && !isOverLimit && !success && hint && (
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

Textarea.displayName = "Textarea";

export default Textarea;
