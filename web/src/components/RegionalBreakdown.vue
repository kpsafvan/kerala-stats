<script setup lang="ts">
import { useTransitStore } from '@/stores/useTransitStore';

const store = useTransitStore();

function selectRegion(regionKey: string) {
  store.setSelectedRegion(regionKey);
  store.setActiveTab('map');
}
</script>

<template>
  <div class="regional-container">
    <div class="section-intro">
      <div class="intro-text">
        <h2 class="section-heading">Regional Transit Architecture</h2>
        <p class="section-desc">
          Comparative mobility metrics dissecting Kerala into North Kerala (Malabar), Central Kerala, South Kerala (Travancore), and Cross-Border South Indian Corridors (Tamil Nadu & Karnataka).
        </p>
      </div>
      <div class="total-flow-badge">
        <span class="label">Total Network Volume</span>
        <span class="val">{{ store.summary?.total_daily_network_volume.toLocaleString() }} buses/day</span>
      </div>
    </div>

    <!-- Comparative Flow Share Bar -->
    <div class="flow-distribution-bar">
      <div
        v-for="r in store.regionalBreakdown"
        :key="r.regionKey"
        class="flow-segment"
        :style="{
          width: `${r.flowShare}%`,
          backgroundColor: r.color
        }"
        :title="`${r.name}: ${r.dailyDepartures} daily departures (${r.flowShare}%)`"
      >
        <span v-if="r.flowShare > 8" class="segment-label">{{ r.name.split(' ')[0] }} ({{ r.flowShare }}%)</span>
      </div>
    </div>

    <!-- 4 Regional Cards Grid -->
    <div class="regions-grid">
      <div
        v-for="r in store.regionalBreakdown"
        :key="r.regionKey"
        :class="['region-card', { active: store.selectedRegion === r.regionKey }]"
        :style="{ borderTopColor: r.color }"
      >
        <div class="card-top">
          <div>
            <span class="region-badge" :style="{ backgroundColor: `${r.color}15`, color: r.color, borderColor: `${r.color}40` }">
              {{ r.regionKey }}
            </span>
            <h3 class="region-card-title">{{ r.name }}</h3>
          </div>
          <button
            class="view-on-map-btn"
            :style="{ borderColor: r.color, color: r.color }"
            @click="selectRegion(r.regionKey)"
          >
            Filter Region &rarr;
          </button>
        </div>

        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-label">Daily Departures</span>
            <span class="stat-val">{{ r.dailyDepartures.toLocaleString() }}</span>
            <span class="stat-unit">buses / day</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Transit Hubs</span>
            <span class="stat-val">{{ r.stopsCount }}</span>
            <span class="stat-unit">stops</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">State Flow Share</span>
            <span class="stat-val" :style="{ color: r.color }">{{ r.flowShare }}%</span>
            <span class="stat-unit">of total</span>
          </div>
        </div>

        <div class="districts-covered">
          <span class="districts-label">Constituent Districts / Nodes:</span>
          <div class="district-tags">
            <span
              v-for="d in r.districts"
              :key="d"
              class="district-tag"
            >
              {{ d }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.regional-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
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
  line-height: 1.5;
}

.total-flow-badge {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.65rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.total-flow-badge .label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.total-flow-badge .val {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
}

/* Distribution Bar */
.flow-distribution-bar {
  display: flex;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.flow-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 0.5rem;
  transition: opacity 0.15s ease;
}

.flow-segment:hover {
  opacity: 0.9;
}

/* Regional Grid */
.regions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.region-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-top-width: 4px;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.region-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.07);
}

.region-card.active {
  ring: 2px solid #0f172a;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.region-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  text-transform: uppercase;
  display: inline-block;
  margin-bottom: 0.35rem;
}

.region-card-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.view-on-map-btn {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.65rem;
  background: #ffffff;
  border: 1px solid;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.view-on-map-btn:hover {
  background: #f8fafc;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

.stat-item {
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

.stat-val {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0.2rem 0;
}

.stat-unit {
  font-size: 0.65rem;
  color: #94a3b8;
}

.districts-covered {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.districts-label {
  font-size: 0.725rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.district-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.district-tag {
  font-size: 0.725rem;
  background: #f1f5f9;
  color: #334155;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}
</style>
