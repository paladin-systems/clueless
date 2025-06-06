import clsx from "clsx";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { uiLogger } from "../../utils/logger";

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
    uiLogger.error("Modal error", { error, errorInfo });
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleClose = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onClose();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={this.handleClose}
          onKeyDown={(e) => e.key === "Escape" && this.handleClose()}
          role="presentation"
        >
          <div
            className={clsx(
              "rounded-lg border border-gray-700/50 bg-gray-900/95 shadow-xl",
              "w-96 max-w-lg transform p-6 transition-all duration-200",
              "fade-in zoom-in-95 animate-in",
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-white">Something went wrong</h3>{" "}
              <button
                type="button"
                onClick={this.handleClose}
                className="cursor-pointer text-gray-400 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 rounded bg-gray-800 p-4">
              <pre className="whitespace-pre-wrap break-words text-red-400 text-sm">
                {this.state.error?.toString()}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={this.handleClose}
                className={clsx(
                  "rounded-md bg-blue-600 px-4 py-2 text-sm text-white",
                  "transition-all duration-200 hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900",
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
