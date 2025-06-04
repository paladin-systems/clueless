import React, { useCallback, useEffect, useState } from 'react';
import DraggablePostIt from './DraggablePostIt';
import PostItInstructions from './PostItInstructions';
import { PostItNote, NotePosition } from '../../types/ui';
import clsx from 'clsx';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement, createSnapModifier } from '@dnd-kit/modifiers';

interface PostItCanvasProps {
  notes: PostItNote[];
  onNoteMove: (id: string, position: { x: number; y: number }) => void;
  onNoteMoveMultiple?: (notes: NotePosition[]) => void;
  onNoteResize: (id: string, size: { width: number; height: number }) => void;
  onNotePinToggle: (id: string) => void;
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
  onNotePinToggle,
  onNoteSelect,
  onNoteDelete,
  selectedNoteId,
  className,
  id,
  tabIndex
}) => {
  const [layout, setLayout] = useState<'grid' | 'cascade'>('cascade');
  const GRID_SIZE = 20; // Grid size for snapping
  const MENU_HEIGHT = 56; // Height of top menu bar
  const MIN_MARGIN = 10; // Minimum margin between notes

  // Update canvas bounds and organize notes on resize
  const [canvasBounds, setCanvasBounds] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const updateBounds = () => {
      const newBounds = {
        width: window.innerWidth,
        height: window.innerHeight - MENU_HEIGHT
      };
      setCanvasBounds(newBounds);
      organizeNotes(notes, newBounds, layout);
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [notes, layout]);

  // Organize notes in grid or cascade layout
  const organizeNotes = (
    notes: PostItNote[], 
    bounds: { width: number; height: number },
    layout: 'grid' | 'cascade'
  ) => {
    const pinnedNotes = notes.filter(n => n.isPinned);
    const unpinnedNotes = notes.filter(n => !n.isPinned);
    
    // Always keep pinned notes at their current positions
    const organizedNotes = [...pinnedNotes];
    
    if (layout === 'grid') {
      // Organize unpinned notes in a grid
      const cols = Math.floor(bounds.width / (300 + MIN_MARGIN));
      unpinnedNotes.forEach((note, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * (300 + MIN_MARGIN) + MIN_MARGIN;
        const y = row * (200 + MIN_MARGIN) + MIN_MARGIN;
        
        organizedNotes.push({
          ...note,
          position: { x, y }
        });
      });
    } else {
      // Cascade layout
      unpinnedNotes.forEach((note, index) => {
        const offset = index * 20;
        const x = Math.min(offset + MIN_MARGIN, bounds.width - note.size.width - MIN_MARGIN);
        const y = Math.min(offset + MIN_MARGIN, bounds.height - note.size.height - MIN_MARGIN);
        
        organizedNotes.push({
          ...note,
          position: { x, y }
        });
      });
    }
    
    // Update notes with new positions only if they have changed
    if (onNoteMoveMultiple) {
      const movedNotes = organizedNotes.filter((note, index) => {
        const originalNote = notes[index];
        return originalNote.position.x !== note.position.x || originalNote.position.y !== note.position.y;
      });

      if (movedNotes.length > 0) {
        onNoteMoveMultiple(movedNotes.map(note => ({
          id: note.id,
          position: note.position
        })));
      }
    } else {
      // Fallback to single note updates if multiple update not supported
      organizedNotes.forEach((note, index) => {
        const originalNote = notes[index];
        if (originalNote.position.x !== note.position.x || originalNote.position.y !== note.position.y) {
          onNoteMove(note.id, note.position);
        }
      });
    }
  };

  // Calculate z-index for note (pinned notes on top)
  const getZIndex = (note: PostItNote): number => {
    const baseZ = note.isPinned ? 1000 : 0;
    return baseZ + Math.floor((Date.now() - note.timestamp) / 1000);
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
        {/* Layout Controls */}
        <div className="absolute top-4 right-4 flex items-center space-x-2 z-50">
          <button
            onClick={() => setLayout('grid')}
            className={clsx(
              'glass-button-secondary text-xs px-2 py-1',
              layout === 'grid' && 'ring-1 ring-blue-400'
            )}
          >
            Grid
          </button>
          <button
            onClick={() => setLayout('cascade')}
            className={clsx(
              'glass-button-secondary text-xs px-2 py-1',
              layout === 'cascade' && 'ring-1 ring-blue-400'
            )}
          >
            Cascade
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
            onPin={() => onNotePinToggle(note.id)}
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