// public/client.js

const socket = io();

const pollSection = document.getElementById('poll-section');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const timerEl = document.getElementById('timer');
const resultsEl = document.getElementById('results');
const resultsContent = document.getElementById('results-content');
const adminForm = document.getElementById('admin-form');
const endPollButton = document.getElementById('end-poll-button');
const secretArea = document.getElementById('secret-click-area');
const adminPanel = document.getElementById('admin-panel');

let countdownInterval = null;
const ADMIN_PASSWORD = "019143";
let currentPollId = null;

// Mostrar encuesta activa
socket.on('newPoll', (data) => {
    currentPollId = data.id;
    resultsEl.style.display = 'none';
    pollSection.style.display = 'block';
    questionEl.textContent = data.question;
    optionsEl.innerHTML = '';

    const alreadyVoted = localStorage.getItem('pollVoted_' + currentPollId);

    data.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.disabled = alreadyVoted !== null;
        btn.onclick = () => {
            if (!alreadyVoted) {
                socket.emit('vote', option);
                localStorage.setItem('pollVoted_' + currentPollId, 'true');
                disableOptions();
                alert('¡Gracias por tu voto!');
            }
        };
        optionsEl.appendChild(btn);
    });

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

    for (let [option, count] of Object.entries(options)) {
        const div = document.createElement('div');
        div.textContent = `${option}: ${count} votos`;
        resultsContent.appendChild(div);
    }

    stopCountdown();
});

// Función para desactivar botones tras votar
function disableOptions() {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
    });
}

// Funciones para gestionar la cuenta atrás
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

function stopCountdown() {
    clearInterval(countdownInterval);
    timerEl.textContent = '';
}

// Formulario de administrador para lanzar encuesta
adminForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const password = document.getElementById('admin-password').value.trim();
    const question = document.getElementById('new-question').value.trim();
    const optionsText = document.getElementById('new-options').value.trim();
    const duration = document.getElementById('duration').value.trim();

    if (password !== ADMIN_PASSWORD) {
        alert('Contraseña incorrecta.');
        return;
    }

    if (!question || !optionsText) {
        alert('Debes introducir una pregunta y opciones.');
        return;
    }

    const options = optionsText.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (options.length < 2) {
        alert('Debes poner al menos dos opciones.');
        return;
    }

    socket.emit('startNewPoll', {
        question,
        options,
        durationSeconds: duration ? parseInt(duration) : null
    });

    adminForm.reset();
});

// Botón para finalizar encuesta manualmente
endPollButton.addEventListener('click', () => {
    const password = prompt("Introduce la contraseña de administrador para finalizar la encuesta:");

    if (password === ADMIN_PASSWORD) {
        socket.emit('endPoll');
    } else {
        alert('Contraseña incorrecta.');
    }
});

// ---- Gesto Secreto para mostrar panel administrador ----

let clickCount = 0;
let clickTimer = null;

secretArea.addEventListener('click', () => {
    clickCount++;

    if (clickCount === 5) {
        adminPanel.style.display = 'block';
        alert('Panel de administrador desbloqueado.');
        clickCount = 0;
        clearTimeout(clickTimer);
    } else {
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 1000); // Si en 1 segundo no haces los 5 clics, se resetea
    }
});

// Ocultar el panel al iniciar
adminPanel.style.display = 'none';