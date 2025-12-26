const Store = require('electron-store');
const store = new Store();

let timer;
let timeLeft = 20 * 60;
let isRunning = false;
let totalSelesai = store.get('totalSelesai') || 0;
let totalMenitFokus = store.get('totalMenitFokus') || 0;
let detikBerjalan = 0;
let isAlarming = false;
let dailyGoal = store.get('dailyGoal') || 5;

// --- 1. ALARM ---
const alarmSounds = {
    classic: "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
    nature: "https://actions.google.com/sounds/v1/water/rain_forest_slumber.ogg",
    digital: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm.ogg"
};
const savedSoundPath = store.get('selectedAlarm') || alarmSounds.classic;
const alarmSound = new Audio(savedSoundPath);
alarmSound.loop = true;

// --- ELEMEN UI ---
const display = document.getElementById('display');
const studyInput = document.getElementById('study-input');
const breakInput = document.getElementById('break-input');
const startBtn = document.getElementById('start-btn');
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const statSelesaiTxt = document.getElementById('stat-selesai');
const statFokusTxt = document.getElementById('stat-fokus');
const modal = document.getElementById('settings-modal');
const openBtn = document.querySelector('img[src="asset/uil_setting.png"]');
const closeBtn = document.getElementById('close-settings');
const alarmSelect = document.getElementById('alarm-select');
const goalInput = document.getElementById('goal-input');

// --- 2. FUNGSI PENDUKUNG ---
function updateDisplay(second) {
    const mins = Math.floor(second / 60);
    const secs = second % 60;
    display.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateStatsDisplay() {
    statSelesaiTxt.innerText = `${totalSelesai} / ${dailyGoal}`;
    statFokusTxt.innerText = `${totalMenitFokus} menit`;
}

function triggerAlarmState() {
    clearInterval(timer);
    isRunning = false;
    isAlarming = true;
    alarmSound.play();
    startBtn.style.backgroundColor = "#ff7675";
    const startIcon = document.getElementById('start-icon');
    if(startIcon) startIcon.src = "asset/stop.png"; 
}

function saveTasks() {
    const tasks = [];
    document.querySelectorAll('.task-item').forEach(li => {
        tasks.push({
            text: li.querySelector('.task-text').innerText,
            checked: li.querySelector('.task-checkbox').checked,
            studyTime: li.getAttribute('data-study'),
            breakTime: li.getAttribute('data-break')
        });
    });
    store.set('tasks', tasks);
}

function createTaskElement(text, isChecked = false, studyTime = 20, breakTime = 5) {
    const li = document.createElement('li');
    li.className = "task-item";
    li.setAttribute('data-study', studyTime);
    li.setAttribute('data-break', breakTime);

    li.innerHTML = `
        <div class="task-content" style="display:flex; align-items:center; flex:1; cursor:pointer;">
            <img src="asset/hugeicons_tick-double-03.png" width="18" style="margin-right:10px;">
            <div style="display:flex; flex-direction:column;">
                <span class="task-text" style="${isChecked ? 'text-decoration: line-through; color: #b2bec3;' : ''}">${text}</span>
                <span style="font-size: 10px; color: #6c5ce7; font-weight: bold;">💻 ${studyTime}m | ☕ ${breakTime}m</span>
            </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" class="task-checkbox" ${isChecked ? 'checked' : ''}>
            <button class="delete-task-btn" style="background:none; border:none; color:#ff7675; cursor:pointer;">✕</button>
        </div>
    `;

    li.querySelector('.task-content').onclick = (e) => {
        if (e.target.className === 'task-checkbox') return;
        studyInput.value = li.getAttribute('data-study');
        breakInput.value = li.getAttribute('data-break');
        timeLeft = parseInt(studyInput.value) * 60;
        updateDisplay(timeLeft);
    };

    const cb = li.querySelector('.task-checkbox');
    cb.onchange = () => {
        totalSelesai = cb.checked ? totalSelesai + 1 : Math.max(0, totalSelesai - 1);
        const txt = li.querySelector('.task-text');
        txt.style.textDecoration = cb.checked ? 'line-through' : 'none';
        txt.style.color = cb.checked ? '#b2bec3' : '#2d3436';
        store.set('totalSelesai', totalSelesai);
        updateStatsDisplay();
        saveTasks();
    };

    li.querySelector('.delete-task-btn').onclick = () => { 
        if (cb.checked) totalSelesai = Math.max(0, totalSelesai - 1);
        li.remove();
        store.set('totalSelesai', totalSelesai);
        updateStatsDisplay();
        saveTasks();
    };
    taskList.appendChild(li);
}

// --- 3. LOGIKA TOMBOL START ---
startBtn.addEventListener('click', () => {
    if (isAlarming) { 
        alarmSound.pause(); 
        alarmSound.currentTime = 0; 
        isAlarming = false;
        startBtn.style.backgroundColor = "#fff";
        document.getElementById('start-icon').src = "asset/mi_play.png";
        timeLeft = (parseInt(breakInput.value) || 5) * 60;
        updateDisplay(timeLeft);
        return; 
    }

    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
        document.getElementById('start-icon').src = "asset/mi_play.png";
    } else {
        isRunning = true;
        document.getElementById('start-icon').src = "asset/stash_pause.png";
        
        let startTime = Date.now();
        let initialTimeLeft = timeLeft;
        let lastLoggedSecond = 0;

        timer = setInterval(() => {
            let currentTime = Date.now();
            let elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
            
            timeLeft = initialTimeLeft - elapsedSeconds;

            // Logika Menit Fokus (Berdasarkan selisih waktu nyata)
            if (elapsedSeconds > lastLoggedSecond) {
                detikBerjalan += (elapsedSeconds - lastLoggedSecond);
                lastLoggedSecond = elapsedSeconds;
                
                if (detikBerjalan >= 60) {
                    totalMenitFokus++;
                    store.set('totalMenitFokus', totalMenitFokus);
                    updateStatsDisplay();
                    detikBerjalan -= 60;
                }
            }

            if (timeLeft <= 0) {
                timeLeft = 0;
                updateDisplay(timeLeft);
                triggerAlarmState();
            } else {
                updateDisplay(timeLeft);
            }
        }, 100);
    }
});

