const DrawingState = require('./drawing-state');

class Rooms {
  constructor() {
    this.map = new Map(); // roomName -> { drawingState, users: Map(socketId -> {name, color}) }
    this.colorPool = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe'];
  }

  has(room) {
    return this.map.has(room);
  }

  create(room) {
    this.map.set(room, {
      drawingState: new DrawingState(),
      users: new Map()
    });
  }

  getState(room) {
    return this.map.get(room).drawingState;
  }

  addUser(room, socketId, name='Anonymous') {
    if (!this.has(room)) this.create(room);
    const roomObj = this.map.get(room);
    // assign color (simple round-robin)
    const color = this.colorPool[(roomObj.users.size) % this.colorPool.length];
    roomObj.users.set(socketId, { name, color });
    return color;
  }

  getUsers(room) {
    const roomObj = this.map.get(room);
    if (!roomObj) return [];
    return Array.from(roomObj.users.entries()).map(([id, info]) => ({ id, ...info }));
  }

  getUserInfo(room, socketId) {
    const roomObj = this.map.get(room);
    if (!roomObj) return null;
    return { id: socketId, ...roomObj.users.get(socketId) };
  }

  removeUser(socketId) {
    const leftRooms = [];
    for (const [room, roomObj] of this.map.entries()) {
      if (roomObj.users.has(socketId)) {
        roomObj.users.delete(socketId);
        leftRooms.push(room);
      }
    }
    return leftRooms;
  }
}

module.exports = Rooms;
