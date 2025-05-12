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
const secretArea = document.getElementById('secret-click-area');
const adminPanel = document.getElementById('admin-panel');
const adminLogin = document.getElementById('admin-login');
const adminActions = document.getElementById('admin-actions');
const adminLoginButton = document.getElementById('admin-login-button');

let countdownInterval = null;
const ADMIN_PASSWORD = "019143";
let currentPollId = null;
let maxSelectionsAllowed = 1;
let isAdmin = false;

adminLoginButton.addEventListener('click', () => {
  const password = document.getElementById('admin-password').value.trim();
  if (password === ADMIN_PASSWORD) {
    adminLogin.style.display = 'none';
    adminActions.style.display = 'block';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    isAdmin = true;
  } else {
    alert("Contraseña incorrecta.");
  }
});

adminForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const question = document.getElementById('new-question').value.trim();
  const options = document.getElementById('new-options').value.split(',').map(opt => opt.trim()).filter(opt => opt);
  const maxSelections = parseInt(document.getElementById('max-selections').value);
  const durationInput = document.getElementById('duration').value.trim();
  const duration = durationInput ? parseInt(durationInput) : null;

  const showDate = document.getElementById('show-date').value;
  const showTime = document.getElementById('show-time').value;
  let showAt = null;
  if (showDate && showTime) {
    showAt = new Date(`${showDate}T${showTime}`).getTime();
  }

  if (!question || options.length < 2 || isNaN(maxSelections) || maxSelections < 1) {
    alert("Rellena todos los campos correctamente.");
    return;
  }

  socket.emit('startNewPoll', {
    question,
    options,
    maxSelections,
    durationSeconds: duration,
    showAt
  });

  adminForm.reset();
});

endPollButton.addEventListener('click', () => {
  socket.emit('endPoll');
});

socket.on('newPoll', (data) => {
  currentPollId = data.id;
  maxSelectionsAllowed = data.maxSelections || 1;

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

socket.on('pollResults', (options) => {
  const resultBlock = document.createElement('div');
  resultBlock.className = 'result-block';

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
    resultBlock.appendChild(container);
  });

  if (isAdmin) {
    const hideButton = document.createElement('button');
    hideButton.className = 'hide-button';
    hideButton.textContent = 'Ocultar esta encuesta';
    hideButton.onclick = () => resultBlock.remove();
    resultBlock.appendChild(hideButton);
  }

  resultsContent.prepend(resultBlock);
});

function hideAllResults() {
  resultsContent.innerHTML = '';
}

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

let clickCount = 0;
let clickTimer = null;

secretArea.addEventListener('click', () => {
  clickCount++;
  if (clickCount === 5) {
    adminPanel.style.display = 'block';
    adminLogin.style.display = 'block';
    adminActions.style.display = 'none';
    clickCount = 0;
    clearTimeout(clickTimer);
  } else {
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, 1000);
  }
});
