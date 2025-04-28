const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let currentPoll = null;
let pollTimer = null;

app.use(express.static('public'));

function startPoll(question, options, durationSeconds) {
    currentPoll = {
        id: uuidv4(),
        question,
        options: options.reduce((acc, option) => { acc[option] = 0; return acc; }, {}),
        isActive: true
    };
    io.emit('newPoll', {
        id: currentPoll.id,
        question,
        options: Object.keys(currentPoll.options),
        durationSeconds
    });

    if (pollTimer) clearTimeout(pollTimer);

    if (durationSeconds) {
        pollTimer = setTimeout(() => {
            endPoll();
        }, durationSeconds * 1000);
    }
}

function endPoll() {
    if (currentPoll && currentPoll.isActive) {
        currentPoll.isActive = false;
        io.emit('pollResults', currentPoll.options);
    }
}

io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

    if (currentPoll && currentPoll.isActive) {
        socket.emit('newPoll', {
            id: currentPoll.id,
            question: currentPoll.question,
            options: Object.keys(currentPoll.options)
        });
    }

    socket.on('vote', (option) => {
        if (currentPoll && currentPoll.isActive && currentPoll.options[option] !== undefined) {
            currentPoll.options[option]++;
        }
    });

    socket.on('endPoll', () => {
        endPoll();
    });

    socket.on('startNewPoll', ({ question, options, durationSeconds }) => {
        startPoll(question, options, durationSeconds);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
