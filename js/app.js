/**
 * Vitality Fitness App - Core Logic
 * Handles LocalStorage for Videos, Plans, and Profile Data
 */

const STORAGE_KEYS = {
    PROFILE: 'vitality_profile_history',
    VIDEOS: 'vitality_videos',
    PLANS: 'vitality_plans'
};

// --- Utilities ---
const Utils = {
    generateId: () => '_' + Math.random().toString(36).substr(2, 9),
    getTodayDate: () => new Date().toISOString().split('T')[0],
    formatDate: (dateStr) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    }
};

// --- Storage Modules ---

const ProfileStorage = {
    // Save a new measurement record
    addEntry: (data) => {
        const history = ProfileStorage.getHistory();
        const newEntry = {
            id: Utils.generateId(),
            date: Utils.getTodayDate(),
            timestamp: new Date().toISOString(),
            ...data
        };
        // Remove existing entry for today if exists to avoid duplicates per day
        const filtered = history.filter(h => h.date !== newEntry.date);
        filtered.unshift(newEntry); // Add to top
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(filtered));
        return newEntry;
    },
    getHistory: () => {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE) || '[]');
    },
    getLatest: () => {
        const history = ProfileStorage.getHistory();
        return history.length > 0 ? history[0] : null;
    }
};

const VideoStorage = {
    add: (video) => {
        const videos = VideoStorage.getAll();
        const newVideo = { id: Utils.generateId(), ...video };
        videos.push(newVideo);
        localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
        return newVideo;
    },
    remove: (id) => {
        const videos = VideoStorage.getAll().filter(v => v.id !== id);
        localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
    },
    getAll: () => {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.VIDEOS) || '[]');
    }
};

const PlanStorage = {
    saveDay: (date, planData) => {
        const allPlans = PlanStorage.getAll();
        allPlans[date] = planData;
        localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(allPlans));
    },
    getDay: (date) => {
        const allPlans = PlanStorage.getAll();
        return allPlans[date] || { videos: [], completed: false, totalCalories: 0 };
    },
    getAll: () => {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS) || '{}');
    }
};

// --- Page Controllers ---

// 1. Video Library Controller (index.html)
function initVideoPage() {
    const addBtn = document.getElementById('addVideoBtn');
    const titleInput = document.getElementById('videoTitle');
    const linkInput = document.getElementById('videoLink');
    const partInput = document.getElementById('videoPart');
    const typeInput = document.getElementById('videoType'); // Strength/Cardio
    const listContainer = document.getElementById('videoList');

    function renderVideos() {
        const videos = VideoStorage.getAll();
        listContainer.innerHTML = '';
        
        if (videos.length === 0) {
            listContainer.innerHTML = `
                <div class="list-placeholder">
                    <p>No videos yet. Add your favorite workouts!</p>
                </div>`;
            return;
        }

        // Group by Body Part
        const grouped = videos.reduce((acc, video) => {
            acc[video.part] = acc[video.part] || [];
            acc[video.part].push(video);
            return acc;
        }, {});

        for (const [part, partVideos] of Object.entries(grouped)) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'video-group';
            groupDiv.innerHTML = `<h3 class="group-title">${part.toUpperCase()}</h3>`;
            
            partVideos.forEach(v => {
                const item = document.createElement('div');
                item.className = 'video-item card-mini';
                item.innerHTML = `
                    <div class="video-info">
                        <strong>${v.title}</strong>
                        <span class="tag ${v.type}">${v.type}</span>
                        <a href="${v.link}" target="_blank" class="video-link-icon">🔗</a>
                    </div>
                    <button class="btn-delete" data-id="${v.id}">×</button>
                `;
                groupDiv.appendChild(item);
            });
            listContainer.appendChild(groupDiv);
        }

        // Attach Delete Events
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm('Delete this video?')) {
                    VideoStorage.remove(e.target.dataset.id);
                    renderVideos();
                }
            });
        });
    }

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (!titleInput.value || !linkInput.value) {
                alert('Please enter a title and a link.');
                return;
            }
            VideoStorage.add({
                title: titleInput.value,
                link: linkInput.value,
                part: partInput.value,
                type: typeInput.value
            });
            // Reset form
            titleInput.value = '';
            linkInput.value = '';
            renderVideos();
        });
        renderVideos(); // Initial render
    }
}