// --- 4. TOMBOL SET ---
document.getElementById('set-timer-btn').addEventListener('click', () => {
    const studyMins = parseInt(studyInput.value);
    const breakMins = parseInt(breakInput.value);

    if (isNaN(studyMins) || studyMins <= 0 || isNaN(breakMins) || breakMins <= 0) {
        alert("Waktu harus angka positif!");
        return;
    }

    const taskName = taskInput.value.trim();
    if (taskName !== "") {
        createTaskElement(taskName, false, studyMins, breakMins);
        taskInput.value = ""; 
        saveTasks();
    }

    clearInterval(timer);
    isRunning = false;
    isAlarming = false;
    alarmSound.pause();
    alarmSound.currentTime = 0;
    timeLeft = studyMins * 60;
    updateDisplay(timeLeft);
    document.getElementById('start-icon').src = "asset/mi_play.png";
    startBtn.style.backgroundColor = "#fff";
});

// --- 5. PENGATURAN & MODAL ---
openBtn.onclick = () => modal.style.display = "block";
closeBtn.onclick = () => modal.style.display = "none";

alarmSelect.value = savedSoundPath;
alarmSelect.onchange = () => {
    alarmSound.src = alarmSelect.value;
    store.set('selectedAlarm', alarmSelect.value);
    alarmSound.play();
    setTimeout(() => { if(!isAlarming) { alarmSound.pause(); alarmSound.currentTime = 0; } }, 2000);
};

goalInput.value = dailyGoal;
goalInput.onchange = () => {
    dailyGoal = goalInput.value;
    store.set('dailyGoal', dailyGoal);
    updateStatsDisplay();
};

document.getElementById('reset-data-btn').onclick = () => {
    if (confirm("Reset semua data?")) {
        store.clear();
        totalSelesai = 0;
        totalMenitFokus = 0;
        detikBerjalan = 0;
        taskList.innerHTML = ""; 
        updateStatsDisplay();
        modal.style.display = "none";
        alert("Data berhasil dihapus!");
    }
};

// Reset & Skip
document.getElementById('reset-btn').addEventListener('click', () => {
    clearInterval(timer); isRunning = false; isAlarming = false;
    alarmSound.pause(); alarmSound.currentTime = 0;
    timeLeft = (parseInt(studyInput.value) || 20) * 60;
    updateDisplay(timeLeft);
    document.getElementById('start-icon').src = "asset/mi_play.png";
});

document.getElementById('skip-break-btn').addEventListener('click', () => {
    clearInterval(timer); isRunning = false; isAlarming = false;
    alarmSound.pause(); alarmSound.currentTime = 0;
    timeLeft = (parseInt(studyInput.value) || 20) * 60;
    updateDisplay(timeLeft);
    document.getElementById('start-icon').src = "asset/mi_play.png";
});

// --- 6. START UP ---
window.onload = () => {
    if (!studyInput.value) studyInput.value = 20;
    if (!breakInput.value) breakInput.value = 5;

    const savedTasks = store.get('tasks') || [];
    savedTasks.forEach(t => {
        createTaskElement(t.text, t.checked, t.studyTime || 20, t.breakTime || 5);
    });
    updateStatsDisplay();
    updateDisplay(timeLeft);

    [studyInput, breakInput, goalInput].forEach(input => {
        input.addEventListener('keydown', (e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); });
    });
};