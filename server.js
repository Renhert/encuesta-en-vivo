// server.js
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
const pastPolls = [];

function startPoll(question, options, maxSelections, durationSeconds, showAt) {
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
    showAt
  };

  io.emit('newPoll', {
    id: currentPoll.id,
    question: currentPoll.question,
    options: Object.keys(currentPoll.options),
    maxSelections: currentPoll.maxSelections,
    durationSeconds,
    showAt
  });

  if (pollTimer) clearTimeout(pollTimer);

  if (durationSeconds) {
    pollTimer = setTimeout(() => {
      endPoll();
    }, durationSeconds * 1000);
  } else if (showAt && showAt > Date.now()) {
    const delay = showAt - Date.now();
    pollTimer = setTimeout(() => {
      endPoll();
    }, delay);
  }

  lastPollResults = null;
}

function endPoll() {
  if (currentPoll && currentPoll.isActive) {
    currentPoll.isActive = false;
    currentPoll.endTime = Date.now();
    pastPolls.push({
      id: currentPoll.id,
      question: currentPoll.question,
      options: currentPoll.options,
      endTime: currentPoll.endTime,
    });

    lastPollResults = {
      question: currentPoll.question,
      options: currentPoll.options
    };

    io.emit('pollResults', currentPoll.options);

    setTimeout(() => {
      if (lastPollResults) {
        lastPollResults = null;
      }
    }, 30 * 60 * 1000);
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
  } else if (lastPollResults) {
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

  socket.on('startNewPoll', ({ question, options, maxSelections, durationSeconds, showAt }) => {
    startPoll(question, options, maxSelections, durationSeconds, showAt);
  });

  socket.on('endPoll', () => {
    endPoll();
  });

  socket.on('getPastPolls', () => {
    socket.emit('pastPolls', pastPolls);
  });

  socket.on('deletePoll', (pollId) => {
    const index = pastPolls.findIndex((p) => p.id === pollId);
    if (index !== -1) {
      pastPolls.splice(index, 1);
      io.emit('pastPolls', pastPolls);
    }
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