// 2. Profile Controller (profile.html)
function initProfilePage() {
    const inputs = {
        height: document.getElementById('heightInput'),
        weight: document.getElementById('weightInput'),
        waist: document.getElementById('waistInput'),
        chest: document.getElementById('chestInput'),
        hips: document.getElementById('hipsInput'),
        thigh: document.getElementById('thighInput'),
        calf: document.getElementById('calfInput')
    };
    const saveBtn = document.getElementById('saveProfileBtn');
    const displayContainer = document.getElementById('profileDisplay');
    const historyContainer = document.getElementById('historyList');

    function renderDisplay(data) {
        if (!data) return;
        // Update top display
        displayContainer.innerHTML = `
            <div class="data-item"><span class="data-value">${data.height || '-'}</span><span class="data-label">cm</span></div>
            <div class="data-item"><span class="data-value">${data.weight || '-'}</span><span class="data-label">kg</span></div>
            <div class="data-item"><span class="data-value">${data.waist || '-'}</span><span class="data-label">Waist</span></div>
            <div class="data-item"><span class="data-value">${data.hips || '-'}</span><span class="data-label">Hips</span></div>
        `;
    }

    function renderHistory() {
        const history = ProfileStorage.getHistory();
        if (!historyContainer) return;
        
        historyContainer.innerHTML = history.map(entry => `
            <div class="history-item">
                <span class="date">${Utils.formatDate(entry.date)}</span>
                <div class="details">
                    <span>${entry.weight}kg</span> / 
                    <span>W:${entry.waist}</span> / 
                    <span>H:${entry.hips}</span>
                </div>
            </div>
        `).join('');
    }

    // Load latest data into inputs
    const latest = ProfileStorage.getLatest();
    if (latest) {
        Object.keys(inputs).forEach(key => {
            if (inputs[key]) inputs[key].value = latest[key] || '';
        });
        renderDisplay(latest);
        renderHistory();
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const data = {};
            Object.keys(inputs).forEach(key => {
                if (inputs[key]) data[key] = inputs[key].value;
            });

            ProfileStorage.addEntry(data);
            alert('Measurements Recorded! 📉');
            renderDisplay(data);
            renderHistory();
        });
    }
}

