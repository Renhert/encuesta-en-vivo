const socket = io({ transports: ['polling'] });

const pollSection = document.getElementById('poll-section');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const maxSelectionInfo = document.getElementById('max-selection-info');
const timerEl = document.getElementById('timer');
const resultsEl = document.getElementById('results');
const resultsContent = document.getElementById('results-content');

socket.on('newPoll', (data) => {
  resultsEl.style.display = 'none';
  pollSection.style.display = 'block';

  questionEl.textContent = data.question;
  optionsEl.innerHTML = '';
  maxSelectionInfo.textContent = `Puedes seleccionar hasta ${data.maxSelections} opciones`;

  const alreadyVoted = localStorage.getItem('pollVoted_' + data.id);

  data.options.forEach(option => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" name="option" value="${option}" ${alreadyVoted ? 'disabled' : ''}> ${option}`;
    optionsEl.appendChild(label);
    optionsEl.appendChild(document.createElement('br'));
  });

  const voteButton = document.createElement('button');
  voteButton.textContent = 'Votar';
  voteButton.disabled = alreadyVoted !== null;
  voteButton.onclick = () => {
    const selected = Array.from(document.querySelectorAll('input[name="option"]:checked')).map(cb => cb.value);
    if (selected.length === 0) return alert("Selecciona al menos una opción.");
    if (selected.length > data.maxSelections) return alert(`Solo puedes seleccionar hasta ${data.maxSelections}.`);

    socket.emit('vote', selected);
    localStorage.setItem('pollVoted_' + data.id, 'true');
    disableOptions();
    alert("¡Gracias por votar!");
  };
  optionsEl.appendChild(voteButton);
});

socket.on('pollResults', (options) => {
  pollSection.style.display = 'none';
  resultsEl.style.display = 'block';
  resultsContent.innerHTML = '';

  const total = Object.values(options).reduce((a, b) => a + b, 0) || 1;

  Object.entries(options).forEach(([option, count]) => {
    const pct = ((count / total) * 100).toFixed(1);

    const container = document.createElement('div');
    container.className = 'result-bar-container';

    const label = document.createElement('div');
    label.className = 'result-label';
    label.textContent = `${option}: ${count} votos (${pct}%)`;

    const bar = document.createElement('div');
    bar.className = 'result-bar';
    bar.style.backgroundColor = '#fff';
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
