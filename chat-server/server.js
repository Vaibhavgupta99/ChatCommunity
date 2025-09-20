const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let users = {}; // { socketId: username }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User joins chat
  socket.on("join", (username) => {
    users[socket.id] = username;

    // Notify everyone
    io.emit("chat-message", { text: `${username} joined the chat`, system: true });

    // Update active users
    io.emit("active-users", Object.values(users));
  });

  // Receive message
  socket.on("chat-message", ({ text }) => {
    const username = users[socket.id] || "Anonymous";
    io.emit("chat-message", { text, username });
  });

  // Typing indicator
  socket.on("typing", ({ typing }) => {
    const username = users[socket.id];
    if (!username) return;

    if (typing) {
      socket.broadcast.emit("typing", { username, typing: true });
    } else {
      socket.broadcast.emit("typing", { username, typing: false });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      io.emit("chat-message", { text: `${username} left the chat`, system: true });
      delete users[socket.id];
      io.emit("active-users", Object.values(users));
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

