<script setup lang="ts">
import { useTransitStore } from '@/stores/useTransitStore';
import type { NetworkEdge } from '@/types/transit';

const store = useTransitStore();

function viewCorridorOnMap(edge: NetworkEdge) {
  store.selectEdge(edge);
  store.setActiveTab('map');
}

function getRegionBadgeClass(region: string): string {
  if (region === 'North Kerala') return 'badge-north';
  if (region === 'Central Kerala') return 'badge-central';
  if (region === 'South Kerala') return 'badge-south';
  return 'badge-interstate';
}
</script>

<template>
  <div class="corridors-container">
    <div class="section-intro">
      <div>
        <h2 class="section-heading">Busiest Transit Corridors</h2>
        <p class="section-desc">
          Top arterial links across Kerala ranked by daily bus frequency, passenger movement capacity, and service density.
        </p>
      </div>
    </div>

    <!-- Corridors List -->
    <div class="corridors-grid">
      <div
        v-for="(edge, idx) in store.dataset?.top_corridors"
        :key="`${edge.from}-${edge.to}`"
        class="corridor-card"
        @click="viewCorridorOnMap(edge)"
      >
        <div class="corridor-rank">
          #{{ idx + 1 }}
        </div>

        <div class="corridor-main">
          <div class="route-header">
            <div class="route-nodes">
              <span class="node-name">{{ edge.from }}</span>
              <span class="route-arrow">&rarr;</span>
              <span class="node-name">{{ edge.to }}</span>
            </div>
            <div class="daily-volume-tag">
              <span class="vol-num">{{ edge.daily_buses }}</span>
              <span class="vol-unit">buses / day</span>
            </div>
          </div>

          <div class="corridor-meta">
            <div class="meta-districts">
              <span>{{ edge.from_district }}</span>
              <span class="arrow-small">&rarr;</span>
              <span>{{ edge.to_district }}</span>
            </div>
            <div class="meta-regions">
              <span :class="['badge-pill', getRegionBadgeClass(edge.from_region)]">
                {{ edge.from_region }}
              </span>
              <span v-if="edge.from_region !== edge.to_region" class="inter-arrow">&rarr;</span>
              <span
                v-if="edge.from_region !== edge.to_region"
                :class="['badge-pill', getRegionBadgeClass(edge.to_region)]"
              >
                {{ edge.to_region }}
              </span>
            </div>
          </div>

          <!-- Service types running on this corridor -->
          <div v-if="edge.services && Object.keys(edge.services).length > 0" class="services-row">
            <span
              v-for="(buses, stype) in edge.services"
              :key="stype"
              class="service-chip"
            >
              {{ stype }} ({{ buses }})
            </span>
          </div>
        </div>

        <button class="inspect-btn" title="Inspect on Map">
          &rarr;
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.corridors-container {
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

.corridors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1rem;
}

.corridor-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.15s ease;
}

.corridor-card:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.corridor-rank {
  font-size: 1.1rem;
  font-weight: 800;
  color: #94a3b8;
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}

.corridor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.route-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.route-nodes {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.node-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.route-arrow {
  color: #94a3b8;
  font-weight: 600;
}

.daily-volume-tag {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  flex-shrink: 0;
}

.vol-num {
  font-size: 1rem;
  font-weight: 800;
  color: #e11d48;
}

.vol-unit {
  font-size: 0.65rem;
  font-weight: 600;
  color: #e11d48;
  text-transform: uppercase;
}

.corridor-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.775rem;
  color: #64748b;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.meta-districts {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.arrow-small {
  color: #cbd5e1;
}

.meta-regions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.inter-arrow {
  font-size: 0.7rem;
  color: #94a3b8;
}

.badge-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
  display: inline-block;
}

.badge-north {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.badge-central {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.badge-south {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.badge-interstate {
  background: #faf5ff;
  color: #7c3aed;
  border: 1px solid #e9d5ff;
}

.services-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.service-chip {
  font-size: 0.7rem;
  background: #f1f5f9;
  color: #334155;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.inspect-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.12s;
}

.corridor-card:hover .inspect-btn {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}
</style>
