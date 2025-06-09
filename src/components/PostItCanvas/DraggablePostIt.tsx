import { useDraggable } from "@dnd-kit/core";
import { Button, Card, CardBody, CardHeader, Chip } from "@heroui/react";
import clsx from "clsx";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FaGripVertical, FaUpRightAndDownLeftFromCenter, FaXmark } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";
import type { PostItNote } from "../../types/ui";
import { uiLogger } from "../../utils/logger";
import { throttle } from "../../utils/performance";
import { formatTimestamp } from "../../utils/timeUtils";

interface Props {
  note: PostItNote & { zIndex?: number };
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onSelect?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  canvasBounds: { width: number; height: number };
  className?: string;
}

const DraggablePostIt: React.FC<Props> = ({
  note,
  onMove,
  onResize,
  className,
  onSelect,
  onDelete,
  isSelected,
}) => {
  const [isResizing, setIsResizing] = useState(false);

  // Cleanup user-select when component unmounts or resizing state changes
  useEffect(() => {
    if (!isResizing) {
      // Ensure user-select is restored when not resizing
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [isResizing]);
  // Set up draggable functionality
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.id,
    data: {
      noteId: note.id,
      initialPosition: note.position,
    },
  });
  // Custom drag listeners that include selection and bringing to front
  const customListeners = useMemo(
    () => ({
      ...listeners,
      onMouseDown: (e: React.MouseEvent) => {
        // Select the note and bring to front when starting to drag
        if (!isSelected) {
          onSelect?.();
        }
        // Call the original onMouseDown if it exists
        if (listeners?.onMouseDown) {
          listeners.onMouseDown(e as React.MouseEvent<HTMLElement>);
        }
      },
      onTouchStart: (e: React.TouchEvent) => {
        // Select the note and bring to front when starting to drag on touch devices
        if (!isSelected) {
          onSelect?.();
        }
        // Call the original onTouchStart if it exists
        if (listeners?.onTouchStart) {
          listeners.onTouchStart(e as React.TouchEvent<HTMLElement>);
        }
      },
    }),
    [listeners, isSelected, onSelect],
  );

  // Memoize the div style to prevent recreation on every render
  const divStyle: React.CSSProperties = useMemo(
    () => ({
      position: "absolute",
      left: note.position.x,
      top: note.position.y,
      width: note.size.width,
      height: note.size.height,
      zIndex: note.zIndex,
      // Apply drag transform during dragging, no transform when not dragging
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      willChange: isDragging || isResizing ? "transform" : undefined,
      // Disable transitions during drag to prevent conflicts
      transition: isDragging || isResizing ? "none" : undefined,
    }),
    [
      note.position.x,
      note.position.y,
      note.size.width,
      note.size.height,
      note.zIndex,
      transform,
      isDragging,
      isResizing,
    ],
  );

  // Create throttled resize function to reduce database calls
  const throttledOnResize = useMemo(
    () => throttle(onResize, 50), // Throttle to max 20 calls per second
    [onResize],
  );

  // Handle resize
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent drag from starting when resizing
      e.preventDefault(); // Prevent text selection
      setIsResizing(true);

      // Bring note to front when starting to resize
      if (!isSelected) {
        onSelect?.();
      }

      // Disable text selection during resize
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = note.size.width;
      const startHeight = note.size.height;

      const onMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault(); // Prevent text selection
        const newWidth = Math.max(200, Math.min(600, startWidth + (moveEvent.clientX - startX)));
        const newHeight = Math.max(150, Math.min(400, startHeight + (moveEvent.clientY - startY)));
        throttledOnResize({ width: newWidth, height: newHeight });
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        upEvent.preventDefault(); // Prevent text selection
        setIsResizing(false);

        // Re-enable text selection
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";

        // Final resize call to ensure the latest size is saved
        const finalWidth = Math.max(200, Math.min(600, startWidth + (upEvent.clientX - startX)));
        const finalHeight = Math.max(150, Math.min(400, startHeight + (upEvent.clientY - startY)));
        onResize({ width: finalWidth, height: finalHeight });

        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [note.size, onResize, throttledOnResize, isSelected, onSelect],
  );

  // Keyboard navigation for the post-it note
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const MOVE_AMOUNT = 20; // Pixels to move (matching grid size)
      const { key, shiftKey } = event;

      // Prevent default scrolling
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        event.preventDefault();
      }

      // Move with arrow keys
      if (!shiftKey) {
        switch (key) {
          case "ArrowUp":
            onMove({ ...note.position, y: Math.max(0, note.position.y - MOVE_AMOUNT) });
            break;
          case "ArrowDown":
            onMove({ ...note.position, y: note.position.y + MOVE_AMOUNT });
            break;
          case "ArrowLeft":
            onMove({ ...note.position, x: Math.max(0, note.position.x - MOVE_AMOUNT) });
            break;
          case "ArrowRight":
            onMove({ ...note.position, x: note.position.x + MOVE_AMOUNT });
            break;
        }
      }

      // Resize with Shift + arrow keys
      if (shiftKey) {
        const newSize = { ...note.size };
        switch (key) {
          case "ArrowUp":
            newSize.height = Math.max(150, note.size.height - MOVE_AMOUNT);
            break;
          case "ArrowDown":
            newSize.height = Math.min(400, note.size.height + MOVE_AMOUNT);
            break;
          case "ArrowLeft":
            newSize.width = Math.max(200, note.size.width - MOVE_AMOUNT);
            break;
          case "ArrowRight":
            newSize.width = Math.min(600, note.size.width + MOVE_AMOUNT);
            break;
        }
        onResize(newSize);
      } // Handle keyboard shortcuts
      if (key === "Delete" || key === "Backspace") {
        event.preventDefault();
        onDelete?.();
      }
    },
    [note.position, note.size, onMove, onResize, onDelete],
  ); // Handle click to select note and bring to front
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't select if we're dragging or resizing
      if (isDragging || isResizing) {
        return;
      }

      // Don't select if the click was on the drag handle or close button
      if (
        (e.target as HTMLElement).closest(".drag-handle") ||
        (e.target as HTMLElement).closest(".close-button")
      ) {
        return;
      }

      e.stopPropagation();
      onSelect?.(); // This will bring the note to front via selectNote in store
    },
    [isDragging, isResizing, onSelect],
  );

  return (
    <Card
      ref={setNodeRef}
      style={divStyle}
      className={clsx(
        "post-it",
        `category-${note.category}`,
        isSelected && ["ring-2", "ring-primary", "selected"],
        isDragging && "dragging", // Add dragging class
        isResizing && "resizing", // Add resizing class
        "shadow-medium transition-shadow hover:shadow-large",
        className,
      )}
      onClick={handleClick}
      aria-label={`${note.category} note`}
      onKeyDown={handleKeyDown}
    >
      {/* Note Header with Drag Handle */}
      <CardHeader className="drag-handle pb-1" {...customListeners} {...attributes}>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <FaGripVertical className="text-default-400 text-xs" />
            <Chip
              size="sm"
              variant="flat"
              color={
                note.category === "answer"
                  ? "primary"
                  : note.category === "advice"
                    ? "warning"
                    : note.category === "follow-up"
                      ? "success"
                      : "default"
              }
              className="text-xs capitalize"
            >
              {note.category}
            </Chip>
            <span className="text-default-400 text-xs">{formatTimestamp(note.timestamp)}</span>
          </div>
          {/* Delete button */}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            onPress={() => {
              uiLogger.debug({ noteId: note.id }, "Delete button clicked");
              onDelete?.();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="close-button h-6 w-6 min-w-6"
            title="Delete note"
            aria-label="Delete note"
          >
            <FaXmark className="text-xs" />
          </Button>
        </div>
      </CardHeader>
      {/* Note Content */}
      <CardBody className="flex h-[calc(100%-3.5rem)] flex-col pt-0">
        <div className="prose prose-sm max-w-none flex-grow overflow-auto">
          <ReactMarkdown
            components={{
              // Customize heading styles to fit post-it size
              h1: ({ children }) => (
                <h1 className="mb-2 font-bold text-gray-900 text-sm">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-1 font-semibold text-gray-800 text-sm">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1 font-semibold text-gray-700 text-xs">{children}</h3>
              ),
              // Customize paragraph spacing
              p: ({ children }) => (
                <p className="mb-2 text-xs leading-relaxed last:mb-0">{children}</p>
              ),
              // Customize list styles
              ul: ({ children }) => (
                <ul className="mb-2 space-y-1 pl-3 text-xs last:mb-0">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 space-y-1 pl-3 text-xs last:mb-0">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              // Customize code styles
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <code className="block overflow-x-auto rounded border bg-gray-100 p-2 text-xs">
                    {children}
                  </code>
                ) : (
                  <code className="rounded border bg-gray-100 px-1 py-0.5 text-xs">{children}</code>
                );
              },
              // Customize blockquote styles
              blockquote: ({ children }) => (
                <blockquote className="mb-2 ml-1 border-gray-300 border-l-2 pl-2 text-gray-600 text-xs italic">
                  {children}
                </blockquote>
              ),
              // Customize link styles
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-blue-600 text-xs underline hover:text-blue-800"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              // Customize strong/bold text
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900">{children}</strong>
              ),
              // Customize emphasis/italic text
              em: ({ children }) => <em className="text-gray-700 italic">{children}</em>,
            }}
          >
            {note.content}
          </ReactMarkdown>
        </div>
        {/* Resize Handle (manual implementation) */}
        <div
          className="absolute right-1 bottom-1 flex h-4 w-4 cursor-se-resize select-none items-center justify-center"
          onMouseDown={handleMouseDown}
          title="Drag to resize"
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
          draggable={false}
        >
          <FaUpRightAndDownLeftFromCenter className="pointer-events-none scale-x-[-1] text-default-400/70 text-xs transition-colors hover:text-default-600" />
        </div>
      </CardBody>
    </Card>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(DraggablePostIt, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when only irrelevant props change
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.position.x === nextProps.note.position.x &&
    prevProps.note.position.y === nextProps.note.position.y &&
    prevProps.note.size.width === nextProps.note.size.width &&
    prevProps.note.size.height === nextProps.note.size.height &&
    prevProps.note.color === nextProps.note.color &&
    prevProps.note.zIndex === nextProps.note.zIndex &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.canvasBounds.width === nextProps.canvasBounds.width &&
    prevProps.canvasBounds.height === nextProps.canvasBounds.height
  );
});
