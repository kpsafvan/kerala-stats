<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
import { useTransitStore } from '@/stores/useTransitStore';

Chart.register(...registerables);

const store = useTransitStore();
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

function renderChart() {
  if (!chartCanvas.value || !store.dataset) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const hourlyData = store.dataset.hourly_distribution;
  const labels = hourlyData.map((d) => d.hour);
  const data = hourlyData.map((d) => d.trips);

  // Dynamic bar colors highlighting morning, evening, and night
  const backgroundColors = hourlyData.map((d) => {
    const hour = parseInt(d.hour.split(':')[0], 10);
    if ((hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 20)) {
      return 'rgba(225, 29, 72, 0.85)'; // Peak red
    }
    if (hour >= 21 || hour <= 4) {
      return 'rgba(99, 102, 241, 0.75)'; // Night indigo
    }
    return 'rgba(59, 130, 246, 0.75)'; // Midday blue
  });

  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Scheduled Departures',
          data: data,
          backgroundColor: backgroundColors,
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title: (items) => `Departure Window: ${items[0].label}`,
            label: (item) => ` ${item.raw} scheduled bus trips`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: 'JetBrains Mono',
              size: 11
            },
            color: '#64748b'
          }
        },
        y: {
          grid: {
            color: '#f1f5f9'
          },
          ticks: {
            font: {
              size: 11
            },
            color: '#64748b'
          }
        }
      }
    }
  });
}

onMounted(() => {
  renderChart();
});

watch(
  () => store.dataset,
  () => {
    renderChart();
  }
);
</script>

<template>
  <div class="hourly-container">
    <div class="section-intro">
      <div>
        <h2 class="section-heading">24-Hour Departure Frequency Profile</h2>
        <p class="section-desc">
          Hourly distribution of bus departures highlighting morning/evening rush hours and overnight inter-city operations.
        </p>
      </div>

      <div class="legend-tags">
        <span class="legend-tag peak">
          <span class="dot peak-dot"></span> Peak Windows (6-9 AM &amp; 4-8 PM)
        </span>
        <span class="legend-tag regular">
          <span class="dot regular-dot"></span> Midday Services
        </span>
        <span class="legend-tag night">
          <span class="dot night-dot"></span> Overnight Services
        </span>
      </div>
    </div>

    <!-- Chart Canvas Container -->
    <div class="chart-card">
      <div class="canvas-wrapper">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>

    <!-- Peak Analysis Insight Cards -->
    <div class="insights-grid">
      <div class="insight-box">
        <div class="insight-icon">🌅</div>
        <div>
          <h4 class="insight-title">Morning Commuter Rush</h4>
          <p class="insight-body">
            Surge of Fast Passenger and Super Fast connections between 06:00 and 09:00 connecting suburban districts to regional employment hubs.
          </p>
        </div>
      </div>
      <div class="insight-box">
        <div class="insight-icon">🌆</div>
        <div>
          <h4 class="insight-title">Evening Return Corridor</h4>
          <p class="insight-body">
            Heavy concentration between 16:00 and 20:00 along arterial corridors such as Kozhikode—Ernakulam and Kollam—Thiruvananthapuram.
          </p>
        </div>
      </div>
      <div class="insight-box">
        <div class="insight-icon">🌙</div>
        <div>
          <h4 class="insight-title">Inter-City &amp; Inter-State Overnight</h4>
          <p class="insight-body">
            Deluxe, Super Express, Minnal, and Volvo fleets depart between 20:00 and 01:00 towards Bengaluru, Mysuru, and Malabar terminals.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hourly-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.section-heading {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.35rem;
  letter-spacing: -0.02em;
}

.section-desc {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  max-width: 650px;
}

.legend-tags {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.legend-tag {
  font-size: 0.725rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.peak-dot { background: #e11d48; }
.regular-dot { background: #3b82f6; }
.night-dot { background: #6366f1; }

.chart-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 320px;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.insight-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.insight-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.insight-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.25rem;
}

.insight-body {
  font-size: 0.775rem;
  color: #64748b;
  margin: 0;
  line-height: 1.45;
}
</style>
