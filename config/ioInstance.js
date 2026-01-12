// Shared module to store Socket.io instance
let ioInstance = null;

function setIO(io) {
  ioInstance = io;
  console.log('✅ Socket.io instance set for controllers');
}

function getIO() {
  return ioInstance;
}

module.exports = { setIO, getIO };
