import React, { Component, ErrorInfo, ReactNode } from 'react';
import { uiLogger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    uiLogger.error('Uncaught error', { error, errorInfo });
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
          <div className="max-w-lg p-6 bg-gray-800 rounded-lg shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">
              Something went wrong
            </h2>
            <div className="bg-gray-900 rounded p-4 mb-4 overflow-auto max-h-48">
              <pre className="text-sm text-red-400">
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo && (
                <pre className="text-xs text-gray-400 mt-2">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
            <div className="flex justify-end space-x-3">              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;