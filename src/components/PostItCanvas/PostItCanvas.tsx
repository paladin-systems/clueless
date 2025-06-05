import React, { useCallback, useEffect, useState } from 'react';
import DraggablePostIt from './DraggablePostIt';
import PostItInstructions from './PostItInstructions';
import { PostItNote, NotePosition } from '../../types/ui';
import clsx from 'clsx';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';

interface PostItCanvasProps {
  notes: PostItNote[];
  onNoteMove: (id: string, position: { x: number; y: number }) => void;
  onNoteMoveMultiple?: (notes: NotePosition[]) => void;
  onNoteResize: (id: string, size: { width: number; height: number }) => void;
  onNoteSelect?: (id: string | null) => void;
  onNoteDelete?: (id: string) => void;
  selectedNoteId?: string | null;
  className?: string;
  id?: string;
  tabIndex?: number;
}

const PostItCanvas: React.FC<PostItCanvasProps> = ({
  notes,
  onNoteMove,
  onNoteMoveMultiple,
  onNoteResize,
  onNoteSelect,
  onNoteDelete,
  selectedNoteId,
  className,
  id,
  tabIndex
}) => {
  const MENU_HEIGHT = 56; // Height of top menu bar
  const MIN_MARGIN = 10; // Minimum margin between notes

  // Update canvas bounds
  const [canvasBounds, setCanvasBounds] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const updateBounds = () => {
      setCanvasBounds({
        width: window.innerWidth,
        height: window.innerHeight - MENU_HEIGHT
      });
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [MENU_HEIGHT]);
  // Organize notes in a grid layout
  const organizeNotes = useCallback((
    notesToOrganize: PostItNote[],
    bounds: { width: number; height: number }
  ) => {
    console.log('organizeNotes called with:', notesToOrganize, bounds);
    const organizedNotes: NotePosition[] = [];

    if (notesToOrganize.length === 0) return;

    // Calculate grid dimensions based on actual note sizes
    const maxNoteWidth = Math.max(...notesToOrganize.map(note => note.size.width), 300);
    const maxNoteHeight = Math.max(...notesToOrganize.map(note => note.size.height), 200);
    
    // Calculate available space (accounting for margins and padding)
    const availableWidth = bounds.width - (MIN_MARGIN * 2);
    const availableHeight = bounds.height - (MIN_MARGIN * 2);
    
    const cols = Math.floor(availableWidth / (maxNoteWidth + MIN_MARGIN));
    const actualCols = Math.max(1, cols); // Ensure at least 1 column
    
    notesToOrganize.forEach((note, index) => {
      const col = index % actualCols;
      const row = Math.floor(index / actualCols);
      
      // Calculate evenly distributed positions with equal spacing
      let x, y;
      
      if (actualCols === 1) {
        // Single column - center horizontally
        x = (bounds.width - note.size.width) / 2;
      } else {
        // Multiple columns - distribute evenly with equal spacing
        const totalNotesWidth = actualCols * maxNoteWidth;
        const totalSpacing = availableWidth - totalNotesWidth;
        const spaceBetweenNotes = totalSpacing / (actualCols + 1);
        
        x = spaceBetweenNotes + (col * (maxNoteWidth + spaceBetweenNotes));
        
        // Center the note within its allocated space if it's smaller than maxNoteWidth
        if (note.size.width < maxNoteWidth) {
          x += (maxNoteWidth - note.size.width) / 2;
        }
      }
      
      // Calculate vertical position with consistent spacing
      y = row * (maxNoteHeight + MIN_MARGIN) + MIN_MARGIN;
      
      // Ensure the note doesn't exceed canvas bounds
      x = Math.min(x, bounds.width - note.size.width - MIN_MARGIN);
      y = Math.min(y, bounds.height - note.size.height - MIN_MARGIN);
      
      // Ensure minimum margins
      x = Math.max(x, MIN_MARGIN);
      y = Math.max(y, MIN_MARGIN);

      organizedNotes.push({
        id: note.id,
        position: { x, y }
      });
    });
    console.log('Organized notes:', organizedNotes);

    // Update notes with new positions only if they have changed
    if (onNoteMoveMultiple) {
      const movedNotes = organizedNotes.filter(note => {
        const originalNote = notes.find(n => n.id === note.id);
        return originalNote && (originalNote.position.x !== note.position.x || originalNote.position.y !== note.position.y);
      });
      console.log('Moved notes:', movedNotes);

      if (movedNotes.length > 0) {
        onNoteMoveMultiple(movedNotes);
      }
    } else {
      // Fallback to single note updates if multiple update not supported
      organizedNotes.forEach(note => {
        const originalNote = notes.find(n => n.id === note.id);
        if (originalNote && (originalNote.position.x !== note.position.x || originalNote.position.y !== note.position.y)) {
          onNoteMove(note.id, note.position);
        }
      });
    }
  }, [notes, onNoteMove, onNoteMoveMultiple, MIN_MARGIN]);

  // Calculate z-index for note
  const getZIndex = (note: PostItNote): number => {
    return Math.floor((Date.now() - note.timestamp) / 1000);
  };

  // Handle canvas click to deselect notes
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onNoteSelect?.(null);
    }
  }, [onNoteSelect]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const noteId = active.id as string;
    const note = notes.find(n => n.id === noteId);

    if (note) {
      onNoteMove(noteId, {
        x: note.position.x + delta.x,
        y: note.position.y + delta.y,
      });
    }
  }, [notes, onNoteMove]);

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      modifiers={[restrictToParentElement]}
    >
      <div
        id={id}
        tabIndex={tabIndex}
        className={clsx(
          "absolute top-14 left-0 right-0 bottom-0 bg-transparent p-4", /* Increased padding to p-4 */
          "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
          className
        )}
        onClick={handleCanvasClick}
        role="region"
        aria-label="Post-it notes canvas"
      >
        {/* Auto-arrange Button */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => organizeNotes(notes, canvasBounds)}
            className="glass-button-secondary text-xs px-2 py-1"
          >
            Auto-arrange
          </button>
        </div>

        {/* Post-it Notes */}
        {notes.map(note => (
          <DraggablePostIt
            key={note.id}
            note={{
              ...note,
              zIndex: getZIndex(note)
            }}
            onMove={(position) => onNoteMove(note.id, position)}
            onResize={(size) => onNoteResize(note.id, size)}
            onSelect={() => onNoteSelect?.(note.id)}
            onDelete={() => onNoteDelete?.(note.id)}
            isSelected={selectedNoteId === note.id}
            canvasBounds={canvasBounds}
            className="pointer-events-auto"
          />
        ))}
        
        {/* Keyboard Instructions */}
        <PostItInstructions />
      </div>
    </DndContext>
  );
};

export default PostItCanvas;