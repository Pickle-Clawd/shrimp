let currentRange = 'today';
let refreshInterval;
let countdown = 30;

const chartColors = {
  accent: '#FF6B4A',
  blue: '#3b82f6',
  green: '#10b981',
  purple: '#8b5cf6',
  yellow: '#f59e0b',
  pink: '#ec4899',
  cyan: '#06b6d4',
  red: '#ef4444',
};

const palette = [
  chartColors.accent, chartColors.blue, chartColors.green,
  chartColors.purple, chartColors.yellow, chartColors.pink,
  chartColors.cyan, chartColors.red
];

Chart.defaults.color = '#8892a4';
Chart.defaults.borderColor = '#1e293b';
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

let activityChart, messageChart, toolsChart, activityBreakdownChart;

function initCharts() {
  const lineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { grid: { color: '#1e293b' } },
      y: { grid: { color: '#1e293b' }, beginAtZero: true }
    }
  };

  activityChart = new Chart(document.getElementById('activityChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Active',
          data: [],
          borderColor: chartColors.green,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Idle',
          data: [],
          borderColor: chartColors.blue,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
        }
      ]
    },
    options: lineOpts
  });

  messageChart = new Chart(document.getElementById('messageChart'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Messages',
        data: [],
        backgroundColor: chartColors.accent + 'cc',
        borderColor: chartColors.accent,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: lineOpts
  });

  toolsChart = new Chart(document.getElementById('toolsChart'), {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: palette,
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8 }
        }
      }
    }
  });

  activityBreakdownChart = new Chart(document.getElementById('activityBreakdownChart'), {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Idle'],
      datasets: [{
        data: [0, 0],
        backgroundColor: [chartColors.green, chartColors.blue],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8 }
        }
      }
    }
  });
}

async function fetchStats() {
  try {
    const [statsRes, timelineRes] = await Promise.all([
      fetch(`/api/stats?range=${currentRange}`),
      fetch(`/api/stats/timeline?range=${currentRange}`)
    ]);
    const stats = await statsRes.json();
    const timeline = await timelineRes.json();

    // Update stat cards
    document.getElementById('total-messages').textContent = stats.messages.total.toLocaleString();
    document.getElementById('inbound-messages').textContent = stats.messages.inbound.toLocaleString();
    document.getElementById('outbound-messages').textContent = stats.messages.outbound.toLocaleString();
    document.getElementById('total-sessions').textContent = stats.sessions.total.toLocaleString();
    document.getElementById('total-activity').textContent = stats.activity.total.toLocaleString();
    document.getElementById('active-count').textContent = stats.activity.active.toLocaleString();
    document.getElementById('idle-count').textContent = stats.activity.idle.toLocaleString();
    document.getElementById('sub-agents').textContent = stats.sessions.sub_agents_spawned.toLocaleString();

    // Last activity
    if (stats.activity.last) {
      const ago = timeAgo(new Date(stats.activity.last.timestamp + 'Z'));
      document.getElementById('last-activity').textContent = `Last activity: ${stats.activity.last.status} (${ago})`;
    }

    // Activity timeline chart
    activityChart.data.labels = timeline.activity.map(d => d.period);
    activityChart.data.datasets[0].data = timeline.activity.map(d => d.active);
    activityChart.data.datasets[1].data = timeline.activity.map(d => d.idle);
    activityChart.update();

    // Message chart
    messageChart.data.labels = timeline.messages.map(d => d.period);
    messageChart.data.datasets[0].data = timeline.messages.map(d => d.total);
    messageChart.update();

    // Tools chart
    toolsChart.data.labels = stats.tools.map(t => t.tool_name);
    toolsChart.data.datasets[0].data = stats.tools.map(t => t.total);
    toolsChart.update();

    // Activity breakdown
    activityBreakdownChart.data.datasets[0].data = [stats.activity.active, stats.activity.idle];
    activityBreakdownChart.update();
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  }
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function startRefreshTimer() {
  countdown = 30;
  clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    countdown--;
    document.getElementById('refresh-timer').textContent = `Auto-refresh in ${countdown}s`;
    if (countdown <= 0) {
      fetchStats();
      countdown = 30;
    }
  }, 1000);
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRange = btn.dataset.range;
    fetchStats();
  });
});

// Init
initCharts();
fetchStats();
startRefreshTimer();
