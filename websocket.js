// tiny wrapper around socket.io client (exposes global "WS")
(() => {
  const socket = io(); // default connect
  window.WS = {
    socket,
    on: (ev, cb) => socket.on(ev, cb),
    emit: (ev, data, cb) => socket.emit(ev, data, cb)
  };
})();
