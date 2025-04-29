const socket = io();

const pollSection = document.getElementById('poll-section');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const maxSelectionInfo = document.getElementById('max-selection-info');
const timerEl = document.getElementById('timer');
const resultsEl = document.getElementById('results');
const resultsContent = document.getElementById('results-content');
const adminForm = document.getElementById('admin-form');
const endPollButton = document.getElementById('end-poll-button');
const hideResultsButton = document.getElementById('hide-results-button');
const secretArea = document.getElementById('secret-click-area');
const adminPanel = document.getElementById('admin-panel');
const pastPollsDiv = document.getElementById('past-polls');

let countdownInterval = null;
const ADMIN_PASSWORD = "019143";
let currentPollId = null;
let maxSelectionsAllowed = 1;
let resultsTimeout = null;

// Mostrar encuesta activa
socket.on('newPoll', (data) => {
  currentPollId = data.id;
  maxSelectionsAllowed = data.maxSelections || 1;

  resultsEl.style.display = 'none';
  pollSection.style.display = 'block';
  questionEl.textContent = data.question;
  optionsEl.innerHTML = '';
  maxSelectionInfo.textContent = `Puedes seleccionar hasta ${maxSelectionsAllowed} opciones`;

  const alreadyVoted = localStorage.getItem('pollVoted_' + currentPollId);

  data.options.forEach(option => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" name="option" value="${option}" ${alreadyVoted ? "disabled" : ""}> ${option}`;
    optionsEl.appendChild(label);
    optionsEl.appendChild(document.createElement('br'));
  });

  const voteButton = document.createElement('button');
  voteButton.textContent = 'Votar';
  voteButton.disabled = alreadyVoted !== null;
  voteButton.onclick = () => {
    const selected = Array.from(document.querySelectorAll('input[name="option"]:checked')).map(cb => cb.value);
    if (selected.length === 0) {
      alert('Debes seleccionar al menos una opción.');
      return;
    }
    if (selected.length > maxSelectionsAllowed) {
      alert(`Sólo puedes seleccionar hasta ${maxSelectionsAllowed} opciones.`);
      return;
    }
    socket.emit('vote', selected);
    localStorage.setItem('pollVoted_' + currentPollId, 'true');
    disableOptions();
    alert('¡Gracias por tu voto!');
  };
  optionsEl.appendChild(voteButton);

  if (data.durationSeconds) {
    startCountdown(data.durationSeconds);
  } else {
    timerEl.textContent = '';
  }
});

// Mostrar resultados
socket.on('pollResults', (options) => {
  pollSection.style.display = 'none';
  resultsEl.style.display = 'block';
  resultsContent.innerHTML = '';

  const totalVotes = Object.values(options).reduce((acc, votes) => acc + votes, 0) || 1;

  Object.entries(options).forEach(([option, count]) => {
    const percentage = ((count / totalVotes) * 100).toFixed(1);

    const container = document.createElement('div');
    container.className = 'result-bar-container';

    const label = document.createElement('div');
    label.className = 'result-label';
    label.textContent = `${option}: ${count} votos (${percentage}%)`;

    const bar = document.createElement('div');
    bar.className = 'result-bar';
    bar.style.backgroundColor = randomColor();
    setTimeout(() => {
      bar.style.width = `${percentage}%`;
    }, 100);

    container.appendChild(label);
    container.appendChild(bar);
    resultsContent.appendChild(container);
  });

  startResultsTimeout();
});

function randomColor() {
  const colors = ['#FF5733', '#33B5FF', '#8D33FF', '#33FF57', '#FFC133', '#FF33A8', '#33FFF2', '#FF3333'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function disableOptions() {
  const checkboxes = document.querySelectorAll('input[name="option"]');
  checkboxes.forEach(cb => cb.disabled = true);
  const button = document.querySelector('button');
  if (button) button.disabled = true;
}

function startCountdown(seconds) {
  clearInterval(countdownInterval);
  let remaining = seconds;
  timerEl.textContent = `Tiempo restante: ${remaining} segundos`;

  countdownInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      timerEl.textContent = '';
    } else {
      timerEl.textContent = `Tiempo restante: ${remaining} segundos`;
    }
  }, 1000);
}

function startResultsTimeout() {
  clearTimeout(resultsTimeout);
  resultsTimeout = setTimeout(() => {
    resultsEl.style.display = 'none';
  }, 30 * 60 * 1000);
}

// Panel secreto admin
let clickCount = 0;
let clickTimer = null;

secretArea.addEventListener('click', () => {
  clickCount++;
  if (clickCount === 5) {
    adminPanel.style.display = 'block';
    socket.emit('getPastPolls');
    clickCount = 0;
    clearTimeout(clickTimer);
  } else {
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, 1000);
  }
});

// Historial
socket.on('pastPolls', (polls) => {
  pastPollsDiv.innerHTML = '';

  polls.forEach(poll => {
    const pollDiv = document.createElement('div');
    const date = new Date(poll.endTime).toLocaleString();
    pollDiv.innerHTML = `<strong>${poll.question}</strong><br>${Object.entries(poll.options).map(([opt, count]) => `${opt}: ${count} votos`).join('<br>')}<br><small>Finalizada el ${date}</small><br><button onclick="deletePoll('${poll.id}')">Eliminar</button><hr>`;
    pastPollsDiv.appendChild(pollDiv);
  });
});

function deletePoll(pollId) {
  const confirmDelete = confirm("¿Estás seguro de que quieres eliminar esta encuesta?");
  if (confirmDelete) {
    socket.emit('deletePoll', pollId);
  }
}

socket.on('hideResults', () => {
  resultsEl.style.display = 'none';
});
