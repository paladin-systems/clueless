import { Button, Code, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
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
        <Modal
          isOpen={true}
          onClose={this.handleClose}
          size="lg"
          placement="center"
          backdrop="opaque"
          isDismissable={true}
          hideCloseButton={false}
        >
          <ModalContent>
            {(_onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <h3 className="font-semibold text-danger text-lg">Something went wrong</h3>
                </ModalHeader>
                <ModalBody className="gap-4 pb-6">
                  <Code className="w-full" color="danger" size="sm">
                    <pre className="whitespace-pre-wrap break-words">
                      {this.state.error?.toString()}
                    </pre>
                  </Code>
                  <div className="flex justify-end">
                    <Button color="primary" onPress={this.handleClose}>
                      Close
                    </Button>
                  </div>
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>
      );
    }

    return this.props.children;
  }
}

export default ModalErrorBoundary;
