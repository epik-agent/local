import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Axis along which the panel is resized.
 * - `"horizontal"` tracks `clientX` (for sidebar width)
 * - `"vertical"` tracks `clientY` (for bottom-panel height)
 */
type Axis = "horizontal" | "vertical";

/**
 * Direction of the drag relative to the panel's growth.
 * - `"positive"` means moving right / down increases the size
 * - `"negative"` means moving left / up increases the size
 */
type Direction = "positive" | "negative";

interface UseResizeHandleOptions {
  /** Starting size in pixels. */
  defaultSize: number;
  /** Minimum allowed size in pixels. */
  minSize: number;
  /** Maximum allowed size in pixels. */
  maxSize: number;
  /** Whether resizing is horizontal (width) or vertical (height). */
  axis: Axis;
  /**
   * Direction of growth.  For a left sidebar whose right edge is the handle,
   * dragging right (positive X) increases width → `"positive"`.  For a right
   * sidebar whose left edge is the handle, dragging left (negative X) increases
   * width → `"negative"`.  For a bottom panel whose top edge is the handle,
   * dragging up (negative Y) increases height → `"negative"`.
   */
  direction: Direction;
}

interface UseResizeHandleReturn {
  /** Current size in pixels. */
  size: number;
  /** Whether a drag operation is in progress. */
  isDragging: boolean;
  /** Attach this to the drag handle's `onMouseDown`. */
  onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Shared hook that powers drag-to-resize on any panel edge.
 *
 * Registers global `mousemove` / `mouseup` listeners on the document so the
 * drag continues even when the pointer leaves the handle element.
 */
export function useResizeHandle({
  defaultSize,
  minSize,
  maxSize,
  axis,
  direction,
}: UseResizeHandleOptions): UseResizeHandleReturn {
  const [size, setSize] = useState(defaultSize);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPosRef = useRef(0);
  const dragStartSizeRef = useRef(defaultSize);

  const onMouseDown = useCallback(
    (e: React.MouseEvent): void => {
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartPosRef.current = axis === "horizontal" ? e.clientX : e.clientY;
      dragStartSizeRef.current = size;
      e.preventDefault();
    },
    [axis, size],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDraggingRef.current) return;
      const currentPos = axis === "horizontal" ? e.clientX : e.clientY;
      const delta = currentPos - dragStartPosRef.current;
      const sizeDelta = direction === "positive" ? delta : -delta;
      const newSize = Math.min(maxSize, Math.max(minSize, dragStartSizeRef.current + sizeDelta));
      setSize(newSize);
    };

    const handleMouseUp = (): void => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return (): void => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [axis, direction, minSize, maxSize]);

  return { size, isDragging, onMouseDown };
}
