"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 
  'onDrag' | 'onDragEnd' | 'onDragStart' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop' |
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
> {
  hover?: boolean;
  gradient?: boolean;
  blur?: boolean;
}

export function Card({ className, hover = true, gradient = false, blur = false, children, ...props }: CardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border transition-all duration-300 group",
        {
          "bg-white/5 border-white/10 backdrop-blur-xl": blur,
          "bg-dark-card/80 backdrop-blur-sm border-dark-border": !blur && !gradient,
          "bg-gradient-to-br from-dark-card/90 to-dark-surface/90 border-dark-border backdrop-blur-sm": gradient,
          "hover:shadow-2xl hover:shadow-brand-primary/10 hover:-translate-y-2 hover:border-brand-primary/20 cursor-pointer": hover,
        },
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -8, transition: { duration: 0.2 } } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pb-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-xl font-semibold text-text-primary group-hover:text-brand-light transition-colors", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-text-tertiary group-hover:text-text-secondary mt-2 transition-colors", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-4 flex items-center gap-4", className)} {...props} />;
}