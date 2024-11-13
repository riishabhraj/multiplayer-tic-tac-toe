import React, { useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000';
const socket = io(URL);

export default function Home() {
    const [name, setName] = useState('');
    const [roomName, setRoomName] = useState('');
    const navigate = useNavigate();

    function playerNameHandler(e) {
        setName(e.target.value);
    }

    function roomNameHandler(e) {
        setRoomName(e.target.value);
    }

    function createRoomHandler(e) {
        e.preventDefault();
        
        if (name && roomName) {
            console.log(`Creating room: ${roomName} with socket ID: ${socket.id}`);
            socket.emit('create', { name, room: roomName });
            navigate('/game', { state: { name, roomName } });
        } else {
            alert("Please enter your name and room number.");
        }
    }

    function joinRoomHandler(e) {
        e.preventDefault();
        
        if (name && roomName) {
            console.log(`Joining room: ${roomName} with socket ID: ${socket.id}`);
            socket.emit('join', { name, room: roomName });
            navigate('/game', { state: { name, roomName } });
        } else {
            alert("Please enter your name and room number.");
        }
    }

    return (
        <>
            <h1>Multiplayer Tic Tac Toe Game</h1>
            <input type="text" value={name} onChange={playerNameHandler} placeholder='Enter your name...' required />
            <input type="text" value={roomName} onChange={roomNameHandler} placeholder='Enter room No...' required />
            <button onClick={createRoomHandler}>Create Room</button>
            <button onClick={joinRoomHandler}>Join Room</button>
        </>
    );
}