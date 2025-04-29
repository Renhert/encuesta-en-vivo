const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let currentPoll = null;
let pollTimer = null;
const pastPolls = []; // Guardar historial de encuestas

// Crear una nueva encuesta
function startPoll(question, options, durationSeconds) {
    currentPoll = {
        id: uuidv4(),
        question,
        options: options.reduce((acc, option) => {
            acc[option] = 0;
            return acc;
        }, {}),
        isActive: true,
        startTime: Date.now(),
    };

    io.emit('newPoll', {
        id: currentPoll.id,
        question: currentPoll.question,
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

// Terminar encuesta
function endPoll() {
    if (currentPoll && currentPoll.isActive) {
        currentPoll.isActive = false;
        currentPoll.endTime = Date.now();
        pastPolls.push({
            id: currentPoll.id,
            question: currentPoll.question,
            options: currentPoll.options,
            endTime: currentPoll.endTime
        });
        io.emit('pollResults', currentPoll.options);
    }
}

// Socket.io eventos
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

    socket.on('getPastPolls', () => {
        socket.emit('pastPolls', pastPolls);
    });

    socket.on('deletePoll', (pollId) => {
        const index = pastPolls.findIndex(p => p.id === pollId);
        if (index !== -1) {
            pastPolls.splice(index, 1);
            io.emit('pastPolls', pastPolls);
        }
    });

    socket.on('hideResults', () => {
        io.emit('hideResults');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
