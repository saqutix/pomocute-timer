// ===== POMODORO CONFIG =====
const TIMES = {
    pomodoro:   25 * 60,
    shortBreak:  5 * 60,
    longBreak:  15 * 60
};

// Ring circumference for r=108 circle: 2 * PI * 108 = 678.58
const RING_CIRCUMFERENCE = 2 * Math.PI * 108;
//hi
// ===== DOM REFS =====
const timerDisplay    = document.getElementById('timerDisplay');
const sessionLabel    = document.getElementById('sessionLabel');
const startPauseBtn   = document.getElementById('startPauseBtn');
const resetBtn        = document.getElementById('resetBtn');
const timerRing       = document.getElementById('timerRing');
const cuteMessageDiv  = document.getElementById('cuteMessage');
const modeBtns        = document.querySelectorAll('.mode-btn');
const installHint     = document.getElementById('installHint');
const playIcon        = document.getElementById('playIcon');
const pauseIcon       = document.getElementById('pauseIcon');
const btnLabel        = document.getElementById('btnLabel');
const timerWrap       = document.querySelector('.timer-circle-wrap');

// ===== STATE =====
let currentMode = 'pomodoro';
let timeLeft    = TIMES.pomodoro;
let timerId     = null;
let isRunning   = false;

// ===== DISPLAY =====
function updateDisplayAndProgress() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update SVG ring
    const total   = TIMES[currentMode];
    const elapsed = total - timeLeft;
    const pct     = Math.min(Math.max(elapsed / total, 0), 1);
    timerRing.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - pct);

    // Tab title
    document.title = `${timerDisplay.textContent} · pomocute`;
}

function setButtonState(running) {
    if (running) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        btnLabel.textContent = 'pause';
    } else {
        pauseIcon.classList.add('hidden');
        playIcon.classList.remove('hidden');
        btnLabel.textContent = 'start';
    }
}

// ===== SESSION UI =====
const MODE_DATA = {
    pomodoro:   { label: 'time to focus',    message: 'stay focused, little star!' },
    shortBreak: { label: 'breathe a little', message: 'stretch, drink some water!' },
    longBreak:  { label: 'well-earned rest', message: 'walk around, you did great!' }
};

function updateSessionUI() {
    const data = MODE_DATA[currentMode];
    sessionLabel.textContent = data.label;
    cuteMessageDiv.textContent = data.message;

    modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === currentMode);
    });
}

// ===== SOUND =====
function playCuteBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // Resume first to fix autoplay policy issues
        const play = () => {
            const osc  = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            // Cute little 3-note chime
            const notes = [880, 1109, 1318];
            notes.forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.type = 'sine';
                o.frequency.value = freq;
                g.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.18);
                g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + i * 0.18 + 0.5);
                o.start(audioCtx.currentTime + i * 0.18);
                o.stop(audioCtx.currentTime + i * 0.18 + 0.55);
            });
        };

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(play);
        } else {
            play();
        }
    } catch(e) {
        console.log('Sound not supported:', e);
    }
}

// ===== NOTIFICATIONS =====
const NOTIF_DATA = {
    pomodoro:   { title: 'Focus complete!',    body: 'Great work! Time for a break.' },
    shortBreak: { title: 'Break finished!',    body: 'Ready to focus again? Lets go!' },
    longBreak:  { title: 'Long break over!',   body: 'Feel refreshed? Back to work!' }
};

function notifySessionEnd() {
    const n = NOTIF_DATA[currentMode];
    if (Notification.permission === 'granted') {
        new Notification(n.title, { body: n.body, icon: 'icon-144.png' });
    }
    playCuteBeep();
    cuteMessageDiv.textContent = `${n.title} ${n.body}`;
    setTimeout(updateSessionUI, 3500);
}

// ===== TIMER LOGIC =====
function tick() {
    if (timeLeft <= 0) {
        clearInterval(timerId);
        timerId    = null;
        isRunning  = false;
        setButtonState(false);
        timerWrap.classList.remove('running');
        notifySessionEnd();
        timeLeft = TIMES[currentMode];
        updateDisplayAndProgress();
        cuteMessageDiv.textContent = 'session done! press start when ready.';
        setTimeout(updateSessionUI, 3000);
        return;
    }

    timeLeft--;
    updateDisplayAndProgress();

    if (timeLeft <= 10 && timeLeft > 0 && currentMode === 'pomodoro') {
        cuteMessageDiv.textContent = `almost done! ${timeLeft}s left, keep going!`;
    } else if (timeLeft <= 5 && currentMode !== 'pomodoro' && timeLeft > 0) {
        cuteMessageDiv.textContent = `break nearly over... ${timeLeft}s!`;
    }
}

function startTimer() {
    if (timerId) return;
    if (timeLeft <= 0) {
        timeLeft = TIMES[currentMode];
        updateDisplayAndProgress();
    }
    isRunning = true;
    timerId   = setInterval(tick, 1000);
    setButtonState(true);
    timerWrap.classList.add('running');
    cuteMessageDiv.textContent = (currentMode === 'pomodoro')
        ? 'counting tomatoes... you got this!'
        : 'relax and enjoy your break!';
}

