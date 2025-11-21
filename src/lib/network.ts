import { io, Socket } from 'socket.io-client';

class NetworkManager {
    socket: Socket | null = null;
    
    connect() {
        if (!this.socket) {
            const url = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
            this.socket = io(url);
        }
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket() {
        return this.socket;
    }
}

export const network = new NetworkManager();
