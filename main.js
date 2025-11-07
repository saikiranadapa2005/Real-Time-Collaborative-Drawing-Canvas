// wiring: UI <-> CanvasApp <-> WebSocket
const canvasEl = document.getElementById('drawCanvas');
const app = new CanvasApp(canvasEl);
const ws = window.WS;

let currentRoom = 'default';
let userId = null;
let yourColor = '#000';
let isJoined = false;

// adapt canvas size to container
function fitCanvas() {
  const wrap = document.getElementById('canvasWrap');
  canvasEl.style.width = '100%';
  canvasEl.style.height = '100%';
  app.resize();
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

// UI elements
const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomInput');
const nameInput = document.getElementById('nameInput');
const usersList = document.getElementById('usersList');
const toolSelect = document.getElementById('toolSelect');
const colorPicker = document.getElementById('colorPicker');
const widthRange = document.getElementById('widthRange');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const metrics = document.getElementById('metrics');

function updateUsersList(users) {
  usersList.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.className = 'userEntry';
    const dot = document.createElement('span');
    dot.className = 'colorDot';
    dot.style.background = u.color;
    li.appendChild(dot);
    const txt = document.createElement('span');
    txt.textContent = `${u.name || 'Anonymous'}${u.id === userId ? ' (you)' : ''}`;
    li.appendChild(txt);
    usersList.appendChild(li);
  });
}

// join logic
joinBtn.addEventListener('click', () => {
  const room = roomInput.value.trim() || 'default';
  const name = nameInput.value.trim() || 'Anonymous';
  currentRoom = room;
  ws.emit('join_room', { room, userName: name }, (res) => {
    if (res && res.ok) {
      isJoined = true;
      userId = ws.socket.id;
      metrics.textContent = `Connected as ${name} — socket: ${userId}`;
    }
  });
});

// socket handlers
ws.on('init_state', ({ history, users, yourColor: yc }) => {
  yourColor = yc || '#000';
  updateUsersList(users);
  app.setColor(colorPicker.value);
  app.redrawFromHistory(history);
});

ws.on('user_joined', (u) => {
  // request user list from server via initial_state when joining, but update locally
  // We'll just add notification and later server init_state will provide full list
  metrics.textContent = `${u.name || 'Someone'} joined`;
  // ask server for new list not implemented - rely on server init_state for this demo
  // but we can insert user in list
  const entry = { id: u.id, name: u.name, color: u.color };
  const ul = usersList;
  const li = document.createElement('li');
  li.className = 'userEntry';
  const dot = document.createElement('span');
  dot.className = 'colorDot';
  dot.style.background = entry.color;
  li.appendChild(dot);
  const txt = document.createElement('span');
  txt.textContent = entry.name;
  li.appendChild(txt);
  ul.appendChild(li);
});

ws.on('user_left', (socketId) => {
  // remove from usersList (simple approach: rebuild not available here)
  // for simplicity, request full user list via server later; here just show notification
  metrics.textContent = `User left: ${socketId}`;
});

ws.on('op_applied', ({ op }) => {
  // draw new op
  app.drawOp(op);
});

ws.on('op_removed', ({ opId }) => {
  // Simple approach: request full history (server could send history)
  // We'll ask server for initial state by reconnecting sequence: for demo, trigger a redraw by clearing and requesting history is not implemented.
  // Instead, for demo: request full history by rejoining room (cheap for prototype)
  ws.emit('join_room', { room: currentRoom, userName: nameInput.value || 'Anonymous' }, () => {});
});

ws.on('canvas_cleared', () => {
  app.redrawFromHistory([]);
});

// streaming segments from other clients
ws.on('stroke_segment', ({ segment, socketId }) => {
  // draw the segment temporarily using the provided tool/color/width
  app._drawSegment(segment.from, segment.to, segment.tool, segment.color, segment.width);
});

// cursor updates
ws.on('cursor_update', ({ socketId, x, y }) => {
  app.cursors.set(socketId, { x, y, color: '#666' });
  // a quick redraw of cursor markers after a short debounce
});

// user list initial update (server sends as part of init_state)
ws.on('init_state', (payload) => {
  if (payload.users) updateUsersList(payload.users);
});

// UI tool controls
toolSelect.addEventListener('change', (e) => {
  app.setTool(e.target.value);
});
colorPicker.addEventListener('change', (e) => {
  app.setColor(e.target.value);
});
widthRange.addEventListener('input', (e) => {
  app.setWidth(Number(e.target.value));
});

// canvas pointer events
let isPointerDown = false;
canvasEl.addEventListener('pointerdown', (e) => {
  if (!isJoined) { alert('Join a room first'); return; }
  isPointerDown = true;
  canvasEl.setPointerCapture(e.pointerId);
  const pos = { x: e.clientX - canvasEl.getBoundingClientRect().left, y: e.clientY - canvasEl.getBoundingClientRect().top };
  app.startFromPointer(pos);
});

canvasEl.addEventListener('pointermove', (e) => {
  const pos = { x: e.clientX - canvasEl.getBoundingClientRect().left, y: e.clientY - canvasEl.getBoundingClientRect().top };
  // send cursor position
  if (isJoined) {
    ws.emit('cursor_move', { room: currentRoom, x: pos.x, y: pos.y });
  }
  if (isPointerDown) {
    app.addPoint(pos);
  }
});

canvasEl.addEventListener('pointerup', (e) => {
  if (!isPointerDown) return;
  isPointerDown = false;
  const op = app.endStroke({ userId });
  if (op) {
    ws.emit('stroke', { room: currentRoom, op });
  }
});

// stream small segments for better live experience
app.onStreamSegment((segment) => {
  if (!isJoined) return;
  ws.emit('stroke_segment', { room: currentRoom, segment });
});

// undo/redo/clear buttons
undoBtn.addEventListener('click', () => {
  ws.emit('global_undo', { room: currentRoom });
});
redoBtn.addEventListener('click', () => {
  ws.emit('global_redo', { room: currentRoom });
});
clearBtn.addEventListener('click', () => {
  if (!confirm('Clear canvas for all users?')) return;
  ws.emit('clear_canvas', { room: currentRoom });
});

// keep a small heartbeat that requests a fresh history occasionally in a real app we would have specific messages
setInterval(() => {
  // metrics display
  metrics.textContent = `Socket: ${ws.socket.id || '—'} | Room: ${currentRoom} | Tool: ${toolSelect.value} | Color: ${colorPicker.value}`;
}, 2000);
