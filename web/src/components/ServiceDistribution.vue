<script setup lang="ts">
import { computed } from 'vue';
import { useTransitStore } from '@/stores/useTransitStore';

const store = useTransitStore();

const totalDailyFleetVolume = computed(() => {
  if (!store.dataset) return 1;
  return store.dataset.service_distribution.reduce((acc, s) => acc + s.daily_bus_volume, 0);
});

function selectService(serviceType: string) {
  store.setSelectedServiceType(serviceType);
  store.setActiveTab('map');
}

function getServiceColor(type: string): string {
  if (type.includes('Super Fast') || type.includes('Premium')) return '#e11d48';
  if (type.includes('Fast Passenger') || type.includes('Ordinary')) return '#2563eb';
  if (type.includes('Deluxe') || type.includes('Express')) return '#f59e0b';
  if (type.includes('Volvo') || type.includes('AC')) return '#7c3aed';
  if (type.includes('Minnal')) return '#059669';
  return '#64748b';
}
</script>

<template>
  <div class="services-container">
    <div class="section-intro">
      <div>
        <h2 class="section-heading">KSRTC Service Fleet Breakdown</h2>
        <p class="section-desc">
          Volume and route coverage distributed across ordinary, regional express, and premium inter-city fleets.
        </p>
      </div>
    </div>

    <!-- Fleet Distribution Cards Grid -->
    <div class="services-grid">
      <div
        v-for="st in store.dataset?.service_distribution"
        :key="st.service_type"
        :class="['service-card', { active: store.selectedServiceType === st.service_type }]"
        @click="selectService(st.service_type)"
      >
        <div class="card-head">
          <span
            class="service-indicator"
            :style="{ backgroundColor: getServiceColor(st.service_type) }"
          ></span>
          <h3 class="service-name">{{ st.service_type }}</h3>
        </div>

        <div class="service-metrics">
          <div class="service-stat">
            <span class="stat-label">Daily Volume</span>
            <span class="stat-num" :style="{ color: getServiceColor(st.service_type) }">
              {{ st.daily_bus_volume.toLocaleString() }}
            </span>
            <span class="stat-sub">buses / day</span>
          </div>
          <div class="service-stat">
            <span class="stat-label">Active Routes</span>
            <span class="stat-num">{{ st.routes_count }}</span>
            <span class="stat-sub">corridors</span>
          </div>
          <div class="service-stat">
            <span class="stat-label">Trips Sampled</span>
            <span class="stat-num">{{ st.trips_count }}</span>
            <span class="stat-sub">schedules</span>
          </div>
        </div>

        <!-- Progress bar for fleet share -->
        <div class="fleet-bar-wrapper">
          <div
            class="fleet-bar-fill"
            :style="{
              width: `${Math.min(100, Math.max(4, (st.daily_bus_volume / totalDailyFleetVolume) * 100))}%`,
              backgroundColor: getServiceColor(st.service_type)
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.services-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.service-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.15s ease;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.07);
  border-color: #cbd5e1;
}

.service-card.active {
  ring: 2px solid #0f172a;
  border-color: #0f172a;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.service-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.service-name {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.service-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  background: #f8fafc;
  padding: 0.65rem 0.5rem;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

.service-stat {
  display: flex;
  flex-direction: column;
  text-align: center;
}

.stat-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.stat-num {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0.15rem 0;
}

.stat-sub {
  font-size: 0.65rem;
  color: #94a3b8;
}

.fleet-bar-wrapper {
  height: 5px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}

.fleet-bar-fill {
  height: 100%;
  border-radius: 9999px;
}
</style>
