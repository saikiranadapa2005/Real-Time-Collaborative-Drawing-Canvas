# Architecture Overview

## Data Flow Diagram

(User’s mouse input)
|
V
[Frontend Canvas]
|
V
WebSocket Event → [Node.js Server] → Broadcast → [All Connected Clients]


- Each user sends drawing operations, cursor movements, and undo/redo actions to the server via WebSocket.
- Server serializes operations, manages global history, broadcasts to all users.

## WebSocket Protocol

- **draw**: `{ type: "draw", from, to, tool, color, width, userId }` — Broadcast on every drawing action
- **cursor**: `{ type: "cursor", x, y, userId }` — Broadcast on mouse movement
- **undo**: `{ type: "undo", userId }` — Triggers undo in global history
- **redo**: `{ type: "redo", userId }` — Triggers redo in global history
- **userlist**: `{ users: [{id, color}] }` — Broadcast when users connect/disconnect

## Undo/Redo Strategy

- **Global operation history**:  
  All drawing actions are stored in a central array (`history[]`). Undo/redo removes/restores the last action regardless of which user performed it.
- **Conflict resolution**:  
  If user A undoes user B’s last action, it is removed from the canvas for all. Redo restores the most recently “undone” action.
- **Canvas state consistency:**  
  After undo/redo, the server broadcasts updated operation history which every client uses to re-render the canvas.

## Performance Decisions

- Minimal redraws: Only the affected operations are computed after undo/redo.
- Drawing data is serialized into compact objects (coordinates normalized to canvas size).
- Cursors and user info are lightweight, optimized for low-latency updates.
- No additional drawing libraries—pure Canvas API for efficiency and maximum control.

## Conflict Resolution

- All operations are linearized in the server’s history; simultaneous events are ordered as they arrive.
- Each action is tagged with user ID and processed sequentially.
- Undo/redo applies to the top of the history stack, preventing partial/inconsistent undos.
- If simultaneous drawings overlap, all strokes are rendered in server-received order for all users.
