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
let lastPollResults = null;

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
    maxSelections,
  };

  io.emit('newPoll', {
    id: currentPoll.id,
    question: currentPoll.question,
    options: Object.keys(currentPoll.options),
    maxSelections: currentPoll.maxSelections,
    durationSeconds,
  });

  if (pollTimer) clearTimeout(pollTimer);

  if (durationSeconds) {
    pollTimer = setTimeout(() => {
      endPoll();
    }, durationSeconds * 1000);
  }

  lastPollResults = null;
}

function endPoll() {
  if (currentPoll && currentPoll.isActive) {
    currentPoll.isActive = false;
    currentPoll.endTime = Date.now();

    lastPollResults = {
      question: currentPoll.question,
      options: currentPoll.options
    };

    io.emit('pollResults', currentPoll.options);
  }
}

io.on('connection', (socket) => {
  if (currentPoll && currentPoll.isActive) {
    socket.emit('newPoll', {
      id: currentPoll.id,
      question: currentPoll.question,
      options: Object.keys(currentPoll.options),
      maxSelections: currentPoll.maxSelections,
    });
  }

  if (lastPollResults) {
    socket.emit('pollResults', lastPollResults.options);
  }

  socket.on('vote', (selectedOptions) => {
    if (currentPoll && currentPoll.isActive) {
      selectedOptions.forEach((option) => {
        if (currentPoll.options[option] !== undefined) {
          currentPoll.options[option]++;
        }
      });
    }
  });

  socket.on('startNewPoll', ({ question, options, maxSelections, durationSeconds }) => {
    startPoll(question, options, maxSelections, durationSeconds);
  });

  socket.on('endPoll', () => {
    endPoll();
  });

  socket.on('hideResults', () => {
    lastPollResults = null;
    io.emit('hideResults');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
