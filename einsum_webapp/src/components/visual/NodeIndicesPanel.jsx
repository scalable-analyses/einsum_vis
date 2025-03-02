import React, { useState } from 'react';
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * A draggable item component that represents a single index in the panel
 * @param {Object} props - Component props
 * @param {string|number} props.id - The index value to display and use as identifier
 * @returns {JSX.Element} A draggable div containing the index
 */
const SortableItem = ({ id }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`px-2 py-1 rounded cursor-move select-none
        ${isDragging ? 'bg-blue-100' : 'bg-gray-100 hover:bg-gray-200'}
      `}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none',
      }}
    >
      {id}
    </div>
  );
};

/**
 * A panel component that displays and allows reordering of tensor indices
 * @param {Object} props - Component props
 * @param {Array<string|number>} props.indices - Array of indices to display and reorder
 * @param {Function} props.onSwapIndices - Callback function called with new indices array when order changes
 * @param {Object} props.position - Position object for the panel
 * @param {number} props.position.x - X coordinate for panel position
 * @param {number} props.position.y - Y coordinate for panel position
 * @param {Function} props.onMouseEnter - Handler for mouse enter event
 * @param {Function} props.onMouseLeave - Handler for mouse leave event
 * @returns {JSX.Element} A floating panel with draggable indices
 */
const NodeIndicesPanel = ({ indices, onSwapIndices, position, onMouseEnter, onMouseLeave }) => {
  // State for preview and active item tracking
  const [previewIndices, setPreviewIndices] = useState(null);
  const [activeId, setActiveId] = useState(null);

  /**
   * Configure drag sensors with custom activation constraints
   * Pointer sensor requires 5px movement to start drag
   * Touch sensor requires 250ms hold and 5px tolerance
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  /**
   * Handles the start of a drag operation
   * @param {Object} event - Drag start event
   * @param {Object} event.active - Information about the dragged item
   */
  const handleDragStart = (event) => {
    setPreviewIndices(null);
    setActiveId(event.active.id);
  };

  /**
   * Handles the drag over event to show preview of new order
   * @param {Object} event - Drag over event
   * @param {Object} event.active - Currently dragged item
   * @param {Object} event.over - Item being dragged over
   */
  const handleDragOver = (event) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const oldIndex = indices.indexOf(active.id);
    const newIndex = indices.indexOf(over.id);

    const newIndices = [...indices];
    const [movedItem] = newIndices.splice(oldIndex, 1);
    newIndices.splice(newIndex, 0, movedItem);

    setPreviewIndices(newIndices);
  };

  /**
   * Handles the end of drag operation and applies the new order if valid
   * @param {Object} event - Drag end event
   * @param {Object} event.active - The item that was dragged
   * @param {Object} event.over - The item it was dropped on
   */
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over) {
      const oldIndex = indices.indexOf(active.id);
      const newIndex = indices.indexOf(over.id);

      if (oldIndex !== newIndex) {
        const newIndices = [...indices];
        const [movedItem] = newIndices.splice(oldIndex, 1);
        newIndices.splice(newIndex, 0, movedItem);
        onSwapIndices(newIndices);
      }
    }
    setPreviewIndices(null);
    setActiveId(null);
  };

  return (
    <div
      className="fixed z-[9999] bg-white shadow-lg rounded-md p-2 border border-gray-200"
      style={{
        left: position.x,
        top: position.y - 60,
        transform: 'translateX(-50%)'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {previewIndices && (
        <div className="absolute -top-8 left-0 right-0 bg-gray-100 p-1 rounded-md border border-gray-200 text-sm text-gray-600 flex gap-1 justify-center">
          Preview: {previewIndices.map((index, i) => (
            <React.Fragment key={index}>
              <span className={index === activeId ? 'text-blue-600 font-medium' : ''}>
                {index}
              </span>
              {i < previewIndices.length - 1 && ' , '}
            </React.Fragment>
          ))}
        </div>
      )}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={indices}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-2 items-center relative min-w-[100px]">
            {indices.map((index) => (
              <SortableItem key={index} id={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default NodeIndicesPanel;