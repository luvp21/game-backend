const express = require('express');
const socketio = require('socket.io');
const app = express();
const cors = require('cors');

app.use(cors());

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const io = socketio(server, {
  cors: {
      origin: "https://game-frontend-eta.vercel.app",
      methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('joinRoom', ({ roomId, username }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        sequence: [],
        gameActive: false
      };
    }

    const player = {
      id: socket.id,
      username,
      ready: false,
      level: 1,
      score: 0
    };
    
    rooms[roomId].players.push(player);
    socket.join(roomId);
    
    console.log(`Player ${username} joined room ${roomId}`);
    io.to(roomId).emit('roomUpdate', rooms[roomId].players);
  });

  socket.on('toggleReady', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.ready = !player.ready;
    console.log(`Player ${player.username} ready: ${player.ready}`);

    // change it to 3

    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      console.log(`Starting game in room ${roomId}`);
      room.gameActive = true;
      room.players.forEach(p => {
        p.ready = false;
        p.level = 1;
        p.score = 0;
      });
      io.to(roomId).emit('gameStart');
    }

    io.to(roomId).emit('roomUpdate', room.players);
  });

  socket.on('levelUp', (roomId, level) => {
    const room = rooms[roomId];
    const player = room.players.find(p => p.id === socket.id);
    player.level = level;

    if (room.players.every(p => p.level > 3)) {
      io.to(roomId).emit('gameWin');
    }
  });

  socket.on('mistake', (roomId) => {
    const room = rooms[roomId];
    room.gameActive = false;
    io.to(roomId).emit('restartGame');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});