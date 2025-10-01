// Estado da aplicação
let currentTask = null;
let timer = null;
let startTime = 0;
let elapsedTime = 0;
let isRunning = false;
let isPaused = false;
let tasks = []; // Simula localStorage para demo

// Estado persistente do cronômetro
let timerState = {
    isActive: false,
    taskName: null,
    realStartTime: null, // Tempo real quando iniciou (para calcular mesmo após sair da página)
    pausedTime: 0, // Tempo que ficou pausado
    lastPauseStart: null
};

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
    loadTimerState(); // Carrega o estado do cronômetro
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

    // Salvar estado antes de sair da página
    window.addEventListener('beforeunload', function() {
        saveTimerState();
    });

    // Salvar estado periodicamente (a cada 5 segundos) para maior segurança
    setInterval(function() {
        if (isRunning || isPaused) {
            saveTimerState();
        }
    }, 5000);

    // Detectar quando a página fica visível novamente (volta da aba)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && (isRunning || isPaused)) {
            // Recalcular o tempo quando voltar para a aba
            updateTimerFromSavedState();
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

// Funções do timer - SEM LIMITE DE TEMPO
function startTimer() {
    if (!currentTask) return;
    
    // Se está retomando, usa o tempo já decorrido
    startTime = Date.now() - elapsedTime;
    isRunning = true;
    isPaused = false;
    
    // Salva o estado para persistência
    timerState.isActive = true;
    timerState.taskName = currentTask;
    timerState.realStartTime = Date.now() - elapsedTime; // Tempo real considerando o tempo já decorrido
    timerState.pausedTime = 0;
    timerState.lastPauseStart = null;
    saveTimerState();
    
    // Atualiza a cada 100ms para maior fluidez
    // O cronômetro pode rodar indefinidamente
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
        
        // Salva o momento da pausa para persistência
        timerState.lastPauseStart = Date.now();
        saveTimerState();
    } else if (isPaused) {
        // Retomar
        // Calcula quanto tempo ficou pausado
        if (timerState.lastPauseStart) {
            timerState.pausedTime += (Date.now() - timerState.lastPauseStart);
        }
        
        startTime = Date.now() - elapsedTime;
        isRunning = true;
        isPaused = false;
        timer = setInterval(updateTimer, 100);
        pauseBtn.textContent = 'Pausar';
        
        // Atualiza estado persistente
        timerState.isActive = true;
        timerState.lastPauseStart = null;
        saveTimerState();
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
    
    // Limpa estado persistente
    clearTimerState();
    
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
    
    // Reset estado persistente
    timerState.isActive = false;
    timerState.taskName = null;
    timerState.realStartTime = null;
    timerState.pausedTime = 0;
    timerState.lastPauseStart = null;
}

function updateTimer() {
    if (!isRunning) return;
    
    // Calcula o tempo decorrido com alta precisão
    elapsedTime = Date.now() - startTime;
    
    // Atualiza o display do cronômetro
    timerDisplay.textContent = formatTime(elapsedTime);
    
    // Garante que o timer continue funcionando mesmo com tempos muito longos
    // JavaScript pode lidar com números até Number.MAX_SAFE_INTEGER (9007199254740991)
    // que equivale a aproximadamente 285.616 anos em millisegundos
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

// Formatação de tempo - Suporta tempos ilimitados
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Se passou de 99 horas, mostra o número real de horas (sem limite)
    if (hours >= 100) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
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
        <div class="task-item" data-task-id="${task.id}">
            <div class="task-item-content">
                <div class="task-item-name">${escapeHtml(task.name)}</div>
                <div class="task-item-details">
                    <span class="task-item-duration">${task.formattedDuration}</span>
                    <span class="task-item-date">${task.formattedDate}</span>
                </div>
            </div>
            <button class="task-item-remove" onclick="removeTask(${task.id})" title="Remover tarefa">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function removeTask(taskId) {
    if (confirm('Deseja remover esta tarefa do histórico?')) {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasks();
        updateTaskList();
    }
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

// Gerenciamento de localStorage
function saveTasks() {
    try {
        localStorage.setItem('cronometro-tasks', JSON.stringify(tasks));
        console.log('Tarefas salvas:', tasks);
    } catch (error) {
        console.error('Erro ao salvar tarefas:', error);
    }
}

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem('cronometro-tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        } else {
            tasks = [];
        }
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        tasks = [];
    }
}

