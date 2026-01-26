// Mock DragDropContext - just renders children
export const DragDropContext = ({ children }) => children;

// Mock Droppable - renders children with provided object
export const Droppable = ({ children, droppableId }) => {
  const provided = {
    innerRef: jest.fn(),
    droppableProps: {
      'data-rbd-droppable-id': droppableId,
      'data-rbd-droppable-context-id': '0',
    },
    placeholder: null,
  };
  const snapshot = {
    isDraggingOver: false,
    draggingOverWith: null,
    draggingFromThisWith: null,
    isUsingPlaceholder: false,
  };
  return children(provided, snapshot);
};

// Mock Draggable - renders children with provided object
export const Draggable = ({ children, draggableId, index }) => {
  const provided = {
    innerRef: jest.fn(),
    draggableProps: {
      'data-rbd-draggable-id': draggableId,
      'data-rbd-draggable-context-id': '0',
      style: {},
    },
    dragHandleProps: {
      'data-rbd-drag-handle-draggable-id': draggableId,
      'data-rbd-drag-handle-context-id': '0',
      role: 'button',
      tabIndex: 0,
      'aria-describedby': `rbd-hidden-text-${index}`,
    },
  };
  const snapshot = {
    isDragging: false,
    isDropAnimating: false,
    isClone: false,
    dropAnimation: null,
    draggingOver: null,
    combineWith: null,
    combineTargetFor: null,
    mode: null,
  };
  return children(provided, snapshot);
};

// Mock resetServerContext for SSR
export const resetServerContext = jest.fn();
