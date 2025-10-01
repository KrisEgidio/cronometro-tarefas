// Estado da aplicação
let currentTask = null;
let timer = null;
let startTime = 0;
let elapsedTime = 0;
let isRunning = false;
let isPaused = false;
let tasks = []; // Simula localStorage para demo

// Elementos DOM
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const currentTaskName = document.getElementById('current-task-name');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const taskList = document.getElementById('task-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const confirmModal = document.getElementById('confirm-modal');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
    updateTaskList();
    setupEventListeners();
    taskInput.focus();
});

// Event Listeners
function setupEventListeners() {
    // Adicionar tarefa
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // Controles do timer
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', togglePause);
    stopBtn.addEventListener('click', stopTimer);

    // Histórico
    clearHistoryBtn.addEventListener('click', showConfirmModal);

    // Modal
    confirmYes.addEventListener('click', clearHistory);
    confirmNo.addEventListener('click', hideConfirmModal);
    confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) {
            hideConfirmModal();
        }
    });

    // Atalhos do teclado
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName.toLowerCase() === 'input') return;
        
        switch(e.key) {
            case ' ':
                e.preventDefault();
                if (currentTask && !isRunning) {
                    startTimer();
                } else if (isRunning) {
                    togglePause();
                }
                break;
            case 'Escape':
                if (isRunning || isPaused) {
                    stopTimer();
                }
                break;
        }
    });
}

// Gerenciamento de tarefas
function addTask() {
    const taskName = taskInput.value.trim();
    
    if (!taskName) {
        taskInput.focus();
        return;
    }

    // Se já existe uma tarefa ativa, confirma substituição
    if (currentTask && (isRunning || isPaused)) {
        if (!confirm('Há uma tarefa em andamento. Deseja parar e iniciar uma nova?')) {
            return;
        }
        stopTimer();
    }

    currentTask = taskName;
    currentTaskName.textContent = taskName;
    
    // Reset timer
    resetTimer();
    
    // Habilita botão iniciar
    startBtn.disabled = false;
    
    // Limpa e foca input
    taskInput.value = '';
    taskInput.focus();
    
    // Atualiza UI
    updateTimerState();
}

// Funções do timer
function startTimer() {
    if (!currentTask) return;
    
    startTime = Date.now() - elapsedTime;
    isRunning = true;
    isPaused = false;
    
    timer = setInterval(updateTimer, 100);
    updateTimerState();
}

function togglePause() {
    if (isRunning) {
        // Pausar
        clearInterval(timer);
        isRunning = false;
        isPaused = true;
        pauseBtn.textContent = 'Retomar';
    } else if (isPaused) {
        // Retomar
        startTime = Date.now() - elapsedTime;
        isRunning = true;
        isPaused = false;
        timer = setInterval(updateTimer, 100);
        pauseBtn.textContent = 'Pausar';
    }
    
    updateTimerState();
}

function stopTimer() {
    if (!currentTask) return;
    
    // Para o timer
    clearInterval(timer);
    
    // Salva a tarefa se houve tempo decorrido
    if (elapsedTime > 0) {
        const task = {
            id: Date.now(),
            name: currentTask,
            duration: elapsedTime,
            timestamp: new Date().toISOString(),
            formattedDuration: formatTime(elapsedTime),
            formattedDate: formatDate(new Date())
        };
        
        tasks.unshift(task); // Adiciona no início (mais recente primeiro)
        saveTasks();
        updateTaskList();
    }
    
    // Reset estado
    resetTimer();
    currentTask = null;
    currentTaskName.textContent = 'Nenhuma tarefa selecionada';
    
    updateTimerState();
    taskInput.focus();
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    isPaused = false;
    elapsedTime = 0;
    timerDisplay.textContent = '00:00:00';
    pauseBtn.textContent = 'Pausar';
}

function updateTimer() {
    if (!isRunning) return;
    
    elapsedTime = Date.now() - startTime;
    timerDisplay.textContent = formatTime(elapsedTime);
}

// Atualização da UI
function updateTimerState() {
    const body = document.body;
    
    // Remove classes de estado
    body.classList.remove('timer-running', 'timer-paused');
    
    if (isRunning) {
        body.classList.add('timer-running');
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        stopBtn.classList.remove('hidden');
        pauseBtn.textContent = 'Pausar';
    } else if (isPaused) {
        body.classList.add('timer-paused');
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        stopBtn.classList.remove('hidden');
        pauseBtn.textContent = 'Retomar';
    } else {
        startBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
        stopBtn.classList.add('hidden');
        startBtn.disabled = !currentTask;
    }
}

// Formatação de tempo
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatDate(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Gerenciamento de histórico
function updateTaskList() {
    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma tarefa concluída ainda.</p>
                <p class="empty-state-subtitle">Complete uma tarefa para vê-la aqui!</p>
            </div>
        `;
        clearHistoryBtn.disabled = true;
        return;
    }
    
    clearHistoryBtn.disabled = false;
    
    taskList.innerHTML = tasks.map(task => `
        <div class="task-item">
            <div class="task-item-content">
                <div class="task-item-name">${escapeHtml(task.name)}</div>
                <div class="task-item-details">
                    <span class="task-item-duration">${task.formattedDuration}</span>
                    <span class="task-item-date">${task.formattedDate}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Modal de confirmação
function showConfirmModal() {
    if (tasks.length === 0) return;
    
    confirmModal.classList.remove('hidden');
    confirmYes.focus();
}

function hideConfirmModal() {
    confirmModal.classList.add('hidden');
    clearHistoryBtn.focus();
}

function clearHistory() {
    tasks = [];
    saveTasks();
    updateTaskList();
    hideConfirmModal();
}

// Simulação de localStorage (já que não podemos usar localStorage real)
function saveTasks() {
    // Em um ambiente real, seria: localStorage.setItem('tasks', JSON.stringify(tasks));
    // Como não podemos usar localStorage, os dados persistem apenas durante a sessão
    console.log('Tarefas salvas (simulação):', tasks);
}

function loadTasks() {
    // Em um ambiente real, seria:
    // const savedTasks = localStorage.getItem('tasks');
    // if (savedTasks) {
    //     tasks = JSON.parse(savedTasks);
    // }
    
    // Para demonstração, começamos com array vazio
    tasks = [];
}

// Utilitários
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Adiciona algumas tarefas de exemplo para demonstração
setTimeout(() => {
    if (tasks.length === 0) {
        tasks = [
            {
                id: Date.now() - 3600000,
                name: "Estudar JavaScript",
                duration: 1800000, // 30 minutos
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                formattedDuration: "00:30:00",
                formattedDate: formatDate(new Date(Date.now() - 3600000))
            },
            {
                id: Date.now() - 7200000,
                name: "Revisar CSS",
                duration: 2700000, // 45 minutos
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                formattedDuration: "00:45:00",
                formattedDate: formatDate(new Date(Date.now() - 7200000))
            }
        ];
        updateTaskList();
    }
}, 1000);