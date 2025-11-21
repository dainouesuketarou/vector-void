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
            rooms[word] = { 
                players: [], 
                votes: {},
                characterVotes: {}, // Store character selections
                playerRoles: {} // Map socket.id to role (1 or 2)
            };
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
        room.playerRoles[socket.id] = role; // Store role mapping
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
            room.seed = seed; // Store seed in room
            room.mapId = finalMapId; // Store map ID
            room.rematchState = { // Initialize rematch state
                player1Ready: false,
                player2Ready: false,
                processing: false
            };

            console.log(`Room ${word} starting with map ${finalMapId} and seed ${seed}`);
            // Emit stage_selected instead of game_start to avoid conflict with character selection
            io.to(word).emit('stage_selected', { mapId: finalMapId, seed });
        } else {
            socket.emit('waiting_for_opponent');
        }
    });

    socket.on('character_vote', ({ word, character, playerId }) => {
        const room = rooms[word];
        if (!room) return;

        // Store character selection by player role
        room.characterVotes[socket.id] = { character, playerId };

        console.log(`Room ${word} - Player ${playerId} selected ${character}`);

        // If both players have selected characters
        if (Object.keys(room.characterVotes).length === 2) {
            // Extract characters based on player roles
            let p1Character, p2Character;
            
            for (const socketId in room.characterVotes) {
                const vote = room.characterVotes[socketId];
                if (vote.playerId === 1) {
                    p1Character = vote.character;
                } else {
                    p2Character = vote.character;
                }
            }

            console.log(`Room ${word} both characters selected - P1: ${p1Character}, P2: ${p2Character}`);
            
            // Emit game_start with all necessary data
            io.to(word).emit('game_start', { 
                mapId: room.mapId, 
                seed: room.seed,
                p1Character,
                p2Character
            });

            // Clear character votes for potential rematch
            room.characterVotes = {};
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
    
    // Reset rematch state as well
    if (room.rematchState) {
      room.rematchState = {
        player1Ready: false,
        player2Ready: false,
        processing:false
      };
    }
    
    // Broadcast reset to both players
    io.to(word).emit('game_reset', { seed: newSeed });
  });

  // Rematch request handler
  socket.on('rematch_request', ({ word }) => {
    const room = rooms[word];
    if (!room || !room.rematchState) return;

    // Prevent race conditions with processing lock
    if (room.rematchState.processing) {
      console.log(`Room ${word} already processing rematch`);
      return;
    }

    room.rematchState.processing = true;

    // Get the role of this player (1 or 2)
    const playerRole = room.playerRoles[socket.id];
    if (!playerRole) {
      console.log(`Room ${word} - Player role not found for ${socket.id}`);
      room.rematchState.processing = false;
      return;
    }

    // Mark player as ready based on their role
    if (playerRole === 1) {
      room.rematchState.player1Ready = true;
    } else {
      room.rematchState.player2Ready = true;
    }

    console.log(`Room ${word} - Player ${playerRole} ready for rematch (${socket.id})`);

    // Check if both players are ready
    if (room.rematchState.player1Ready && room.rematchState.player2Ready) {
      // Both ready - start new game
      const newSeed = Math.floor(Math.random() * 1000000);
      console.log(`Room ${word} - Both players ready, starting rematch with seed ${newSeed}`);
      
      // Reset rematch state
      room.rematchState = {
        player1Ready: false,
        player2Ready: false,
        processing: false
      };

      // Broadcast rematch start
      io.to(word).emit('rematch_start', { seed: newSeed });
    } else {
      // Still waiting for other player - only send to requesting player
      socket.emit('rematch_waiting', {
        player1Ready: room.rematchState.player1Ready,
        player2Ready: room.rematchState.player2Ready
      });
      
      // Notify the OTHER player that opponent is waiting
      // Find the other player's socket ID
      const otherSocketId = room.players.find(id => id !== socket.id);
      if (otherSocketId) {
        io.to(otherSocketId).emit('opponent_waiting_rematch', {
          player1Ready: room.rematchState.player1Ready,
          player2Ready: room.rematchState.player2Ready
        });
      }
      
      room.rematchState.processing = false;
    }
  });

  // Menu request handler (cancels rematch)
  socket.on('menu_request', ({ word }) => {
    const room = rooms[word];
    if (!room) return;

    console.log(`Room ${word} - Player requesting menu, cancelling rematch`);

    // Reset rematch state
    if (room.rematchState) {
      room.rematchState = {
        player1Ready: false,
        player2Ready: false,
        processing: false
      };
    }

    // Notify all players that rematch was cancelled
    io.to(word).emit('rematch_cancelled');
  });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Cleanup rooms
        for (const word in rooms) {
            const room = rooms[word];
            if (room.players.includes(socket.id)) {
                // Cancel any pending rematch
                if (room.rematchState) {
                    io.to(word).emit('rematch_cancelled');
                }
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
