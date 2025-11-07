const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Rooms = require('./rooms');
const DrawingState = require('./drawing-state');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Serve client static files for quick demo
app.use('/', express.static(path.join(__dirname, '..', 'client')));

// In-memory store (rooms module wraps this)
const rooms = new Rooms(); // roomName -> { drawingState, users... }

io.on('connection', (socket) => {
  console.log('connected', socket.id);

  // client should emit join_room with {room, userName}
  socket.on('join_room', ({ room, userName }, cb) => {
    if (!room) room = 'default';
    socket.join(room);
    if (!rooms.has(room)) {
      rooms.create(room);
    }

    const userColor = rooms.addUser(room, socket.id, userName);
    const drawingState = rooms.getState(room);

    // send initial state and user list
    socket.emit('init_state', {
      history: drawingState.getHistory(), // array of ops
      users: rooms.getUsers(room),
      yourColor: userColor
    });

    socket.to(room).emit('user_joined', rooms.getUserInfo(room, socket.id));
    cb && cb({ ok: true });
  });

  socket.on('cursor_move', ({ room, x, y }) => {
    socket.to(room).emit('cursor_update', {
      socketId: socket.id,
      x, y
    });
  });

  // stroke events: we treat a stroke (from mouseDown to mouseUp) as a single operation
  socket.on('stroke', ({ room, op }) => {
    // op: { id, userId, type: 'stroke'|'erase', points: [...], color, width, timestamp }
    if (!rooms.has(room)) return;
    rooms.getState(room).pushOp(op);
    io.to(room).emit('op_applied', { op }); // broadcast to everyone
  });

  // batched partial stroke for real-time smoothing (client might stream small segments)
  socket.on('stroke_segment', ({ room, segment }) => {
    socket.to(room).emit('stroke_segment', { segment, socketId: socket.id });
  });

  // global undo: pops last op from history and broadcasts removal
  socket.on('global_undo', ({ room }) => {
    if (!rooms.has(room)) return;
    const removed = rooms.getState(room).popLastOp();
    if (removed) {
      io.to(room).emit('op_removed', { opId: removed.id });
    }
  });

  // global redo: reapply last-removed op (simple redo stack per room)
  socket.on('global_redo', ({ room }) => {
    if (!rooms.has(room)) return;
    const reapplied = rooms.getState(room).redoLast();
    if (reapplied) {
      io.to(room).emit('op_applied', { op: reapplied });
    }
  });

  // clear canvas
  socket.on('clear_canvas', ({ room }) => {
    if (!rooms.has(room)) return;
    rooms.getState(room).clear();
    io.to(room).emit('canvas_cleared');
  });

  // handle disconnect
  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    // find rooms the socket was in
    const leftRooms = rooms.removeUser(socket.id);
    leftRooms.forEach(r => {
      io.to(r).emit('user_left', socket.id);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0' ,() => console.log(`Server listening on ${PORT}`));