// Gerenciamento de estado persistente do cronômetro
function saveTimerState() {
    try {
        // Se está pausado, calcula o tempo pausado até agora
        let currentPausedTime = timerState.pausedTime;
        if (isPaused && timerState.lastPauseStart) {
            currentPausedTime += (Date.now() - timerState.lastPauseStart);
        }
        
        const stateToSave = {
            isActive: timerState.isActive,
            taskName: timerState.taskName,
            realStartTime: timerState.realStartTime,
            pausedTime: currentPausedTime,
            isPaused: isPaused,
            savedAt: Date.now()
        };
        
        localStorage.setItem('cronometro-timer-state', JSON.stringify(stateToSave));
        console.log('Estado do cronômetro salvo:', stateToSave);
    } catch (error) {
        console.error('Erro ao salvar estado do cronômetro:', error);
    }
}

function loadTimerState() {
    try {
        const savedState = localStorage.getItem('cronometro-timer-state');
        if (savedState) {
            const state = JSON.parse(savedState);
            
            // Se há um cronômetro ativo, restaura o estado
            if (state.isActive && state.taskName && state.realStartTime) {
                currentTask = state.taskName;
                currentTaskName.textContent = state.taskName;
                
                // Calcula o tempo real decorrido considerando o tempo fora da página
                const now = Date.now();
                const totalElapsed = now - state.realStartTime;
                elapsedTime = totalElapsed - state.pausedTime;
                
                // Garante que o tempo não seja negativo
                if (elapsedTime < 0) elapsedTime = 0;
                
                // Restaura o estado do cronômetro
                timerState.isActive = true;
                timerState.taskName = state.taskName;
                timerState.realStartTime = state.realStartTime;
                timerState.pausedTime = state.pausedTime;
                
                if (state.isPaused) {
                    isPaused = true;
                    isRunning = false;
                    timerState.lastPauseStart = state.savedAt; // Usa o momento em que foi salvo como início da pausa
                    pauseBtn.textContent = 'Retomar';
                } else {
                    isRunning = true;
                    isPaused = false;
                    startTime = now - elapsedTime;
                    timer = setInterval(updateTimer, 100);
                }
                
                // Atualiza o display e botões
                timerDisplay.textContent = formatTime(elapsedTime);
                startBtn.disabled = false;
                updateTimerState();
                
                // Mostra uma notificação discreta que o cronômetro foi restaurado
                showNotification(`Cronômetro restaurado: ${state.taskName} (${formatTime(elapsedTime)})`);
                
                console.log('Estado do cronômetro restaurado. Tempo decorrido:', formatTime(elapsedTime));
            }
        }
    } catch (error) {
        console.error('Erro ao carregar estado do cronômetro:', error);
    }
}

function clearTimerState() {
    try {
        localStorage.removeItem('cronometro-timer-state');
        console.log('Estado do cronômetro limpo');
    } catch (error) {
        console.error('Erro ao limpar estado do cronômetro:', error);
    }
}

function updateTimerFromSavedState() {
    // Esta função é chamada quando a página volta a ficar visível
    // Recalcula o tempo baseado no estado salvo
    loadTimerState();
}

// Utilitários
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Função para mostrar notificações discretas
function showNotification(message) {
    // Remove notificação anterior se existir
    const existingNotification = document.querySelector('.timer-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Cria nova notificação
    const notification = document.createElement('div');
    notification.className = 'timer-notification';
    notification.textContent = message;
    
    // Adiciona ao body
    document.body.appendChild(notification);
    
    // Remove após 4 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}