// 3. Plan Controller (plan.html)
function initPlanPage() {
    const dateDisplay = document.querySelector('.date-display');
    const calDisplay = document.querySelector('.cal-summary');
    const planList = document.getElementById('todaysPlanList');
    const addVideoSelect = document.getElementById('planVideoSelect');
    const addToPlanBtn = document.getElementById('addToPlanBtn');
    const savePlanBtn = document.getElementById('savePlanBtn');

    const today = Utils.getTodayDate();
    let currentPlan = PlanStorage.getDay(today);

    if(dateDisplay) dateDisplay.textContent = Utils.formatDate(today);

    // Populate Video Select
    const allVideos = VideoStorage.getAll();
    if (addVideoSelect) {
        addVideoSelect.innerHTML = allVideos.map(v => 
            `<option value="${v.id}" data-type="${v.type}">${v.title} (${v.type})</option>`
        ).join('');
    }

    function calculateCalories() {
        let total = 0;
        currentPlan.videos.forEach(v => {
            const coeff = v.type === 'cardio' ? 5 : 3;
            total += (v.duration || 0) * coeff;
        });
        currentPlan.totalCalories = total;
        if(calDisplay) calDisplay.textContent = `🔥 ${total} kcal`;
    }

    function renderPlan() {
        planList.innerHTML = '';
        currentPlan.videos.forEach((item, index) => {
            const vid = allVideos.find(v => v.id === item.videoId);
            if (!vid) return;

            const row = document.createElement('div');
            row.className = `plan-row ${item.completed ? 'completed' : ''}`;
            row.innerHTML = `
                <div class="plan-info">
                    <input type="checkbox" class="check-done" ${item.completed ? 'checked' : ''} data-idx="${index}">
                    <span class="plan-title">${vid.title}</span>
                </div>
                <div class="plan-actions">
                    <input type="number" class="duration-input" value="${item.duration || 10}" data-idx="${index}" min="1"> min
                    <button class="btn-remove-plan" data-idx="${index}">×</button>
                </div>
            `;
            planList.appendChild(row);
        });

        // Event Listeners for dynamic elements
        document.querySelectorAll('.check-done').forEach(cb => {
            cb.addEventListener('change', (e) => {
                currentPlan.videos[e.target.dataset.idx].completed = e.target.checked;
                saveCurrentPlan();
                renderPlan(); // Re-render to update styles
            });
        });

        document.querySelectorAll('.duration-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                currentPlan.videos[e.target.dataset.idx].duration = parseInt(e.target.value) || 0;
                calculateCalories();
                saveCurrentPlan();
            });
        });

        document.querySelectorAll('.btn-remove-plan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentPlan.videos.splice(e.target.dataset.idx, 1);
                saveCurrentPlan();
                renderPlan();
                calculateCalories();
            });
        });

        calculateCalories();
    }

    function saveCurrentPlan() {
        PlanStorage.saveDay(today, currentPlan);
    }

    if (addToPlanBtn) {
        addToPlanBtn.addEventListener('click', () => {
            const selectedId = addVideoSelect.value;
            if (!selectedId) return;
            
            const vid = allVideos.find(v => v.id === selectedId);
            currentPlan.videos.push({
                videoId: selectedId,
                completed: false,
                duration: 15, // default
                type: vid.type
            });
            saveCurrentPlan();
            renderPlan();
        });
    }

    renderPlan();
}

// 4. Calendar Controller (calendar.html)
function initCalendarPage() {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('currentMonth');
    const summaryList = document.getElementById('daySummary');
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    if(monthLabel) monthLabel.textContent = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    function renderCalendar() {
        const plans = PlanStorage.getAll();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun

        grid.innerHTML = '';
        
        // Header
        const days = ['S','M','T','W','T','F','S'];
        days.forEach(d => grid.innerHTML += `<div class="cal-head">${d}</div>`);

        // Empty slots
        for(let i=0; i<firstDay; i++) {
            grid.innerHTML += `<div></div>`;
        }

        // Days
        for(let d=1; d<=daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayPlan = plans[dateStr];
            let statusClass = '';
            
            if (dayPlan && dayPlan.totalCalories > 0) {
                // Check if all planned videos are completed
                const allDone = dayPlan.videos.length > 0 && dayPlan.videos.every(v => v.completed);
                statusClass = allDone ? 'done' : 'partial';
            }

            const dayEl = document.createElement('div');
            dayEl.className = `calendar-day ${statusClass}`;
            dayEl.textContent = d;
            dayEl.onclick = () => showSummary(dateStr, dayPlan);
            grid.appendChild(dayEl);
        }
    }

    function showSummary(date, plan) {
        if (!plan || !plan.videos.length) {
            summaryList.innerHTML = `<p>No records for ${date}</p>`;
            return;
        }
        
        const videoNames = plan.videos.map(v => {
            const vid = VideoStorage.getAll().find(vi => vi.id === v.videoId);
            return vid ? vid.title : 'Unknown Video';
        }).join(', ');

        summaryList.innerHTML = `
            <h3>${date}</h3>
            <p>🔥 ${plan.totalCalories} kcal</p>
            <p><strong>Workouts:</strong> ${videoNames}</p>
        `;
    }

    renderCalendar();
}

// Global Router
document.addEventListener('DOMContentLoaded', () => {
    // Navigation Highlight
    const path = window.location.pathname;
    document.querySelectorAll('.nav-item').forEach(link => {
        if (link.href.includes(path.split('/').pop() || 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Page Dispatcher
    if (document.getElementById('videoList')) initVideoPage();
    if (document.getElementById('saveProfileBtn')) initProfilePage();
    if (document.getElementById('todaysPlanList')) initPlanPage();
    if (document.getElementById('calendarGrid')) initCalendarPage();
});
