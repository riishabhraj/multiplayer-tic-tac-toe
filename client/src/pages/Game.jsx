import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import calculateWinner from "../utils/calculateWinner";
import { useLocation } from "react-router-dom";

// Connect to the server
const URL = process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";
const socket = io(URL);

function Square({ value, onSquareClick }) {
    return (
        <button className="square" onClick={onSquareClick}>
            {value}
        </button>
    );
}

function Board({ squares, onSquareClick }) {
    return (
        <div className="board">
            {squares.map((value, index) => (
                <Square key={index} value={value} onSquareClick={() => onSquareClick(index)} />
            ))}
        </div>
    );
}

export default function Game() {
    const [squares, setSquares] = useState(Array(9).fill(null));
    const [xIsNext, setXIsNext] = useState(true);
    const [myPlayer, setMyPlayer] = useState(null); // Will be either "X" or "O"
    const [status, setStatus] = useState("Waiting for opponent...");
    const [gameOver, setGameOver] = useState(false);
    const location = useLocation();

    // Log location state for debugging
    console.log("Location state:", location.state);

    const { name, roomName } = location.state || {}; // Default to empty object to avoid errors

    useEffect(() => {
        if (!name || !roomName) {
            console.error("No name or room name provided!");
            return;
        }

        console.log(`${name} is trying to join room: ${roomName}`);
        socket.emit('join', { name, room: roomName });

        // Start game and assign player symbol (X or O)
        socket.on("startGame", ({ currentPlayer }) => {
            setMyPlayer(currentPlayer);
            setXIsNext(currentPlayer === "X");
            setStatus(currentPlayer === "X" ? "Your turn" : "Waiting for opponent...");
        });

        // Update board with opponent's move
        socket.on("updateBoard", ({ board, nextPlayer }) => {
            setSquares(board);
            setXIsNext(nextPlayer === "X");
            setStatus(nextPlayer === myPlayer ? "Your turn" : "Waiting for opponent...");
        });

        // Display game over and winner
        socket.on("gameOver", ({ winner }) => {
            setStatus(winner ? `Winner: ${winner}` : "It's a draw!");
            setGameOver(true);
        });

        // Handle opponent disconnection
        socket.on("opponentDisconnected", () => {
            setStatus("Opponent disconnected. Game over.");
            setGameOver(true);
        });

        return () => {
            socket.off("startGame");
            socket.off("updateBoard");
            socket.off("gameOver");
            socket.off("opponentDisconnected");
        };
    }, [myPlayer, name, roomName]);

    // Handle click event to make a move
    function handleClick(i) {
        if (gameOver || squares[i] || xIsNext !== (myPlayer === "X")) {
            return;
        }

        const nextSquares = squares.slice();
        nextSquares[i] = myPlayer;
        setSquares(nextSquares);
        setXIsNext(!xIsNext);
        setStatus("Waiting for opponent...");

        // Emit move to server
        socket.emit("makeMove", { room: roomName, index: i });

        // Check for winner locally after making move
        const winner = calculateWinner(nextSquares);

        if (winner) {
            setStatus(`Winner: ${winner}`);
            setGameOver(true);
            socket.emit("gameOver", { room: roomName, winner });
        } else if (!nextSquares.includes(null)) {
            setStatus("It's a draw!");
            setGameOver(true);
            socket.emit("gameOver", { room: roomName, winner: null });
        }
    }

    return (
        <div className="game">
            <div className="status">{status}</div>
            <div className="game-board">
                <Board squares={squares} onSquareClick={handleClick} />
            </div>
        </div>
    );
}