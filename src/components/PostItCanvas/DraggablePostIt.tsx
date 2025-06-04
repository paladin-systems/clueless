import React, { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { PostItNote } from '../../types/ui';
import { useDraggable } from '@dnd-kit/core';
import Tooltip from '../shared/Tooltip';
import { formatTimestamp, formatTooltipTime, getElapsedTime } from '../../utils/timeUtils';

interface Props {
  note: PostItNote & { zIndex?: number };
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onPin: () => void;
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
  onPin,
  canvasBounds,
  className,
  onSelect,
  onDelete,
  isSelected
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: note.id,
    data: {
      noteId: note.id,
      initialPosition: note.position,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag from starting when resizing

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
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [note.size, onResize]);

  // Keyboard navigation for the post-it note
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const MOVE_AMOUNT = 20; // Pixels to move (matching grid size)
    const { key, shiftKey } = event;
    
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

    // Handle keyboard shortcuts
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      onPin();
    } else if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      onDelete?.();
    }
  }, [note.position, note.size, onMove, onResize, onPin]);

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, width: note.size.width, height: note.size.height, zIndex: note.zIndex }}
      className={clsx(
        'post-it',
        `category-${note.category}`,
        note.isPinned && 'pinned',
        note.isAiModified && 'ai-modified',
        isSelected && 'ring-2 ring-blue-500',
        className
      )}
      onClick={onSelect}
      tabIndex={0}
      role="article"
      aria-label={`${note.category} note`}
      onKeyDown={handleKeyDown}
    >
      {/* Note Header with Drag Handle */}
      <div className="drag-handle" {...listeners} {...attributes}>
        <div className="flex items-center justify-between p-2">
          <Tooltip
            content={
              <div className="space-y-1">
                <div>Created: {formatTooltipTime(note.timestamp)}</div>
                <div>Last modified: {getElapsedTime(note.lastModified)}</div>
                {note.isAiModified && <div>Modified by AI</div>}
              </div>
            }
            placement="top"
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">
                {formatTimestamp(note.timestamp)}
              </span>
              {note.isAiModified && (
                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 rounded">AI</span>
              )}
            </div>
          </Tooltip>
          <Tooltip
            content={note.isPinned ? "Unpin note" : "Pin note to top"}
            placement="left"
            delay={500}
          >
            <button
              onClick={onPin}
              className="text-gray-400 hover:text-yellow-500 transition-colors"
              aria-label={note.isPinned ? "Unpin" : "Pin"}
            >
              📌
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Note Content */}
      <div className="p-4 pt-0 h-[calc(100%-2.5rem)] flex flex-col">
        <div className="flex-grow overflow-auto text-gray-800 prose prose-sm max-w-none">
          {note.content}
        </div>
      </div>
      {/* Resize Handle (manual implementation) */}
      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-gray-400/50 rounded-full" />
      </div>
    </div>
  );
};

export default DraggablePostIt;