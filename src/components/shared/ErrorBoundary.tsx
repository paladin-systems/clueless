import { Component, type ErrorInfo, type ReactNode } from "react";
import { uiLogger } from "../../utils/logger";

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
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    uiLogger.error("Uncaught error", { error, errorInfo });
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
          <div className="max-w-lg rounded-lg bg-gray-800 p-6 shadow-xl">
            <h2 className="mb-4 font-semibold text-white text-xl">Something went wrong</h2>
            <div className="mb-4 max-h-48 overflow-auto rounded bg-gray-900 p-4">
              <pre className="text-red-400 text-sm">{this.state.error?.toString()}</pre>
              {this.state.errorInfo && (
                <pre className="mt-2 text-gray-400 text-xs">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              {" "}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="cursor-pointer rounded bg-gray-700 px-4 py-2 text-gray-300 transition-colors hover:bg-gray-600"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleRetry}
                className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
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
