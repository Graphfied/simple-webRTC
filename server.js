const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
        io.emit('user-disconnected', socket.id);
    });

    socket.on('offer', (offer, userId) => {
        socket.broadcast.emit('offer', offer, userId);
    });

    socket.on('answer', (answer, userId) => {
        socket.broadcast.emit('answer', answer, userId);
    });

    socket.on('candidate', (candidate, userId) => {
        socket.broadcast.emit('candidate', candidate, userId);
    });

    socket.on('speaking', (isSpeaking, userId) => {
        socket.broadcast.emit('speaking', { id: userId, isSpeaking });
    });

    socket.on('user-connected', (userId) => {
        io.emit('user-connected', userId);
    });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
