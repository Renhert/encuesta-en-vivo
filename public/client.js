const socket = io({ transports: ['polling'] });

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
// Panel secreto admin (clic 5 veces en #secret-click-area)
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
    }, 1000); // Reset si no haces los 5 clics seguidos rápido
  }
});
const pastPollsDiv = document.getElementById('past-polls');

let countdownInterval = null;
const ADMIN_PASSWORD = "019143";
let currentPollId = null;
let maxSelectionsAllowed = 1;
let resultsTimeout = null;

adminForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const password = document.getElementById('admin-password').value;
  const question = document.getElementById('new-question').value.trim();
  const options = document.getElementById('new-options').value.split(',').map(opt => opt.trim()).filter(opt => opt);
  const maxSelections = parseInt(document.getElementById('max-selections').value);
  const duration = parseInt(document.getElementById('duration').value) || null;

  if (password !== ADMIN_PASSWORD) {
    alert("Contraseña incorrecta.");
    return;
  }

  if (!question || options.length < 2 || !maxSelections || maxSelections < 1) {
    alert("Rellena todos los campos correctamente.");
    return;
  }

  socket.emit('startNewPoll', { question, options, maxSelections, durationSeconds: duration });
  adminForm.reset();
});

endPollButton.addEventListener('click', () => {
  socket.emit('endPoll');
});

hideResultsButton.addEventListener('click', () => {
  socket.emit('hideResults');
});

// Resto del código igual (omitido para espacio y claridad)
