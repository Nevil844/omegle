// RoomManager.ts
import { User } from "./UserManger";

let GLOBAL_ROOM_ID = 1;

interface Room {
    user1: User;
    user2: User;
}

export class RoomManager {
    private rooms: Map<string, Room>;

    constructor() {
        this.rooms = new Map<string, Room>();
    }

    createRoom(user1: User, user2: User) {
        const roomId = this.generateRoomId().toString();
        this.rooms.set(roomId, { user1, user2 });

        user1.socket.emit("send-offer", { roomId });
        user2.socket.emit("send-offer", { roomId });
    }

    onOffer(roomId: string, sdp: string, senderSocketId: string) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found: ${roomId}`);
            return;
        }

        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        receivingUser.socket.emit("offer", { sdp, roomId });
    }

    onAnswer(roomId: string, sdp: string, senderSocketId: string) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found: ${roomId}`);
            return;
        }

        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        receivingUser.socket.emit("answer", { sdp, roomId });
    }

    onIceCandidates(roomId: string, senderSocketId: string, candidate: any, type: "sender" | "receiver") {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found: ${roomId}`);
            return;
        }

        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        receivingUser.socket.emit("add-ice-candidate", { candidate, type });
    }

    onChatMessage(roomId: string, senderSocketId: string, message: string) {
        const room = this.rooms.get(roomId);
        if (!room) {
            console.error(`Room not found: ${roomId}`);
            return;
        }

        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        receivingUser.socket.emit("chat-message", { sender: senderSocketId, message, roomId });
    }

    private generateRoomId(): number {
        return GLOBAL_ROOM_ID++;
    }
}
