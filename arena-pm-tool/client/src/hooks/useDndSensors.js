import { PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Shared DnD sensors for all views.
 * - PointerSensor: mouse with 8px distance threshold to prevent accidental drags
 * - TouchSensor: 200ms long-press activation for mobile (prevents conflicts with scrolling)
 * - KeyboardSensor: accessible keyboard-based reordering
 */
export function useDndSensors() {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  return useSensors(pointerSensor, touchSensor, keyboardSensor);
}
