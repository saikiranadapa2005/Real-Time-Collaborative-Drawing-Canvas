// A simple operation-based state manager.
// Stores a history stack and a redo stack. Each "op" represents one stroke or erase action.
// NOTE: All kept in memory; persistence is optional extension.

class DrawingState {
  constructor() {
    this.history = []; // array of ops {id, userId, type, points, color, width, timestamp}
    this.redoStack = [];
  }

  pushOp(op) {
    this.history.push(op);
    this.redoStack = []; // new action invalidates redo
  }

  getHistory() {
    return this.history.slice();
  }

  popLastOp() {
    const op = this.history.pop();
    if (op) {
      this.redoStack.push(op);
    }
    return op;
  }

  redoLast() {
    const op = this.redoStack.pop();
    if (op) {
      this.history.push(op);
    }
    return op;
  }

  clear() {
    this.history = [];
    this.redoStack = [];
  }
}

module.exports = DrawingState;
