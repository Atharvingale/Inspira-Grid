// Simple toast notification system to replace react-toastify
export interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

class Toast {
  private container: HTMLElement | null = null;
  private toasts: Map<string, HTMLElement> = new Map();

  private createContainer() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
    document.body.appendChild(this.container);
  }

  private createToast(message: string, type: ToastType, options: ToastOptions = {}) {
    this.createContainer();
    
    const id = Date.now().toString();
    const toast = document.createElement('div');
    
    const colors = {
      success: 'bg-success-500/90 text-white border-success-400',
      error: 'bg-red-500/90 text-white border-red-400',
      warning: 'bg-warning-500/90 text-white border-warning-400',
      info: 'bg-accent-blue/90 text-white border-accent-blue'
    };

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.className = `
      ${colors[type]} 
      border 
      rounded-xl 
      p-4 
      backdrop-blur-sm 
      shadow-lg 
      max-w-sm 
      pointer-events-auto 
      transform 
      transition-all 
      duration-300 
      ease-in-out
      translate-x-full
      opacity-0
    `;
    
    toast.innerHTML = `
      <div class="flex items-center">
        <span class="mr-3 text-lg">${icons[type]}</span>
        <p class="font-medium">${message}</p>
        <button class="ml-4 text-white/80 hover:text-white transition-colors" onclick="this.closest('[data-toast-id]').remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    
    toast.setAttribute('data-toast-id', id);
    this.container!.appendChild(toast);
    this.toasts.set(id, toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    // Auto remove
    const duration = options.duration ?? 5000;
    setTimeout(() => {
      this.remove(id);
    }, duration);

    return id;
  }

  private remove(id: string) {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.style.transform = 'translateX(full)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
        this.toasts.delete(id);
        
        // Clean up container if empty
        if (this.toasts.size === 0 && this.container) {
          this.container.remove();
          this.container = null;
        }
      }, 300);
    }
  }

  success(message: string, options?: ToastOptions) {
    return this.createToast(message, 'success', options);
  }

  error(message: string, options?: ToastOptions) {
    return this.createToast(message, 'error', options);
  }

  warning(message: string, options?: ToastOptions) {
    return this.createToast(message, 'warning', options);
  }

  info(message: string, options?: ToastOptions) {
    return this.createToast(message, 'info', options);
  }
}

export const toast = new Toast();