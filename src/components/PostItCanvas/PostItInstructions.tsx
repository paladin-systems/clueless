import { Button, Card, CardBody, CardHeader, Kbd } from "@heroui/react";
import type React from "react";
import { FaKeyboard, FaXmark } from "react-icons/fa6";
import { useStore } from "../../store";

const PostItInstructions: React.FC = () => {
  const showInstructions = useStore((state) => state.viewOptions.showInstructions);
  const updateViewOptions = useStore((state) => state.updateViewOptions);

  const hideInstructions = () => {
    updateViewOptions({ showInstructions: false });
  };

  if (!showInstructions) return null;

  return (
    <Card
      className="fixed right-4 bottom-4 max-w-xs shadow-large"
      style={{ zIndex: 9007199254740991 }}
    >
      <CardHeader className="flex items-start justify-between pb-2">
        <h3 className="font-medium text-md">Keyboard Controls</h3>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={hideInstructions}
          aria-label="Close instructions"
        >
          <FaXmark />
        </Button>
      </CardHeader>

      <CardBody className="pt-0">
        <div className="space-y-3">
          <div>
            <div className="mb-2 text-default-500 text-small">Move Note</div>
            <div className="flex items-center gap-1">
              <Kbd keys={[]}>↑</Kbd>
              <Kbd keys={[]}>↓</Kbd>
              <Kbd keys={[]}>←</Kbd>
              <Kbd keys={[]}>→</Kbd>
            </div>
          </div>

          <div>
            <div className="mb-2 text-default-500 text-small">Resize Note</div>
            <div className="flex items-center gap-1">
              <Kbd keys={[]}>Shift</Kbd>
              <span className="text-default-400">+</span>
              <Kbd keys={[]}>↑↓←→</Kbd>
            </div>
          </div>

          <div className="space-y-2 text-default-400 text-small">
            <p>Tab through notes to select and use arrow keys to move them.</p>
            <p className="flex items-center gap-1">
              Press ? for more shortcuts or click the <FaKeyboard className="inline" /> icon in the
              top menu.
            </p>
            <Button
              size="sm"
              variant="light"
              color="primary"
              onPress={hideInstructions}
              className="h-auto p-1"
            >
              Got it, don't show again
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default PostItInstructions;
