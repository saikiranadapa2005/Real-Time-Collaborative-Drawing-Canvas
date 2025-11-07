// canvas drawing logic + rendering of history operations
// Exposes CanvasApp class to control canvas
class CanvasApp {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.drawing = false;
    this.currentPath = [];
    this.tool = 'brush';
    this.color = '#000';
    this.width = 4;
    this.streamSegmentCallback = null;

    // map of remote cursors: socketId -> {x,y,color}
    this.cursors = new Map();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    // back high DPI
    this.canvas.width = Math.floor(w * this.devicePixelRatio);
    this.canvas.height = Math.floor(h * this.devicePixelRatio);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
    this.redrawRequested = true;
  }

  setTool(t) { this.tool = t; }
  setColor(c) { this.color = c; }
  setWidth(w) { this.width = w; }

  // transform client coordinates (page coords relative to canvas element)
  _toLocal(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    return { x, y };
  }

  startFromPointer(pos) {
    this.drawing = true;
    this.currentPath = [pos];
  }

  addPoint(pos) {
    if (!this.drawing) return;
    this.currentPath.push(pos);
    // draw incremental for immediate feedback
    this._drawSegment(this.currentPath[this.currentPath.length-2], pos, this.tool, this.color, this.width);
    // optionally stream small segments for realtime
    if (this.streamSegmentCallback) {
      this.streamSegmentCallback({ from: this.currentPath[this.currentPath.length-2], to: pos, tool: this.tool, color: this.color, width: this.width });
    }
  }

  endStroke(metadata) {
    if (!this.drawing) return null;
    this.drawing = false;
    const points = this.currentPath.slice();
    this.currentPath = [];
    // op id: timestamp + random
    const op = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
      userId: metadata.userId,
      type: (this.tool === 'eraser') ? 'erase' : 'stroke',
      points,
      color: this.color,
      width: this.width,
      timestamp: Date.now()
    };
    return op;
  }

  // drawing helpers
  _drawSegment(a, b, tool, color, width) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    if (tool === 'eraser') {
      // eraser is drawn as white stroke with composite operation to keep it simple
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  // draw a whole op (sequence of points)
  drawOp(op) {
    const pts = op.points;
    if (!pts || pts.length < 2) return;
    for (let i=1;i<pts.length;i++) {
      this._drawSegment(pts[i-1], pts[i], op.type === 'erase' ? 'eraser' : 'brush', op.color, op.width);
    }
  }

  // full redraw from history
  redrawFromHistory(history) {
    // clear
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.canvas.width/this.devicePixelRatio, this.canvas.height/this.devicePixelRatio);
    // replay ops in order
    for (const op of history) {
      this.drawOp(op);
    }
  }

  // render remote cursor positions
  renderCursors() {
    // overlay small circles on canvas using DOM overlay approach or direct canvas drawing on top
    // For simplicity, draw cursor markers on the canvas on top of content (they will be cleared on next redraw)
    // Save content by drawing cursors after everything
    const ctx = this.ctx;
    // We'll redraw cursors separately when needed
    for (const [id, cursor] of this.cursors.entries()) {
      if (!cursor.x && !cursor.y) continue;
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = cursor.color || '#000';
      ctx.globalAlpha = 0.9;
      ctx.arc(cursor.x, cursor.y, 6, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  // convenience: set callback for streaming small segments
  onStreamSegment(cb) { this.streamSegmentCallback = cb; }
}
