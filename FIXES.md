## Fix: Control points become unmovable after dragging outside the canvas

### Problem

Dragging a control point and releasing the mouse button while the pointer is outside the main canvas area (e.g. over the left or right panel) causes the control point to become unresponsive. It's still visible in the correct position, but it can no longer be clicked or dragged. Sometimes maximizing the window resolves the issue.

### Root cause

During a drag, Konva internally updates the Circle node's position to follow the pointer. When the pointer leaves the Stage and the mouse button is released:

1. **Hit area desync**: The Konva node's internal `x`/`y` position ends up far off-screen (e.g. at negative coordinates over the side panel), while the *visual* circle is rendered at the correct clamped position from React props. Since `abs2RelPoint` clamps to `[0, 1]`, the Redux state and the resulting `absolutePosition` prop often stay the same across renders. react-konva compares `props.x !== oldProps.x` — they're equal, so it **skips the `setAttrs` call**. The invisible hit circle stays off-screen while the visible circle appears correct. The control point looks fine but can't be interacted with.

2. **Stale drag state**: Konva's `DD._dragElements` map may not get properly cleaned up if the `mouseup` event doesn't reach the Stage's event handler, leaving `isDragging()` stuck as `true` and preventing new drag operations.

### Fix

Two changes to `ControlPoint` in `src/gui/components/control-points-panel/control-point.tsx`:

1. **Reset node position in `onDragEnd`**: After a drag ends, explicitly set the Konva Circle node's position back to `this.props.absolutePosition` via a ref. This ensures the hit area always matches the visual position, regardless of whether react-konva detected a prop change.

2. **Window-level `mouseup` listener**: Added a `window` `mouseup` handler that calls `node.stopDrag()` if the component is still in a dragging state. This ensures Konva's internal drag state is properly cleaned up even when the pointer release happens outside the Stage container.
