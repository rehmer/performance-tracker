const PRELOADED_GOALS = [
    {
        id: "goal_5k",
        name: "5K Run",
        unit: "time",
        type: "lower",
        baseline: 2400, // 40:00 minutes
        target: 1800, // 30:00 minutes
        createdAt: Date.now()
    },
    {
        id: "goal_burpees",
        name: "Burpees",
        unit: "count",
        type: "higher",
        baseline: 20,
        target: 100,
        createdAt: Date.now()
    },
    {
        id: "goal_murph",
        name: "Murph",
        unit: "time",
        type: "lower",
        baseline: 5400, // 90:00 minutes
        target: 3600, // 60:00 minutes
        createdAt: Date.now()
    }
];

const COLORS = [
    '#007aff', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#ff2d55', '#af52de'
];

let mainChart = null;
let currentGoals = [];
let hiddenGoals = new Set(); // Stores IDs of hidden goals on chart

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

async function initApp() {
    // Check if first launch by seeing if there are any goals
    const goals = await DB.getGoals();
    if (goals.length === 0 && !localStorage.getItem('app_initialized')) {
        for (const goal of PRELOADED_GOALS) {
            await DB.saveGoal(goal);
        }
        localStorage.setItem('app_initialized', 'true');
    }
    
    setupNavigation();
    setupModals();
    setupForms();
    setupSettings();
    
    // Initial data load
    await refreshData();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update nav active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Switch view
            const targetId = item.getAttribute('data-target');
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
            
            // Special handling when entering views
            if (targetId === 'view-chart') {
                renderChart(); // re-render to handle resize issues
            }
        });
    });
}

function setupModals() {
    // Close buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            document.getElementById(modalId).classList.remove('active');
        });
    });

    // Close on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // FAB Add Result
    document.getElementById('fab-add-result').addEventListener('click', () => {
        openResultModal();
    });

    // Add Goal button
    document.getElementById('btn-add-goal').addEventListener('click', () => {
        openGoalModal();
    });
}

function setupForms() {
    // Result form
    document.getElementById('form-result').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const goalId = document.getElementById('result-goal').value;
        const goal = currentGoals.find(g => g.id === goalId);
        if (!goal) return;

        const rawVal = document.getElementById('result-value').value;
        const parsedVal = goal.unit.toLowerCase() === 'time' ? Utils.parseTime(rawVal) : Number(rawVal);
        
        if (isNaN(parsedVal) || parsedVal < 0) {
            alert('Invalid result value');
            return;
        }

        const result = {
            id: document.getElementById('result-id').value || Utils.generateId(),
            goalId: goalId,
            date: document.getElementById('result-date').value,
            rawResult: parsedVal,
            note: document.getElementById('result-note').value,
            timestamp: Date.now()
        };

        await DB.saveResult(result);
        document.getElementById('modal-result').classList.remove('active');
        await refreshData();
    });

    // Goal form
    document.getElementById('form-goal').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const unit = document.getElementById('goal-unit').value;
        const isTime = unit.toLowerCase() === 'time';
        
        const rawBaseline = document.getElementById('goal-baseline').value;
        const rawTarget = document.getElementById('goal-target').value;
        
        const parsedBaseline = isTime ? Utils.parseTime(rawBaseline) : Number(rawBaseline);
        const parsedTarget = isTime ? Utils.parseTime(rawTarget) : Number(rawTarget);

        if (isNaN(parsedBaseline) || isNaN(parsedTarget)) {
            alert('Invalid baseline or target values');
            return;
        }

        const goal = {
            id: document.getElementById('goal-id').value || Utils.generateId(),
            name: document.getElementById('goal-name').value,
            unit: unit,
            type: document.getElementById('goal-type').value,
            baseline: parsedBaseline,
            target: parsedTarget,
            createdAt: document.getElementById('goal-id').value ? undefined : Date.now()
        };
        
        // Retain original createdAt if editing
        if (document.getElementById('goal-id').value) {
            const existing = await DB.getGoal(goal.id);
            if (existing) goal.createdAt = existing.createdAt;
        }

        await DB.saveGoal(goal);
        document.getElementById('modal-goal').classList.remove('active');
        await refreshData();
    });

    // Goal unit change updates labels dynamically
    document.getElementById('goal-unit').addEventListener('input', (e) => {
        const isTime = e.target.value.toLowerCase() === 'time';
        document.getElementById('goal-baseline').placeholder = isTime ? 'e.g. 30:00' : 'Starting value';
        document.getElementById('goal-target').placeholder = isTime ? 'e.g. 20:00' : 'Target value';
    });
}

