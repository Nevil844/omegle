// UserManager.ts
import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User {
    socket: Socket;
    name: string;
}

export class UserManager {
    private users: User[];
    private queue: string[];
    private roomManager: RoomManager;

    constructor() {
        this.users = [];
        this.queue = [];
        this.roomManager = new RoomManager();
    }

    addUser(name: string, socket: Socket) {
        this.users.push({ name, socket });
        this.queue.push(socket.id);
        socket.emit("lobby");
        this.clearQueue();
        this.initHandlers(socket);
    }

    removeUser(socketId: string) {
        const user = this.users.find(x => x.socket.id === socketId);

        if (user) {
            this.users = this.users.filter(x => x.socket.id !== socketId);
            this.queue = this.queue.filter(id => id !== socketId);
            console.log(`User removed: ${socketId}`);
        } else {
            console.error(`User not found: ${socketId}`);
        }
    }

    private clearQueue() {
        console.log("Inside clearQueue");
        console.log(`Queue length: ${this.queue.length}`);

        if (this.queue.length < 2) {
            return;
        }

        const id1 = this.queue.pop();
        const id2 = this.queue.pop();

        console.log(`Matching users: ${id1} and ${id2}`);

        const user1 = this.users.find(x => x.socket.id === id1);
        const user2 = this.users.find(x => x.socket.id === id2);

        if (!user1 || !user2) {
            console.error("Users not found in queue");
            return;
        }

        console.log("Creating room");
        this.roomManager.createRoom(user1, user2);
        this.clearQueue(); // In case there are more users in the queue
    }

    private initHandlers(socket: Socket) {
        socket.on("offer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
            this.roomManager.onOffer(roomId, sdp, socket.id);
        });

        socket.on("answer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        });

        socket.on("add-ice-candidate", ({ candidate, roomId, type }: { candidate: any; roomId: string; type: "sender" | "receiver" }) => {
            this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
        });

        socket.on("chat-message", ({ message, roomId }: { message: string; roomId: string }) => {
            this.roomManager.onChatMessage(roomId, socket.id, message);
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
            this.removeUser(socket.id);
        });
    }
}
