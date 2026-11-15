import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from './Button';
import { captureClientException } from '@/utils/sentry';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    captureClientException(error, {
      componentStack: errorInfo?.componentStack,
      variant: this.props.variant || 'global'
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { variant = 'global', title, message } = this.props;

      // Section-level isolated error card
      if (variant === 'section') {
        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center my-4">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-900">
              {title || 'Section Temporarily Unavailable'}
            </h3>
            <p className="text-xs text-gray-600 mt-1 mb-4 max-w-sm mx-auto">
              {message || 'This section could not be loaded right now. You can try refreshing.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try Again
            </Button>
          </div>
        );
      }

      // Admin portal error view
      if (variant === 'admin') {
        return (
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {title || 'Administrative Panel Error'}
            </h2>
            <p className="text-gray-600 text-sm max-w-md mb-6">
              {message || 'An unexpected error occurred while loading this administrative view.'}
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={this.handleReset} className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Reload Component
              </Button>
              <a href="/admin">
                <Button variant="outline" className="inline-flex items-center gap-2">
                  <Home className="w-4 h-4" /> Admin Dashboard
                </Button>
              </a>
            </div>
          </div>
        );
      }

      // Global application-level fallback
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-4 shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {title || 'Something went wrong'}
          </h1>
          <p className="text-gray-600 text-sm max-w-md mb-6">
            {message || 'We encountered an unexpected error while loading this page. Our team has been notified.'}
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={this.handleReset} className="inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Try Again
            </Button>
            <a href="/">
              <Button variant="outline" className="inline-flex items-center gap-2">
                <Home className="w-4 h-4" /> Back to Storefront
              </Button>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
