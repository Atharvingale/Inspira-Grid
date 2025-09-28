"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-surface/50">
          <div className="max-w-2xl mx-auto px-4">
            <div className="text-center bg-dark-surface/50 rounded-lg border border-white/10 p-8">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Something went wrong</h2>
                <p className="text-text-tertiary mb-6">
                  We're sorry, but something unexpected happened. Our team has been notified.
                </p>
              </div>

              <div className="flex gap-3 justify-center mb-6">
                <button
                  onClick={this.handleRefresh}
                  className="px-4 py-2 bg-brand text-text-primary rounded-md hover:bg-brand-dark hover:text-white font-medium"
                >
                  Refresh Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="px-4 py-2 border border-white/20 text-text-tertiary rounded-md hover:bg-dark-surface/50"
                >
                  Go Home
                </button>
              </div>

              {/* Dev-only error details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-text-tertiary mb-3">
                    Technical Details (Development Only)
                  </summary>
                  <div className="bg-dark-surface/50 p-4 rounded text-sm">
                    <p className="text-red-400 mb-2"><strong>Error:</strong> {this.state.error.toString()}</p>
                    {this.state.errorInfo && (
                      <pre className="text-text-tertiary text-xs overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}