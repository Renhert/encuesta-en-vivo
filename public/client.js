const socket = io();

const pollSection = document.getElementById('poll-section');
const resultsEl = document.getElementById('results');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const resultsContent = document.getElementById('results-content');
const adminPanel = document.getElementById('admin-panel');
const adminLogin = document.getElementById('admin-login');
const adminActions = document.getElementById('admin-actions');

let currentPollId = null;

const secretArea = document.getElementById('secret-click-area');
let clickCount = 0;
let clickTimer = null;

secretArea.addEventListener('click', () => {
  clickCount++;
  if (clickCount === 5) {
    adminPanel.style.display = 'block';
    adminLogin.style.display = 'block';
    adminActions.style.display = 'none';
    clickCount = 0;
  }
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => (clickCount = 0), 1000);
});

document.getElementById('admin-login-button').addEventListener('click', () => {
  const password = document.getElementById('admin-password').value;
  if (password === '019143') {
    adminLogin.style.display = 'none';
    adminActions.style.display = 'block';
  } else {
    alert('Contraseña incorrecta');
  }
});

document.getElementById('admin-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const question = document.getElementById('new-question').value.trim();
  const options = document.getElementById('new-options').value.split(',').map(o => o.trim());
  const max = parseInt(document.getElementById('max-selections').value);
  const duration = parseInt(document.getElementById('duration').value) || null;
  const date = document.getElementById('show-date').value;
  const time = document.getElementById('show-time').value;
  const showAt = date && time ? new Date(`${date}T${time}`).getTime() : null;

  socket.emit('startNewPoll', { question, options, maxSelections: max, durationSeconds: duration, showAt });
  e.target.reset();
});

document.getElementById('end-poll-button').addEventListener('click', () => {
  socket.emit('endPoll');
});

document.getElementById('hide-results-button').addEventListener('click', () => {
  socket.emit('hideResults');
});

socket.on('newPoll', (data) => {
  currentPollId = data.id;
  pollSection.style.display = 'block';
  resultsEl.style.display = 'none';
  questionEl.textContent = data.question;
  optionsEl.innerHTML = '';
  document.getElementById('max-selection-info').textContent = `Puedes seleccionar hasta ${data.maxSelections} opciones`;

  const alreadyVoted = localStorage.getItem('pollVoted_' + currentPollId);

  data.options.forEach(option => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" name="option" value="${option}" ${alreadyVoted ? 'disabled' : ''}/> ${option}`;
    optionsEl.appendChild(label);
    optionsEl.appendChild(document.createElement('br'));
  });

  const button = document.createElement('button');
  button.textContent = 'Votar';
  button.disabled = alreadyVoted;
  button.onclick = () => {
    const selected = Array.from(document.querySelectorAll('input[name="option"]:checked')).map(cb => cb.value);
    if (selected.length === 0) return alert("Selecciona al menos una opción");
    if (selected.length > data.maxSelections) return alert("Demasiadas opciones");

    socket.emit('vote', selected);
    localStorage.setItem('pollVoted_' + currentPollId, 'true');
    disableOptions();
  };
  optionsEl.appendChild(button);
});

socket.on('pollResults', (options) => {
  pollSection.style.display = 'none';
  resultsEl.style.display = 'block';
  resultsContent.innerHTML = '';

  const total = Object.values(options).reduce((a, b) => a + b, 0) || 1;
  Object.entries(options).forEach(([opt, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    const container = document.createElement('div');
    container.className = 'result-bar-container';

    const label = document.createElement('div');
    label.className = 'result-label';
    label.textContent = `${opt}: ${count} votos (${pct}%)`;

    const bar = document.createElement('div');
    bar.className = 'result-bar';
    setTimeout(() => bar.style.width = `${pct}%`, 100);

    container.appendChild(label);
    container.appendChild(bar);
    resultsContent.appendChild(container);
  });
});

socket.on('hideResults', () => {
  resultsEl.style.display = 'none';
});

function disableOptions() {
  document.querySelectorAll('input[name="option"]').forEach(cb => cb.disabled = true);
  const btn = document.querySelector('button');
  if (btn) btn.disabled = true;
}
