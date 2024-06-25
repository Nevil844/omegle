import { Socket } from "socket.io";
import { createServer } from "http";
import express from 'express';
import { Server } from 'socket.io';
import { UserManager } from "./managers/UserManger";
import cors from 'cors';  // Import cors as an ES module

// Create an instance of Express
const app = express();
const server = createServer(app);

// Use cors middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT"],
  allowedHeaders: ["Content-Type"]
}));

// Initialize Socket.io server with CORS configuration
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Create an instance of UserManager
const userManager = new UserManager();

// Set up Socket.io connection event
io.on('connection', (socket: Socket) => {
  console.log('a user connected', socket.id);
  userManager.addUser("randomName", socket);

  // Set up disconnection event
  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    userManager.removeUser(socket.id);
  });

  // Add more socket event handlers here as needed
  // For example:
  socket.on("offer", (data) => {
    console.log("Received offer", data);
    // Handle offer
  });

  socket.on("answer", (data) => {
    console.log("Received answer", data);
    // Handle answer
  });

  socket.on("ice-candidate", (data) => {
    console.log("Received ICE candidate", data);
    // Handle ICE candidate
  });
});

// Start the server and listen on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});