   // ── STATE ──────────────────────────────────────────────────────
        let state = JSON.parse(localStorage.getItem('luna-state') || 'null') || {
            lastPeriod: '',
            cycleLength: 28,
            periodDuration: 5,
            lutealLength: 14,
            symptoms: {},
            moods: {},
            vitals: {},
            meds: [],
            notifications: [],
            notifSettings: { periodDays: 2, fertile: 'yes', tipTime: '08:00', vitals: 'daily' },
            notifEnabled: true,
        };

        function save() { localStorage.setItem('luna-state', JSON.stringify(state)); }

        // ── VIEWS ──────────────────────────────────────────────────────
        let currentView = 'cycle';
        function showView(name, sidebarBtn, navId) {
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-' + name).classList.add('active');
            currentView = name;

            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            if (sidebarBtn) sidebarBtn.classList.add('active');
            else {
                // sync sidebar
                document.querySelectorAll('.nav-item').forEach(b => {
                    if (b.textContent.toLowerCase().includes(name === 'notifs' ? 'notif' : name === 'meds' ? 'med' : name)) b.classList.add('active');
                });
            }

            document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
            if (navId) document.getElementById(navId).classList.add('active');
            else {
                const map = { cycle: 'bn-cycle', vitals: 'bn-vitals', wellness: 'bn-wellness', meds: 'bn-meds', notifs: 'bn-notifs' };
                const el = document.getElementById(map[name]);
                if (el) el.classList.add('active');
            }

            if (name === 'cycle') renderCycle();
            if (name === 'vitals') renderVitals();
            if (name === 'wellness') renderWellness();
            if (name === 'meds') renderMeds();
            if (name === 'notifs') renderNotifs();
        }

        // ── CYCLE LOGIC ────────────────────────────────────────────────
        const PHASES = {
            menstrual: { name: 'Menstrual Phase', color: '#e8547a', desc: 'Your body is shedding the uterine lining. Rest, warmth, and iron-rich foods are your allies right now. Gentle movement is welcome; push through nothing.' },
            follicular: { name: 'Follicular Phase', color: '#b09abf', desc: 'Oestrogen is rising and energy is building. A great time for new projects, social plans, and higher-intensity exercise. Your brain is sharp right now.' },
            ovulation: { name: 'Ovulation', color: '#f0a84e', desc: 'Peak fertility window. Energy, libido, and confidence are at their highest. Your body temperature rises slightly — you may feel warmer than usual.' },
            luteal: { name: 'Luteal Phase', color: '#5ecfa3', desc: 'Progesterone takes over. You may feel more inward, sensitive, or tired. This is normal. Reduce caffeine, eat magnesium-rich foods, and honour your need for rest.' },
        };

        function getCycleDay() {
            if (!state.lastPeriod) return null;
            const start = new Date(state.lastPeriod);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const diff = Math.floor((today - start) / 86400000);
            return (diff % state.cycleLength) + 1;
        }

        function getPhase(day) {
            if (!day) return null;
            const cl = state.cycleLength, pd = state.periodDuration, ll = state.lutealLength;
            const follicularEnd = cl - ll - 2;
            if (day <= pd) return 'menstrual';
            if (day <= follicularEnd) return 'follicular';
            if (day <= follicularEnd + 2) return 'ovulation';
            return 'luteal';
        }

        function drawWheel(cycleDay) {
            const svg = document.getElementById('cycle-svg');
            const n = state.cycleLength || 28;
            const cx = 100, cy = 100, r = 80, innerR = 58;
            const gap = 0.04;

            svg.innerHTML = '';
            for (let i = 1; i <= n; i++) {
                const phase = getPhase(i);
                const colors = { menstrual: '#e8547a', follicular: '#b09abf', ovulation: '#f0a84e', luteal: '#5ecfa3' };
                const baseColor = colors[phase] || '#3a2040';
                const isActive = i <= (cycleDay || 0);
                const isCurrent = i === cycleDay;

                const startAngle = ((i - 1) / n) * 2 * Math.PI - Math.PI / 2 + gap;
                const endAngle = (i / n) * 2 * Math.PI - Math.PI / 2 - gap;

                const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
                const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
                const ix1 = cx + innerR * Math.cos(startAngle), iy1 = cy + innerR * Math.sin(startAngle);
                const ix2 = cx + innerR * Math.cos(endAngle), iy2 = cy + innerR * Math.sin(endAngle);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const d = `M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1} Z`;
                path.setAttribute('d', d);
                path.setAttribute('fill', isActive ? baseColor : 'rgba(255,255,255,0.04)');
                path.setAttribute('stroke', 'none');
                if (isCurrent) {
                    path.setAttribute('filter', 'url(#glow)');
                    path.setAttribute('fill', baseColor);
                }
                svg.appendChild(path);
            }

            // glow filter
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            defs.innerHTML = `<filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
            svg.prepend(defs);
        }

        function renderCycle() {
            const settings = ['last-period', 'cycle-length', 'period-duration', 'luteal-length'];
            const vals = [state.lastPeriod, state.cycleLength, state.periodDuration, state.lutealLength];
            settings.forEach((id, i) => { const el = document.getElementById(id); if (el && vals[i]) el.value = vals[i]; });

            const day = getCycleDay();
            const phase = day ? getPhase(day) : null;
            const p = phase ? PHASES[phase] : null;

            document.getElementById('wheel-day').textContent = day || '—';
            document.getElementById('wheel-phase-label').textContent = phase ? phase.slice(0, 3).toUpperCase() : '—';
            document.getElementById('phase-name').textContent = p ? p.name : 'Not set up';
            document.getElementById('phase-desc').textContent = p ? p.desc : 'Log your last period date below to get started.';

            // stats
            if (day) {
                const cl = state.cycleLength, ll = state.lutealLength;
                const nextPeriod = cl - day + 1;
                const fertileStart = cl - ll - 3, fertileEnd = cl - ll + 1;
                const fertileIn = fertileStart - day;

                document.getElementById('stat-nextperiod').textContent = nextPeriod > 0 ? nextPeriod : 0;
                document.getElementById('stat-fertile').textContent = day >= fertileStart && day <= fertileEnd ? 'NOW' : (fertileIn > 0 ? 'in ' + fertileIn + 'd' : '—');
                document.getElementById('stat-cycleday').textContent = day;

                const today = new Date();
                document.getElementById('cycle-date-sub').textContent =
                    `Today is cycle day ${day} · ${today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`;
            } else {
                ['stat-nextperiod', 'stat-fertile', 'stat-cycleday'].forEach(id => document.getElementById(id).textContent = '—');
                document.getElementById('cycle-date-sub').textContent = 'Set your last period date to begin';
            }

            drawWheel(day);
            renderCalStrip();
            renderSymptoms();
        }

        function renderCalStrip() {
            const strip = document.getElementById('cal-strip');
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
            let html = '';
            for (let i = -10; i <= 20; i++) {
                const d = new Date(today); d.setDate(today.getDate() + i);
                const cycleDay = state.lastPeriod ? (() => {
                    const start = new Date(state.lastPeriod);
                    const diff = Math.floor((d - start) / 86400000);
                    return (diff % state.cycleLength) + 1;
                })() : null;
                const phase = cycleDay ? getPhase(cycleDay) : null;
                let cls = 'cal-day';
                if (i === 0) cls += ' today';
                else if (phase === 'menstrual') cls += ' period-day';
                else if (phase === 'ovulation') cls += ' ovulation-day';
                else if (phase === 'follicular' && cycleDay && cycleDay >= state.cycleLength - state.lutealLength - 4 && cycleDay <= state.cycleLength - state.lutealLength + 1) cls += ' fertile-day';
                html += `<div class="${cls}">
      <span class="cal-wd">${days[d.getDay()]}</span>
      <span class="cal-dm">${d.getDate()}</span>
    </div>`;
            }
            strip.innerHTML = html;
            // scroll today into view
            setTimeout(() => {
                const todayEl = strip.querySelector('.today');
                if (todayEl) todayEl.scrollIntoView({ inline: 'center', behavior: 'smooth' });
            }, 100);
        }

        function saveCycleSettings() {
            state.lastPeriod = document.getElementById('last-period').value;
            state.cycleLength = parseInt(document.getElementById('cycle-length').value) || 28;
            state.periodDuration = parseInt(document.getElementById('period-duration').value) || 5;
            state.lutealLength = parseInt(document.getElementById('luteal-length').value) || 14;
            save(); renderCycle(); renderWellness();
            pushToast('💾', 'Cycle settings saved', 'Your tracker has been updated.');
        }

        function logPeriodStart() {
            const today = new Date().toISOString().split('T')[0];
            state.lastPeriod = today;
            document.getElementById('last-period').value = today;
            save(); renderCycle();
            pushToast('🩸', 'Period logged', "Day 1 marked. We'll update your predictions.");
            addNotification('🩸 Period started', 'Day 1 has been logged. Remember to rest and stay hydrated.');
        }

        // ── SYMPTOMS ──────────────────────────────────────────────────
        const SYMPTOMS = [
            { key: 'cramps', label: 'Cramps', emoji: '😣' },
            { key: 'bloating', label: 'Bloating', emoji: '🫧' },
            { key: 'headache', label: 'Headache', emoji: '🤕' },
            { key: 'fatigue', label: 'Fatigue', emoji: '😴' },
            { key: 'nausea', label: 'Nausea', emoji: '🤢' },
            { key: 'backpain', label: 'Back Pain', emoji: '😖' },
            { key: 'tender', label: 'Breast Tenderness', emoji: '🎀' },
            { key: 'acne', label: 'Acne', emoji: '😤' },
            { key: 'cravings', label: 'Cravings', emoji: '🍫' },
        ];
        const MOODS = [
            { key: 'happy', label: 'Happy', emoji: '😊' },
            { key: 'anxious', label: 'Anxious', emoji: '😰' },
            { key: 'irritable', label: 'Irritable', emoji: '😤' },
            { key: 'sad', label: 'Sad', emoji: '😢' },
            { key: 'calm', label: 'Calm', emoji: '😌' },
            { key: 'energised', label: 'Energised', emoji: '⚡' },
        ];

        const todayKey = () => new Date().toISOString().split('T')[0];

        function renderSymptoms() {
            const today = todayKey();
            const active = (state.symptoms[today] || []);
            const moodActive = (state.moods[today] || []);

            document.getElementById('symptom-grid').innerHTML = SYMPTOMS.map(s => `
    <button class="symp-btn ${active.includes(s.key) ? 'active' : ''}" onclick="toggleSymptom('${s.key}')">
      <span class="symp-emoji">${s.emoji}</span>${s.label}
    </button>`).join('');

            document.getElementById('mood-row').innerHTML = MOODS.map(m => `
    <button class="mood-btn ${moodActive.includes(m.key) ? 'active' : ''}" onclick="toggleMood('${m.key}')">
      ${m.emoji} ${m.label}
    </button>`).join('');

            const flow = document.getElementById('flow-intensity');
            if (flow && state.symptoms[today + '_flow']) flow.value = state.symptoms[today + '_flow'];
        }

        function toggleSymptom(key) {
            const today = todayKey();
            if (!state.symptoms[today]) state.symptoms[today] = [];
            const arr = state.symptoms[today];
            const idx = arr.indexOf(key);
            if (idx > -1) arr.splice(idx, 1); else arr.push(key);
            save(); renderSymptoms();
        }

        function toggleMood(key) {
            const today = todayKey();
            if (!state.moods[today]) state.moods[today] = [];
            const arr = state.moods[today];
            const idx = arr.indexOf(key);
            if (idx > -1) arr.splice(idx, 1); else arr.push(key);
            save(); renderSymptoms();
        }

        function saveSymptoms() {
            const today = todayKey();
            const flow = document.getElementById('flow-intensity').value;
            if (flow) state.symptoms[today + '_flow'] = flow;
            save();
            pushToast('✅', 'Log saved', 'Today\'s symptoms and mood have been recorded.');
        }

        // ── VITALS ─────────────────────────────────────────────────────
        function renderVitals() {
            const v = state.vitals;
            const display = document.getElementById('vitals-display');

            const items = [
                {
                    key: 'hr', label: 'Heart Rate', unit: 'BPM', emoji: '<span class="heart-pulse">❤️</span>', cls: 'rose',
                    status: v.hr ? (v.hr < 60 ? 'Low' : v.hr > 100 ? (v.hr > 120 ? 'High!' : 'Elevated') : 'Normal') : null,
                    statusCls: v.hr ? (v.hr < 60 ? 'warn' : v.hr > 120 ? 'alert' : v.hr > 100 ? 'warn' : 'ok') : 'ok'
                },
                {
                    key: 'bp', label: 'Blood Pressure', unit: 'mmHg', emoji: '🩺', cls: 'gold',
                    status: v.bp ? 'Logged' : null, statusCls: 'ok'
                },
                {
                    key: 'temp', label: 'Temperature', unit: '°C', emoji: '🌡️', cls: 'gold',
                    status: v.temp ? (v.temp >= 37.5 ? 'Elevated' : v.temp < 36 ? 'Low' : 'Normal') : null,
                    statusCls: v.temp ? (v.temp >= 37.5 ? 'warn' : v.temp < 36 ? 'warn' : 'ok') : 'ok'
                },
                { key: 'weight', label: 'Weight', unit: 'kg', emoji: '⚖️', cls: 'lav', status: null, statusCls: 'ok' },
                {
                    key: 'sleep', label: 'Sleep', unit: 'hrs', emoji: '💤', cls: 'lav',
                    status: v.sleep ? (v.sleep < 6 ? 'Low' : v.sleep >= 7 ? 'Good' : 'OK') : null,
                    statusCls: v.sleep ? (v.sleep < 6 ? 'warn' : 'ok') : 'ok'
                },
                {
                    key: 'water', label: 'Water', unit: 'glasses', emoji: '💧', cls: 'green',
                    status: v.water ? (v.water >= 8 ? 'Goal met!' : 'Keep going') : null,
                    statusCls: v.water ? (v.water >= 8 ? 'ok' : 'warn') : 'ok'
                },
            ];

            display.innerHTML = items.map(item => `
    <div class="vital-card">
      ${item.status ? `<div class="vital-status ${item.statusCls}">${item.status}</div>` : ''}
      <div class="vital-icon">${item.emoji}</div>
      <div class="vital-val ${item.cls}">${v[item.key] ?? '—'}</div>
      <div class="vital-label">${item.label} · ${item.unit}</div>
    </div>`).join('');
        }

        function saveVitals() {
            const ids = ['hr', 'bp', 'temp', 'weight', 'sleep', 'water'];
            const keys = ['hr', 'bp', 'temp', 'weight', 'sleep', 'water'];
            const prev = { ...state.vitals };
            ids.forEach((id, i) => {
                const val = document.getElementById('v-' + id).value;
                if (val) state.vitals[keys[i]] = id === 'bp' ? val : parseFloat(val);
            });
            save(); renderVitals();

            // check for alerts
            const hr = state.vitals.hr;
            if (hr && hr > 100) {
                addNotification('⚠️ Heart rate elevated', `Your logged heart rate of ${hr} BPM is above 100. Rest and re-check in 10 minutes. Seek care if it persists.`);
            }
            const temp = state.vitals.temp;
            if (temp && temp >= 37.5) {
                addNotification('🌡️ Temperature elevated', `${temp}°C is above normal. Monitor for fever symptoms. If above 38.5°C, consider medical advice.`);
            }

            pushToast('💾', 'Vitals saved', 'Your health readings have been recorded.');
        }

        // ── WELLNESS ───────────────────────────────────────────────────
        const PHASE_TIPS = {
            menstrual: { icon: '🩸', title: 'You\'re in your menstrual phase', text: 'Your body is doing important work. Prioritise rest, apply heat for cramps, take your iron-supporting foods, and be gentle with yourself. Light yoga or a short walk is ideal movement today.' },
            follicular: { icon: '🌱', title: 'You\'re in your follicular phase', text: 'Oestrogen is rising — use this upswing for your most demanding tasks. Try a new workout, reconnect socially, and eat protein-rich foods to fuel the energy surge.' },
            ovulation: { icon: '✨', title: 'You\'re ovulating — peak energy', text: 'This is your highest energy and confidence point. You\'re naturally more communicative and social. A great day for presentations, gym PRs, or connecting with people you care about.' },
            luteal: { icon: '🌙', title: 'You\'re in your luteal phase', text: 'Progesterone is high. You may feel more inward or emotional — that\'s healthy. Reduce caffeine, prioritise magnesium and sleep, journal if mood dips, and be patient with yourself.' },
        };

        function renderWellness() {
            const day = getCycleDay();
            const phase = day ? getPhase(day) : null;
            const tip = phase ? PHASE_TIPS[phase] : null;
            if (tip) {
                document.getElementById('ptb-title').textContent = tip.title;
                document.getElementById('ptb-text').textContent = tip.text;
                document.querySelector('.ptb-icon').textContent = tip.icon;
            }
        }

        // ── MEDICATIONS ────────────────────────────────────────────────
        function renderMeds() {
            const list = document.getElementById('med-list');
            if (!state.meds.length) {
                list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--txt3);font-size:.85rem;">No medication reminders yet.</div>';
                return;
            }
            list.innerHTML = state.meds.map((m, i) => `
    <div class="med-item">
      <div class="med-icon">💊</div>
      <div class="med-info">
        <div class="med-name">${m.name}</div>
        <div class="med-dose">${m.dose} · ${m.freq}</div>
      </div>
      <div class="med-time">${m.time}</div>
      <button class="med-del" onclick="deleteMed(${i})">✕</button>
    </div>`).join('');
        }

        function addMed() {
            const name = document.getElementById('med-name').value.trim();
            const dose = document.getElementById('med-dose').value.trim();
            const time = document.getElementById('med-time').value;
            const freq = document.getElementById('med-freq').value;
            if (!name) { pushToast('⚠️', 'Missing info', 'Enter a medication name.'); return; }
            state.meds.push({ name, dose: dose || '—', time: time || '—', freq });
            save(); renderMeds();
            document.getElementById('med-name').value = '';
            document.getElementById('med-dose').value = '';
            document.getElementById('med-time').value = '';
            pushToast('💊', 'Reminder added', `${name} scheduled.`);
            addNotification('💊 Medication reminder set', `${name} — ${dose || 'check dosage'} at ${time || 'as needed'}.`);
            scheduleMedNotification({ name, dose, time, freq });
        }

        function deleteMed(i) {
            state.meds.splice(i, 1);
            save(); renderMeds();
        }

        // ── NOTIFICATIONS ──────────────────────────────────────────────
        let notifsEnabled = state.notifEnabled !== false;

        function toggleNotifs() {
            notifsEnabled = !notifsEnabled;
            state.notifEnabled = notifsEnabled;
            save();
            const btn = document.getElementById('notif-master');
            btn.classList.toggle('on', notifsEnabled);
            pushToast(notifsEnabled ? '🔔' : '🔕', notifsEnabled ? 'Reminders on' : 'Reminders off', '');
        }

        function addNotification(title, text) {
            state.notifications.unshift({ title, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false });
            save();
            updateNotifBadge();
            if (currentView === 'notifs') renderNotifs();
        }

        function updateNotifBadge() {
            const unread = state.notifications.filter(n => !n.read).length;
            const badge = document.getElementById('notif-badge');
            if (unread > 0) { badge.style.display = ''; badge.textContent = unread; }
            else badge.style.display = 'none';
        }

        function renderNotifs() {
            const list = document.getElementById('notif-list');
            state.notifications.forEach(n => n.read = true);
            save(); updateNotifBadge();

            if (!state.notifications.length) {
                list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--txt3);font-size:.85rem;">No notifications yet.</div>';
                return;
            }
            list.innerHTML = state.notifications.map(n => `
    <div class="notif-item">
      <div class="notif-dot read"></div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>`).join('');

            // prefill settings
            const ns = state.notifSettings;
            document.getElementById('notif-period-days').value = ns.periodDays || 2;
            document.getElementById('notif-fertile').value = ns.fertile || 'yes';
            document.getElementById('notif-tip-time').value = ns.tipTime || '08:00';
            document.getElementById('notif-vitals').value = ns.vitals || 'daily';
        }

        function clearAllNotifs() {
            state.notifications = [];
            save(); renderNotifs(); updateNotifBadge();
            pushToast('🧹', 'Cleared', 'All notifications removed.');
        }

        function saveNotifSettings() {
            state.notifSettings = {
                periodDays: parseInt(document.getElementById('notif-period-days').value) || 2,
                fertile: document.getElementById('notif-fertile').value,
                tipTime: document.getElementById('notif-tip-time').value,
                vitals: document.getElementById('notif-vitals').value,
            };
            save();
        }

        function scheduleAllNotifs() {
            saveNotifSettings();
            requestBrowserNotifPermission();
            scheduleCycleNotifications();
            pushToast('🔔', 'Notifications scheduled', 'Cycle, medication, and wellness alerts are set.');
            addNotification('✅ Notifications active', 'Luna will remind you about your period, fertile window, medications, and daily wellness tips.');
        }

        // ── BROWSER NOTIFICATIONS ──────────────────────────────────────
        async function requestBrowserNotifPermission() {
            if (!('Notification' in window)) return;
            if (Notification.permission === 'default') {
                await Notification.requestPermission();
            }
        }

        function sendBrowserNotif(title, body, icon = '🌸') {
            if (!notifsEnabled) return;
            if (Notification.permission === 'granted') {
                try { new Notification(title, { body, icon: '/favicon.ico' }); } catch (e) { }
            }
            addNotification(icon + ' ' + title, body);
        }

        function scheduleMedNotification(med) {
            if (!med.time || med.time === '—') return;
            const [h, m] = med.time.split(':').map(Number);
            const now = new Date();
            const target = new Date(); target.setHours(h, m, 0, 0);
            if (target <= now) target.setDate(target.getDate() + 1);
            const delay = target - now;
            if (delay < 86400000) {
                setTimeout(() => {
                    sendBrowserNotif(`💊 Time for ${med.name}`, med.dose || 'Take your medication.', '💊');
                }, delay);
            }
        }

        function scheduleCycleNotifications() {
            const day = getCycleDay();
            if (!day) return;
            const cl = state.cycleLength;
            const pd = state.notifSettings.periodDays || 2;
            const daysToNext = cl - day + 1;
            const ll = state.lutealLength;
            const fertileStart = cl - ll - 3;
            const fertileIn = fertileStart - day;

            // Period reminder
            if (daysToNext === pd) {
                sendBrowserNotif('🩸 Period coming soon', `Your period is expected in ${pd} days. Stock up on supplies and take it easy.`, '🩸');
            }
            if (daysToNext === 1) {
                sendBrowserNotif('🩸 Period expected tomorrow', 'Your period should start tomorrow. Be prepared and be kind to yourself.', '🩸');
            }

            // Fertile window
            if (state.notifSettings.fertile === 'yes') {
                if (fertileIn === 1) {
                    sendBrowserNotif('🌿 Fertile window starts tomorrow', 'Your most fertile days begin tomorrow. Plan accordingly.', '🌿');
                }
                if (day >= fertileStart && day <= fertileStart + 5) {
                    addNotification('🌿 Fertile window', `You are currently in your fertile window (days ${fertileStart}–${fertileStart + 5} of your cycle).`);
                }
            }

            // Ovulation
            const ovDay = cl - ll;
            if (day === ovDay - 1) {
                sendBrowserNotif('✨ Ovulation approaching', 'You may ovulate tomorrow — energy and libido are at their peak.', '✨');
            }

            // Schedule daily wellness tip
            const [h, m] = (state.notifSettings.tipTime || '08:00').split(':').map(Number);
            const now = new Date();
            const tipTime = new Date(); tipTime.setHours(h, m, 0, 0);
            if (tipTime <= now) tipTime.setDate(tipTime.getDate() + 1);
            const delay = tipTime - now;
            const phaseTip = PHASE_TIPS[getPhase(day)];
            if (phaseTip && delay < 86400000) {
                setTimeout(() => {
                    sendBrowserNotif('✨ Daily Wellness Tip', phaseTip.text.slice(0, 100) + '…', '✨');
                }, delay);
            }

            // Vitals reminder
            if (state.notifSettings.vitals === 'daily') {
                const vitalsTime = new Date(); vitalsTime.setHours(20, 0, 0, 0);
                if (vitalsTime <= now) vitalsTime.setDate(vitalsTime.getDate() + 1);
                const vDelay = vitalsTime - now;
                if (vDelay < 86400000) {
                    setTimeout(() => {
                        sendBrowserNotif('❤️ Log your vitals', 'Don\'t forget to log your heart rate, water intake, and sleep tonight.', '❤️');
                    }, vDelay);
                }
            }

            // Reschedule meds
            state.meds.forEach(scheduleMedNotification);
        }

        // ── TOAST SYSTEM ───────────────────────────────────────────────
        function pushToast(icon, title, msg) {
            const wrap = document.getElementById('toast-wrap');
            const el = document.createElement('div');
            el.className = 'toast-item';
            el.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-body"><div class="toast-title">${title}</div>${msg ? `<div class="toast-msg">${msg}</div>` : ''}</div>`;
            wrap.appendChild(el);
            setTimeout(() => el.remove(), 3800);
        }

        // ── BOOT ──────────────────────────────────────────────────────
        function boot() {
            updateNotifBadge();
            renderCycle();
            renderVitals();
            renderWellness();

            // Run daily cycle notifications on load
            if (state.lastPeriod && notifsEnabled) {
                setTimeout(scheduleCycleNotifications, 2000);
            }

            // Welcome notification if new
            if (!state.notifications.length) {
                addNotification('👋 Welcome to Luna', 'Set your last period date in the Cycle tab to get personalised predictions, tips, and reminders.');
            }

            // Request browser notification permission proactively
            if ('Notification' in window && Notification.permission === 'default') {
                setTimeout(requestBrowserNotifPermission, 3000);
            }
        }

        boot();