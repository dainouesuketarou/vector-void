import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Room state: { [roomName]: { players: [socketId, socketId], votes: { [socketId]: mapId }, ready: 0 } }
const rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (word) => {
        if (!word || word.length < 3) return;

        // Join or create room
        if (!rooms[word]) {
            rooms[word] = { players: [], votes: {} };
        }

        const room = rooms[word];
        
        if (room.players.length >= 2) {
            socket.emit('room_full');
            return;
        }

        room.players.push(socket.id);
        socket.join(word);

        // Assign role
        const role = room.players.length === 1 ? 1 : 2; // 1 = P1, 2 = P2
        socket.emit('player_joined', { role });

        console.log(`User ${socket.id} joined room ${word} as Player ${role}`);

        if (room.players.length === 2) {
            io.to(word).emit('opponent_found');
        }
    });

    socket.on('stage_vote', ({ word, mapId }) => {
        const room = rooms[word];
        if (!room) return;

        room.votes[socket.id] = mapId;

        // If both voted
        if (Object.keys(room.votes).length === 2) {
            const votes = Object.values(room.votes);
            // Randomly pick one
            const finalMapId = votes[Math.floor(Math.random() * votes.length)];
            const seed = Math.floor(Math.random() * 1000000);

            console.log(`Room ${word} starting with map ${finalMapId} and seed ${seed}`);
            io.to(word).emit('game_start', { mapId: finalMapId, seed });
        } else {
            socket.emit('waiting_for_opponent');
        }
    });

    socket.on('action', ({ word, type, data }) => {
    // Relay action to others in room (excluding sender)
    socket.to(word).emit('action', { type, data });
  });

  socket.on('reset_game', ({ word }) => {
    const room = rooms[word];
    if (!room) return;

    // Generate new seed for reset
    const newSeed = Math.floor(Math.random() * 1000000);
    
    console.log(`Room ${word} resetting with new seed ${newSeed}`);
    
    // Broadcast reset to both players
    io.to(word).emit('game_reset', { seed: newSeed });
  });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Cleanup rooms
        for (const word in rooms) {
            const room = rooms[word];
            if (room.players.includes(socket.id)) {
                io.to(word).emit('opponent_disconnected');
                delete rooms[word];
                break;
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