function pauseTimer() {
    if (!timerId) return;
    clearInterval(timerId);
    timerId   = null;
    isRunning = false;
    setButtonState(false);
    timerWrap.classList.remove('running');
    cuteMessageDiv.textContent = 'paused. take a breath!';
}

function resetTimer() {
    clearInterval(timerId);
    timerId   = null;
    isRunning = false;
    setButtonState(false);
    timerWrap.classList.remove('running');
    timeLeft  = TIMES[currentMode];
    updateDisplayAndProgress();
    updateSessionUI();
}

function switchMode(mode) {
    clearInterval(timerId);
    timerId     = null;
    isRunning   = false;
    currentMode = mode;
    setButtonState(false);
    timerWrap.classList.remove('running');
    timeLeft    = TIMES[currentMode];
    updateDisplayAndProgress();
    updateSessionUI();
}

// ===== EVENT LISTENERS =====
startPauseBtn.addEventListener('click', () => isRunning ? pauseTimer() : startTimer());
resetBtn.addEventListener('click', resetTimer);

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        if (mode !== currentMode) switchMode(mode);
    });
});

// Notification permission on first interaction
function requestNotifPermission() {
    if (Notification && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    document.body.removeEventListener('click', requestNotifPermission);
}
document.body.addEventListener('click', requestNotifPermission);

// ===== PWA INSTALL =====
let deferredPrompt       = null;
let installButtonVisible = false;

const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

function createInstallPromptUI() {
    const container = document.createElement('div');
    container.className = 'install-prompt-container';
    container.id = 'installPromptContainer';
    container.innerHTML = `
        <div class="install-prompt-card">
            <div class="install-icon">
                <svg viewBox="0 0 54 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="27" cy="40" rx="23" ry="21" fill="#F47B6E"/>
                    <ellipse cx="20" cy="34" rx="6" ry="9" fill="#F9A99F" opacity="0.4"/>
                    <path d="M27 17 C27 7 19 3 15 9" stroke="#5C9B5A" stroke-width="3" stroke-linecap="round" fill="none"/>
                    <path d="M27 17 C27 5 35 1 39 8" stroke="#5C9B5A" stroke-width="3" stroke-linecap="round" fill="none"/>
                    <circle cx="21" cy="40" r="2" fill="#C44B3F"/>
                    <circle cx="33" cy="40" r="2" fill="#C44B3F"/>
                    <path d="M22 46 Q27 50 32 46" stroke="#C44B3F" stroke-width="1.8" stroke-linecap="round" fill="none"/>
                </svg>
            </div>
            <h3>install pomocute!</h3>
            <p>get the full app experience with offline support and home screen access</p>
            <div class="install-buttons">
                <button id="installAppBtn" class="install-btn-primary">install now</button>
                <button id="closeInstallBtn" class="install-btn-secondary">maybe later</button>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    return container;
}

function showInstallPrompt() {
    if (installButtonVisible || isAppInstalled || !deferredPrompt) return;
    const container = createInstallPromptUI();
    container.style.display = 'block';
    installButtonVisible = true;

    document.getElementById('installAppBtn').addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        container.style.display = 'none';
        installButtonVisible = false;
        if (outcome === 'accepted') showInstallSuccess();
    });

    document.getElementById('closeInstallBtn').addEventListener('click', () => {
        container.style.display = 'none';
        installButtonVisible = false;
        localStorage.setItem('installPromptDismissed', Date.now());
    });
}

function showInstallSuccess() {
    const toast = document.createElement('div');
    toast.className = 'install-success-toast';
    toast.textContent = 'pomocute installed! enjoy your tomatoes';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function updateInstallHint() {
    if (!installHint) return;
    if (isAppInstalled) {
        installHint.textContent = 'pomocute is installed!';
        installHint.style.cursor = 'default';
        return;
    }
    installHint.addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(({ outcome }) => {
                if (outcome === 'accepted') showInstallSuccess();
                deferredPrompt = null;
            });
        } else {
            alert("Tap the share/menu button in your browser and choose 'Add to Home Screen'");
        }
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const lastDismissed = localStorage.getItem('installPromptDismissed');
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (!lastDismissed || Date.now() - parseInt(lastDismissed) > sevenDays) {
        setTimeout(() => {
            if (!isAppInstalled && deferredPrompt) showInstallPrompt();
        }, 2000);
    }
});

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    showInstallSuccess();
    const c = document.getElementById('installPromptContainer');
    if (c) { c.style.display = 'none'; installButtonVisible = false; }
});

// ===== INIT =====
window.addEventListener('load', () => {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW error:', err));
    }
    updateInstallHint();
});

// Initialize timer
timerRing.style.strokeDasharray  = RING_CIRCUMFERENCE;
timerRing.style.strokeDashoffset = 0;
switchMode('pomodoro');
