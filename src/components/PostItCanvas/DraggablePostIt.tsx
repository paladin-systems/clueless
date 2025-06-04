import React, { useCallback } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import { PostItNote } from '../../types/ui';
import clsx from 'clsx';

interface DraggablePostItProps {
  note: PostItNote;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onPin: () => void;
  canvasBounds: { width: number; height: number };
  className?: string;
}

const DraggablePostIt: React.FC<DraggablePostItProps> = ({
  note,
  onMove,
  onResize,
  onPin,
  canvasBounds,
  className
}) => {
  // Handle drag stop event
  const handleDragStop = (_e: DraggableEvent, data: DraggableData) => {
    // Ensure the note stays within canvas bounds
    const x = Math.max(0, Math.min(data.x, canvasBounds.width - note.size.width));
    const y = Math.max(0, Math.min(data.y, canvasBounds.height - note.size.height));
    onMove({ x, y });
  };

  // Handle resize stop event
  const handleResizeStop = (_e: React.SyntheticEvent, data: ResizeCallbackData) => {
    const { width, height } = data.size;
    // Ensure minimum size
    const newWidth = Math.max(200, width);
    const newHeight = Math.max(150, height);
    onResize({ width: newWidth, height: newHeight });
  };

  // Keyboard navigation for the post-it note
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const MOVE_AMOUNT = 20; // Pixels to move (matching grid size)
    const { key, shiftKey, ctrlKey, metaKey } = event;
    
    // Prevent default scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      event.preventDefault();
    }

    // Move with arrow keys
    if (!shiftKey) {
      switch (key) {
        case 'ArrowUp':
          onMove({ ...note.position, y: Math.max(0, note.position.y - MOVE_AMOUNT) });
          break;
        case 'ArrowDown':
          onMove({ ...note.position, y: note.position.y + MOVE_AMOUNT });
          break;
        case 'ArrowLeft':
          onMove({ ...note.position, x: Math.max(0, note.position.x - MOVE_AMOUNT) });
          break;
        case 'ArrowRight':
          onMove({ ...note.position, x: note.position.x + MOVE_AMOUNT });
          break;
      }
    }

    // Resize with Shift + arrow keys
    if (shiftKey) {
      const newSize = { ...note.size };
      switch (key) {
        case 'ArrowUp':
          newSize.height = Math.max(150, note.size.height - MOVE_AMOUNT);
          break;
        case 'ArrowDown':
          newSize.height = Math.min(400, note.size.height + MOVE_AMOUNT);
          break;
        case 'ArrowLeft':
          newSize.width = Math.max(200, note.size.width - MOVE_AMOUNT);
          break;
        case 'ArrowRight':
          newSize.width = Math.min(600, note.size.width + MOVE_AMOUNT);
          break;
      }
      onResize(newSize);
    }

    // Toggle pin with Space or Enter
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      onPin();
    }
  }, [note.position, note.size, onMove, onResize, onPin]);

  return (
    <Draggable
      handle=".drag-handle"
      position={note.position}
      onStop={handleDragStop}
      bounds="parent"
      grid={[20, 20]} // Snap to grid
    >
      <Resizable
        width={note.size.width}
        height={note.size.height}
        minConstraints={[200, 150]}
        maxConstraints={[600, 400]}
        onResizeStop={handleResizeStop}
        onResize={(e, data) => {
          // Update size during resize for smooth feedback
          const { width, height } = data.size;
          onResize({ width, height });
        }}
        handle={<div className="resize-handle" />}
        resizeHandles={['se']} // Only allow bottom-right resize
      >
        <div
          className={clsx(
            'post-it',
            `category-${note.category}`,
            note.isPinned && 'pinned',
            note.isAiModified && 'ai-modified',
            className
          )}
          tabIndex={0}
          role="article"
          aria-label={`${note.category} note`}
          onKeyDown={handleKeyDown}
          style={{
            width: note.size.width,
            height: note.size.height,
            transform: `rotate(${Math.random() * 2 - 1}deg)` // Slight random rotation
          }}
        >
          {/* Note Header with Drag Handle */}
          <div className="drag-handle group">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center space-x-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <span className="text-xs">
                  {new Date(note.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {note.isAiModified && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1.5 rounded">AI</span>
                )}
              </div>
              <button
                onClick={onPin}
                className="text-gray-400 hover:text-yellow-500 transition-colors opacity-50 group-hover:opacity-100"
                title={note.isPinned ? "Unpin" : "Pin"}
              >
                📌
              </button>
            </div>
          </div>

          {/* Note Content */}
          <div className="p-4 pt-0 h-[calc(100%-2.5rem)] flex flex-col">
            <div className="flex-grow overflow-auto text-gray-800 prose prose-sm max-w-none">
              {note.content}
            </div>
          </div>
        </div>
      </Resizable>
    </Draggable>
  );
};

export default DraggablePostIt;