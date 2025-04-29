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
const pastPolls = [];

// Función para lanzar una nueva encuesta
function startPoll(question, options, maxSelections, durationSeconds) {
    currentPoll = {
        id: uuidv4(),
        question,
        options: options.reduce((acc, option) => {
            acc[option] = 0;
            return acc;
        }, {}),
        isActive: true,
        startTime: Date.now(),
        maxSelections
    };

    io.emit('newPoll', {
        id: currentPoll.id,
        question: currentPoll.question,
        options: Object.keys(currentPoll.options),
        maxSelections: currentPoll.maxSelections,
        durationSeconds
    });

    if (pollTimer) clearTimeout(pollTimer);

    if (durationSeconds) {
        pollTimer = setTimeout(() => {
            endPoll();
        }, durationSeconds * 1000);
    }
}

// Función para terminar la encuesta
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

// Configuración de sockets
io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

    // Si hay una encuesta activa, enviar
    if (currentPoll && currentPoll.isActive) {
        socket.emit('newPoll', {
            id: currentPoll.id,
            question: currentPoll.question,
            options: Object.keys(currentPoll.options),
            maxSelections: currentPoll.maxSelections
        });
    }

    // Recibir votos
    socket.on('vote', (selectedOptions) => {
        if (currentPoll && currentPoll.isActive) {
            selectedOptions.forEach(option => {
                if (currentPoll.options[option] !== undefined) {
                    currentPoll.options[option]++;
                }
            });
        }
    });

    // Recibir nueva encuesta
    socket.on('startNewPoll', ({ question, options, maxSelections, durationSeconds }) => {
        console.log('Nueva encuesta recibida en el servidor:', question, options, maxSelections);
        startPoll(question, options, maxSelections, durationSeconds);
    });

    // Finalizar encuesta
    socket.on('endPoll', () => {
        endPoll();
    });

    // Solicitar encuestas pasadas
    socket.on('getPastPolls', () => {
        socket.emit('pastPolls', pastPolls);
    });

    // Eliminar encuesta del historial
    socket.on('deletePoll', (pollId) => {
        const index = pastPolls.findIndex(p => p.id === pollId);
        if (index !== -1) {
            pastPolls.splice(index, 1);
            io.emit('pastPolls', pastPolls);
        }
    });

    // Ocultar resultados manualmente
    socket.on('hideResults', () => {
        io.emit('hideResults');
    });
});

// Puerto y arranque
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
