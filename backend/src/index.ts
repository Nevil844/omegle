import { Socket } from "socket.io";
import { createServer } from "http";

import express from 'express';
import { Server } from 'socket.io';
import { UserManager } from "./managers/UserManger";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const userManager = new UserManager();

io.on('connection', (socket: Socket) => {
  console.log('a user connected');
  userManager.addUser("randomName", socket);
  socket.on("disconnect", () => {
    console.log("user disconnected");
    userManager.removeUser(socket.id);
  })
});

server.listen(3000,'0.0.0.0', () => {
    console.log('listening on *:3000');
});