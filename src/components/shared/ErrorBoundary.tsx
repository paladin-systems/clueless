import { Button, Card, CardBody, CardHeader, Code } from "@heroui/react";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="mx-4 w-full max-w-lg">
            <CardHeader>
              <h2 className="font-semibold text-danger text-xl">Something went wrong</h2>
            </CardHeader>
            <CardBody className="gap-4">
              <Code className="max-h-48 w-full overflow-auto" color="danger" size="sm">
                <pre className="whitespace-pre-wrap">
                  {this.state.error?.toString()}
                  {this.state.errorInfo && (
                    <>
                      {"\n\n"}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </Code>
              <div className="flex justify-end gap-2">
                <Button variant="flat" onPress={() => window.location.reload()}>
                  Reload Page
                </Button>
                <Button color="primary" onPress={this.handleRetry}>
                  Try Again
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
