import React, { Component, ErrorInfo, ReactNode } from 'react';
import clsx from 'clsx';
import { uiLogger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  onClose: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ModalErrorBoundary extends Component<Props, State> {
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
    uiLogger.error('Modal error', { error, errorInfo });
    this.setState({
      error,
      errorInfo
    });
  }

  private handleClose = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    this.props.onClose();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={this.handleClose}
        >
          <div 
            className={clsx(
              "bg-gray-900/95 border border-gray-700/50 rounded-lg shadow-xl",
              "w-96 max-w-lg p-6 transform transition-all duration-200",
              "animate-in fade-in zoom-in-95"
            )}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Something went wrong
              </h3>              <button
                onClick={this.handleClose}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-800 rounded p-4 mb-4">
              <pre className="text-sm text-red-400 whitespace-pre-wrap break-words">
                {this.state.error?.toString()}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={this.handleClose}
                className={clsx(
                  "px-4 py-2 bg-blue-600 text-white rounded-md text-sm",
                  "hover:bg-blue-700 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                )}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModalErrorBoundary;