const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// rooms structure: { roomId: { users: {socketId: username}, messages: [] } }
let rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join room
  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = { users: {}, messages: [] };
    }

    rooms[roomId].users[socket.id] = username;

    // Notify others in room
    socket.to(roomId).emit("chat-message", { text: `${username} joined the chat`, system: true });

    // Update active users
    io.to(roomId).emit("active-users", Object.values(rooms[roomId].users));
  });

  // Receive message
  socket.on("chat-message", ({ roomId, text }) => {
    const username = rooms[roomId]?.users[socket.id] || "Anonymous";
    const messageData = { text, username };

    // Only store in room messages for reference if needed
    rooms[roomId].messages.push(messageData);

    // Broadcast to room
    io.to(roomId).emit("chat-message", messageData);
  });

  // Typing
  socket.on("typing", ({ roomId }) => {
    const username = rooms[roomId]?.users[socket.id];
    if (username) {
      socket.to(roomId).emit("typing", { username });
    }
  });

  // Disconnect
  socket.on("disconnecting", () => {
    const roomsJoined = Object.keys(socket.rooms).filter(r => r !== socket.id);
    roomsJoined.forEach(roomId => {
      const username = rooms[roomId]?.users[socket.id];
      if (username) {
        socket.to(roomId).emit("chat-message", { text: `${username} left the chat`, system: true });
        delete rooms[roomId].users[socket.id];

        // Update active users
        io.to(roomId).emit("active-users", Object.values(rooms[roomId].users));

        // Destroy room if empty
        if (Object.keys(rooms[roomId].users).length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} destroyed`);
        }
      }
    });
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Chat server running on port ${PORT}`));
