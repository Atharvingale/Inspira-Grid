interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Loading({ message = 'Loading...', size = 'md', className = '' }: LoadingProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-6 h-6';
      case 'lg': return 'w-14 h-14';
      case 'xl': return 'w-16 h-16';
      default: return 'w-10 h-10';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 py-8 ${className}`}>
      {/* Spinner */}
      <div className={`${getSizeClasses()} animate-spin rounded-full border-4 border-white/20 border-t-brand`} />
      
      {/* Animated dots */}
      <div className="flex space-x-2">
        <div className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-brand rounded-full animate-bounce" />
      </div>
      
      {message && (
        <p className="text-text-tertiary text-sm animate-pulse">{message}</p>
      )}
    </div>
  );
}

// Full page loading variant
export function FullPageLoading({ message = 'Loading Inspira-Grid...' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-dark-surface/50 z-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center justify-center">
          <span className="text-3xl mr-3">⬢</span>
          Inspira-Grid
        </h2>
        
        <div className="relative mb-6">
          <div className="w-16 h-16 mx-auto animate-spin rounded-full border-4 border-white/20 border-t-brand" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-brand rounded-full animate-pulse" />
        </div>
        
        <p className="text-text-tertiary mb-4 animate-pulse">{message}</p>
        
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-brand rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}