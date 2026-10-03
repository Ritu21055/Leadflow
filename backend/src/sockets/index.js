const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const clientOrigin = require('../config/clientOrigin');

function attachSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: clientOrigin(),
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token) {
      next(new Error('Login required'));
      return;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        userId: payload.userId,
        role: payload.role,
        brokerageId: payload.brokerageId || null,
      };
      next();
    } catch (error) {
      next(new Error('Login expired or invalid'));
    }
  });

  io.on('connection', (socket) => {
    if (!socket.user.brokerageId) {
      return;
    }

    socket.join(`brokerage:${socket.user.brokerageId}`);

    if (socket.user.role === 'brokerage_admin' || socket.user.role === 'advisor') {
      socket.join(`brokerage:${socket.user.brokerageId}:tasks`);
    }
  });

  return io;
}

module.exports = attachSockets;
