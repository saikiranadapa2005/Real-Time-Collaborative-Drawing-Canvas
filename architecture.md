#  Architecture Overview

##  Data Flow

**User Input → Frontend Canvas → WebSocket → Node.js Server → Broadcast → All Clients**

- Each user sends drawing, cursor, and undo/redo events via WebSocket.  
- The server maintains a global operation history, serializes updates, and broadcasts them to keep all clients’ canvases synchronized.



##  WebSocket Protocol

| Event Type | Data Structure | Description |

| **draw** | `{ type: draw, from, to, tool, color, width, userId }` | Triggered for every drawing action |
| **cursor** | `{ type: cursor, x, y, userId }` | Tracks real-time cursor movement |
| **undo** | `{ type: undo, userId }` | Removes the latest action from global history |
| **redo** | `{ type: redo, userId }` | Restores the most recently undone action |
| **userlist** | `{ users: [{ id, color }] }` | Updates connected users and their assigned colors |



##  Undo/Redo Mechanism

- **Centralized History:** All drawing actions are stored in a shared array (`history[]`).  
- **Global Scope:** Undo/redo affects the most recent operation, regardless of who performed it.  
- **Re-rendering:** After an undo/redo, the server broadcasts the updated history, prompting all clients to redraw.  
- **Consistency:** Only one operation is undone/redone at a time, ensuring identical canvas states for all users.



##  Performance Optimizations

- **Minimal Redraws:** Only affected operations are recomputed during undo/redo.  
- **Compact Serialization:** Coordinate data normalized and stored efficiently.  
- **Low Latency:** Cursor and user events use lightweight payloads.  
- **Pure Canvas API:** No external libraries — ensures smooth rendering and maximum control.


##  Conflict Resolution

- Operations are ordered sequentially as received by the server.  
- Each action includes a user ID for proper tracking and conflict handling.  
- Undo/redo applies only to the top of the history stack to avoid partial rollbacks.  
- Overlapping drawings are rendered in server-received order, guaranteeing consistent visuals for all users.


