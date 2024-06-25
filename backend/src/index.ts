import { Socket } from "socket.io";
import { createServer } from "http";
import express from 'express';
import { Server } from 'socket.io';
import { UserManager } from "./managers/UserManger";

// Create an instance of Express
const app = express();
const server = createServer(app);
const cors = require('cors');

// Configure CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
})

// Initialize Socket.io server with CORS configuration
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any origin
    methods: ['GET', 'POST'], // Allow these HTTP methods
    credentials: true // Allow sending credentials
  }
});

// Create an instance of UserManager
const userManager = new UserManager();

// Set up Socket.io connection event
io.on('connection', (socket: Socket) => {
  console.log('a user connected');
  userManager.addUser("randomName", socket);

  // Set up disconnection event
  socket.on("disconnect", () => {
    console.log("user disconnected");
    userManager.removeUser(socket.id);
  });
});

// Start the server and listen on port 3000
server.listen(3000, '0.0.0.0', () => {
  console.log('listening on *:3000');
});
