const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});

const rooms = {}
const games = {}

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`)

    socket.on("create", ({ name, room }) => {
        // Check if the room already exists, if not, create a new room
        if (!games[room]) {
            // Initialize the game state for the new room
            games[room] = {
                board: Array(9).fill(null), // Empty board at the start
                currentPlayer: "X", // Player X always starts
                players: [socket.id], // Store socket ID to track players
                playerNames: { [socket.id]: name }, // Map socket ID to player names
            };

            // Add the current player to the room
            socket.join(room);

            // Emit a message back to the creator
            socket.emit('message', `Room created: Waiting for the opponent...`);
            console.log(`Room ${room} created by ${name}`);
        } else {
            // If room already exists, inform the creator and do not allow the room creation again
            socket.emit('message', `Room ${room} already exists!`);
        }
    });


    socket.on("join", ({ name, room }) => {
        const game = games[room];

        if (game && game.players.length < 2) {
            // Add the second player's name to the game state
            game.players.push(socket.id); // Store the socket ID of the second player
            game.playerNames[socket.id] = name; // Map the socket ID to the player's name

            socket.join(room); // Join the room

            // Emit the current game state to both players
            io.to(room).emit("startGame", { currentPlayer: game.currentPlayer });
            console.log(`${name} joined room: ${room}`);

            // Update the game state to the next player's turn
            game.currentPlayer = game.currentPlayer === "X" ? "O" : "X"; // Switch to the next player
        } else {
            socket.emit("error", "Room is full or doesn't exist");
        }
    });


    socket.on("makeMove", ({ room, index }) => {
        const game = games[room]; // Find the game state for the room

        // If the game exists and it's the player's turn
        if (game && game.board[index] === null) {
            game.board[index] = game.currentPlayer; // Make the move
            const nextPlayer = game.currentPlayer === "X" ? "O" : "X";
            game.currentPlayer = nextPlayer; // Switch player

            // Emit updated board state and the next player's turn
            io.to(room).emit("updateBoard", {
                board: game.board,
                nextPlayer,
            });
        }
    });

    socket.on("gameOver", ({ room, winner }) => {
        const game = games[room]; // Find the game state for the room

        // If the game exists
        if (game) {
            // Emit the game over event to the room with winner information
            io.to(room).emit("gameOver", { winner });

            // Clean up the game from the server's state (remove the room)
            delete games[room];

            console.log(`Game over in room ${room}. Winner: ${winner ? winner : "Draw"}`);
        }
    });


    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// Start the server
server.listen(3000, () => {
    console.log('listening on PORT: 3000');
});