function setupSettings() {
    document.getElementById('btn-export').addEventListener('click', async () => {
        const json = await DB.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GoalTrackerBackup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    document.getElementById('btn-import').addEventListener('click', () => {
        document.getElementById('file-import').click();
    });

    document.getElementById('file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (confirm("This will overwrite all existing data. Are you sure?")) {
                try {
                    await DB.importData(e.target.result);
                    alert("Import successful!");
                    await refreshData();
                } catch (err) {
                    alert("Import failed: " + err.message);
                }
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // reset
    });

    document.getElementById('btn-clear-data').addEventListener('click', async () => {
        if (confirm("WARNING: This will permanently delete ALL goals and history. Are you absolutely sure?")) {
            await DB.clearAll();
            localStorage.removeItem('app_initialized');
            await refreshData();
        }
    });
}

async function refreshData() {
    currentGoals = await DB.getGoals();
    
    // Update goal select in result modal
    const select = document.getElementById('result-goal');
    select.innerHTML = currentGoals.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    
    renderGoalsList();
    renderHistoryList();
    renderChart();
}

function openResultModal(resultId = null) {
    if (currentGoals.length === 0) {
        alert("Please create a goal first!");
        return;
    }

    const form = document.getElementById('form-result');
    const title = document.getElementById('modal-result-title');
    
    if (resultId) {
        title.textContent = 'Edit Result';
        DB.getResults().then(results => {
            const res = results.find(r => r.id === resultId);
            if (res) {
                const goal = currentGoals.find(g => g.id === res.goalId);
                document.getElementById('result-id').value = res.id;
                document.getElementById('result-goal').value = res.goalId;
                document.getElementById('result-date').value = res.date;
                document.getElementById('result-note').value = res.note || '';
                
                const displayVal = (goal && goal.unit.toLowerCase() === 'time') ? Utils.formatTime(res.rawResult) : res.rawResult;
                document.getElementById('result-value').value = displayVal;
            }
        });
    } else {
        title.textContent = 'Add Result';
        form.reset();
        document.getElementById('result-id').value = '';
        
        // Default to today using local timezone formatting trick
        const today = new Date();
        const localDateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        document.getElementById('result-date').value = localDateStr;
    }
    
    // Update label based on currently selected goal
    updateResultValueLabel();
    document.getElementById('result-goal').addEventListener('change', updateResultValueLabel);
    
    document.getElementById('modal-result').classList.add('active');
}

function updateResultValueLabel() {
    const goalId = document.getElementById('result-goal').value;
    const goal = currentGoals.find(g => g.id === goalId);
    if (goal) {
        document.getElementById('result-value-label').textContent = `Result (${goal.unit})`;
        const isTime = goal.unit.toLowerCase() === 'time';
        document.getElementById('result-value').placeholder = isTime ? 'e.g. 30:15' : 'e.g. 100';
    }
}

function openGoalModal(goalId = null) {
    const form = document.getElementById('form-goal');
    const title = document.getElementById('modal-goal-title');
    
    if (goalId) {
        title.textContent = 'Edit Goal';
        const goal = currentGoals.find(g => g.id === goalId);
        if (goal) {
            document.getElementById('goal-id').value = goal.id;
            document.getElementById('goal-name').value = goal.name;
            document.getElementById('goal-unit').value = goal.unit;
            document.getElementById('goal-type').value = goal.type;
            
            const isTime = goal.unit.toLowerCase() === 'time';
            document.getElementById('goal-baseline').value = isTime ? Utils.formatTime(goal.baseline) : goal.baseline;
            document.getElementById('goal-target').value = isTime ? Utils.formatTime(goal.target) : goal.target;
        }
    } else {
        title.textContent = 'Add Goal';
        form.reset();
        document.getElementById('goal-id').value = '';
    }
    
    document.getElementById('modal-goal').classList.add('active');
}

async function renderGoalsList() {
    const container = document.getElementById('goals-list');
    if (currentGoals.length === 0) {
        container.innerHTML = '<div class="empty-state">No goals yet. Add one above.</div>';
        return;
    }
    
    let html = '';
    for (const goal of currentGoals) {
        const isTime = goal.unit.toLowerCase() === 'time';
        const baseStr = isTime ? Utils.formatTime(goal.baseline) : goal.baseline;
        const targetStr = isTime ? Utils.formatTime(goal.target) : goal.target;
        
        html += `
            <div class="card list-item">
                <h3>${goal.name}</h3>
                <p>Unit: ${goal.unit} | Target: ${targetStr} | Baseline: ${baseStr}</p>
                <p>Direction: ${goal.type === 'higher' ? 'Higher is better' : 'Lower is better'}</p>
                <div class="list-actions">
                    <button class="action-btn" onclick="openGoalModal('${goal.id}')">Edit</button>
                    <button class="action-btn danger" onclick="deleteGoal('${goal.id}')">Delete</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

window.deleteGoal = async function(id) {
    if (confirm("Are you sure you want to delete this goal AND all its history?")) {
        await DB.deleteGoal(id);
        await refreshData();
    }
};

async function renderHistoryList() {
    const container = document.getElementById('history-list');
    const results = await DB.getResults();
    
    if (results.length === 0) {
        container.innerHTML = '<div class="empty-state">No results yet. Go to Chart and press +.</div>';
        return;
    }

    let html = '';
    for (const res of results) {
        const goal = currentGoals.find(g => g.id === res.goalId);
        if (!goal) continue;

        const isTime = goal.unit.toLowerCase() === 'time';
        const displayVal = isTime ? Utils.formatTime(res.rawResult) : res.rawResult;
        const progress = Utils.calculateProgress(res.rawResult, goal.baseline, goal.target, goal.type);
        
        html += `
            <div class="list-item">
                <h3>${goal.name} <span class="history-progress" style="float:right">${progress}%</span></h3>
                <div class="history-meta">
                    <span>${Utils.formatDate(res.date)}</span>
                    <span>Result: ${displayVal} ${goal.unit}</span>
                </div>
                ${res.note ? `<p style="margin-top:4px"><em>Note: ${res.note}</em></p>` : ''}
                <div class="list-actions">
                    <button class="action-btn" onclick="openResultModal('${res.id}')">Edit</button>
                    <button class="action-btn danger" onclick="deleteResult('${res.id}')">Delete</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

window.deleteResult = async function(id) {
    if (confirm("Delete this result?")) {
        await DB.deleteResult(id);
        await refreshData();
    }
};

async function renderChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const results = await DB.getResults();
    
    // Group results by goal
    const goalDataSets = {};
    currentGoals.forEach(g => {
        goalDataSets[g.id] = [];
    });

    results.forEach(res => {
        if (goalDataSets[res.goalId]) {
            const goal = currentGoals.find(g => g.id === res.goalId);
            const progress = Utils.calculateProgress(res.rawResult, goal.baseline, goal.target, goal.type);
            
            // Append T12:00:00 so JS parses it in the local timezone at noon.
            // This prevents "YYYY-MM-DD" being parsed as UTC midnight and shifting backwards in local display.
            const chartDate = new Date(res.date + 'T12:00:00').getTime();
            
            goalDataSets[res.goalId].push({
                x: chartDate, 
                y: progress,
                rawResult: res.rawResult,
                goalName: goal.name,
                unit: goal.unit,
                originalDate: res.date
            });
        }
    });

    // Prepare Chart.js datasets
    const datasets = currentGoals.map((goal, index) => {
        // Sort chronologically for the line chart
        const data = goalDataSets[goal.id].sort((a,b) => new Date(a.x) - new Date(b.x));
        return {
            label: goal.id, // Store ID to sync with custom legend
            data: data,
            borderColor: COLORS[index % COLORS.length],
            backgroundColor: COLORS[index % COLORS.length],
            tension: 0.2, // slight curve
            borderWidth: 2,
            pointRadius: 4,
            pointHitRadius: 15,
            hidden: hiddenGoals.has(goal.id)
        };
    });

    if (mainChart) {
        mainChart.destroy();
    }

    // Determine min/max for x-axis if data exists
    const hasData = datasets.some(d => d.data.length > 0);
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false // We use custom legend
            },
            tooltip: {
                callbacks: {
                    title: (context) => {
                        return Utils.formatDate(context[0].raw.originalDate);
                    },
                    label: (context) => {
                        const point = context.raw;
                        const isTime = point.unit.toLowerCase() === 'time';
                        const displayVal = isTime ? Utils.formatTime(point.rawResult) : point.rawResult;
                        return `${point.goalName}: ${point.y}% (${displayVal} ${point.unit})`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                    displayFormats: {
                        day: 'MMM d'
                    }
                },
                ticks: {
                    source: 'auto'
                }
            },
            y: {
                min: 0,
                max: 100,
                ticks: {
                    callback: function(value) {
                        return value + '%';
                    }
                }
            }
        }
    };

    mainChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: chartOptions
    });

    renderLegend();
}

function renderLegend() {
    const container = document.getElementById('chart-legend');
    let html = '';
    currentGoals.forEach((goal, index) => {
        const isHidden = hiddenGoals.has(goal.id);
        const color = COLORS[index % COLORS.length];
        html += `
            <div class="legend-item ${isHidden ? 'hidden' : ''}" data-id="${goal.id}">
                <div class="legend-color" style="background-color: ${color}"></div>
                ${goal.name}
            </div>
        `;
    });
    container.innerHTML = html;

    container.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            if (hiddenGoals.has(id)) {
                hiddenGoals.delete(id);
            } else {
                hiddenGoals.add(id);
            }
            renderChart();
        });
    });
}
