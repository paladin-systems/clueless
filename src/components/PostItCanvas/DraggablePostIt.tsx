import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";
import type React from "react";
import { useCallback, useState } from "react";
import { FaGripVertical, FaUpRightAndDownLeftFromCenter, FaXmark } from "react-icons/fa6";
import type { PostItNote } from "../../types/ui";
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.id,
    data: {
      noteId: note.id,
      initialPosition: note.position,
    },
  });
  // Custom drag listeners that include selection and bringing to front
  const customListeners = {
    ...listeners,
    onMouseDown: (e: React.MouseEvent) => {
      // Select the note and bring to front when starting to drag
      if (!isSelected) {
        onSelect?.();
      }
      // Call the original onMouseDown if it exists
      if (listeners?.onMouseDown) {
        listeners.onMouseDown(e as any);
      }
    },
    onTouchStart: (e: React.TouchEvent) => {
      // Select the note and bring to front when starting to drag on touch devices
      if (!isSelected) {
        onSelect?.();
      }
      // Call the original onTouchStart if it exists
      if (listeners?.onTouchStart) {
        listeners.onTouchStart(e as any);
      }
    },
  };

  const divStyle: React.CSSProperties = {
    position: "absolute",
    left: note.position.x,
    top: note.position.y,
    width: note.size.width,
    height: note.size.height,
    zIndex: note.zIndex,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : "none",
    willChange: "transform", // Helps browser optimize transform rendering
    // Disable transitions during drag to prevent conflicts
    transition: isDragging || isResizing ? "none" : undefined,
  };
  // Handle resize
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent drag from starting when resizing
      setIsResizing(true);

      // Bring note to front when starting to resize
      if (!isSelected) {
        onSelect?.();
      }

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = note.size.width;
      const startHeight = note.size.height;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = Math.max(200, Math.min(600, startWidth + (moveEvent.clientX - startX)));
        const newHeight = Math.max(150, Math.min(400, startHeight + (moveEvent.clientY - startY)));
        onResize({ width: newWidth, height: newHeight });
      };

      const onMouseUp = () => {
        setIsResizing(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [note.size, onResize, isSelected, onSelect],
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
    <div
      ref={setNodeRef}
      style={divStyle}
      className={clsx(
        "post-it",
        `category-${note.category}`,
        isSelected && ["ring-2", "ring-blue-500", "selected"],
        isDragging && "dragging", // Add dragging class
        isResizing && "resizing", // Add resizing class
        className,
      )}
      onClick={handleClick}
      role="article"
      aria-label={`${note.category} note`}
      onKeyDown={handleKeyDown}
    >
      {" "}
      {/* Note Header with Drag Handle */}
      <div className="drag-handle" {...customListeners} {...attributes}>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center space-x-2">
            <FaGripVertical className="text-gray-500 text-xs" />
            <span className="font-medium text-gray-700 text-xs capitalize">{note.category}</span>
            <span className="text-gray-500 text-xs">{formatTimestamp(note.timestamp)}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="close-button ml-2 rounded-full p-1 text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-500"
            title="Delete note"
            aria-label="Delete note"
          >
            <FaXmark className="text-xs" />
          </button>
        </div>
      </div>
      {/* Note Content */}
      <div className="flex h-[calc(100%-2.5rem)] flex-col p-4">
        <div className="prose prose-sm max-w-none flex-grow overflow-auto text-gray-800">
          {note.content}
        </div>
      </div>{" "}
      {/* Resize Handle (manual implementation) */}{" "}
      <div
        className="absolute right-1 bottom-1 flex h-4 w-4 cursor-se-resize items-center justify-center"
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      >
        <FaUpRightAndDownLeftFromCenter className="scale-x-[-1] text-gray-400/70 text-xs transition-colors hover:text-gray-600" />
      </div>
    </div>
  );
};

export default DraggablePostIt;
