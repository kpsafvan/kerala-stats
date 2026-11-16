<script setup lang="ts">
import { useTransitStore, type AppTab } from '@/stores/useTransitStore';

const store = useTransitStore();

const regions = [
  { key: 'All', label: 'All Regions' },
  { key: 'North Kerala', label: 'North Kerala (Malabar)', color: '#10b981' },
  { key: 'Central Kerala', label: 'Central Kerala', color: '#3b82f6' },
  { key: 'South Kerala', label: 'South Kerala (Travancore)', color: '#f59e0b' },
  { key: 'Inter-State', label: 'South India Hubs (TN, KA)', color: '#8b5cf6' }
];

const tabs: { key: AppTab; label: string; icon: string }[] = [
  { key: 'map', label: 'Network Map', icon: '🗺️' },
  { key: 'analytics', label: 'Regional & Fleet Analytics', icon: '📊' },
  { key: 'districts', label: 'District Flow', icon: '🏛️' },
  { key: 'corridors', label: 'Busiest Corridors', icon: '⚡' }
];
</script>

<template>
  <header class="app-header">
    <div class="header-top">
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="15" rx="2" />
            <path d="M4 11h16" />
            <path d="M8 15h.01" />
            <path d="M16 15h.01" />
            <path d="M6 19v2" />
            <path d="M18 19v2" />
          </svg>
        </div>
        <div>
          <h1 class="brand-title">KSRTC Kerala Transit Analytics</h1>
          <p class="brand-sub">Daily Network Graph &bull; Strictly Restricted to South Indian States</p>
        </div>
      </div>

      <!-- Quick Summary Pills -->
      <div v-if="store.summary" class="header-summary">
        <div class="summary-pill">
          <span class="pill-dot"></span>
          <span><strong>{{ store.summary.total_daily_network_volume.toLocaleString() }}</strong> daily bus trips</span>
        </div>
        <div class="summary-pill secondary">
          <span><strong>{{ store.summary.total_stops_vertices }}</strong> transit hubs</span>
        </div>
        <div class="summary-pill secondary">
          <span><strong>{{ store.summary.total_corridors_edges }}</strong> corridors</span>
        </div>
        <div class="summary-pill warning-pill" title="Unofficial hobby project based on public data with approximations">
          <span>⚠️ Unofficial &bull; For Fun</span>
        </div>
      </div>
    </div>

    <!-- Navigation & Filter Bar -->
    <div class="header-controls">
      <!-- Tabs Navigation -->
      <nav class="nav-tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['tab-btn', { active: store.activeTab === t.key }]"
          @click="store.setActiveTab(t.key)"
        >
          <span class="tab-icon">{{ t.icon }}</span>
          <span>{{ t.label }}</span>
        </button>
      </nav>

      <!-- Global Filter Controls -->
      <div class="filter-controls">
        <!-- Region Pills -->
        <div class="region-pills">
          <button
            v-for="r in regions"
            :key="r.key"
            :class="['region-pill', { active: store.selectedRegion === r.key }]"
            @click="store.setSelectedRegion(r.key)"
          >
            <span
              v-if="r.color"
              class="region-color-indicator"
              :style="{ backgroundColor: r.color }"
            ></span>
            <span>{{ r.label }}</span>
          </button>
        </div>

        <!-- Service Type Dropdown -->
        <div class="service-select-wrapper">
          <label for="service-select" class="control-label">Service:</label>
          <select
            id="service-select"
            v-model="store.selectedServiceType"
            class="service-select"
          >
            <option
              v-for="st in store.serviceTypes"
              :key="st"
              :value="st"
            >
              {{ st }}
            </option>
          </select>
        </div>

        <!-- Reset Button -->
        <button
          v-if="store.selectedRegion !== 'All' || store.selectedServiceType !== 'All' || store.searchQuery"
          class="reset-btn"
          title="Reset all filters"
          @click="store.resetFilters()"
        >
          Reset
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(225, 29, 72, 0.3);
}

.brand-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.brand-sub {
  font-size: 0.775rem;
  color: #64748b;
  margin: 0;
}

.header-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.summary-pill {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  color: #1e293b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
}

.summary-pill.secondary {
  color: #64748b;
}

.summary-pill.warning-pill {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
  font-weight: 600;
  font-size: 0.75rem;
}

.pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.header-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.nav-tabs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.tab-btn.active {
  background: #0f172a;
  color: #ffffff;
}

.tab-icon {
  font-size: 1rem;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.region-pills {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #f1f5f9;
  padding: 0.25rem;
  border-radius: 8px;
}

.region-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  background: transparent;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.region-pill:hover {
  color: #0f172a;
}

.region-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.region-color-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.service-select-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.control-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.service-select {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #1e293b;
  cursor: pointer;
  outline: none;
}

.service-select:focus {
  border-color: #3b82f6;
}

.reset-btn {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.reset-btn:hover {
  background: #fecaca;
}

@media (max-width: 900px) {
  .header-summary {
    display: none;
  }
  .header-controls {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .header-controls {
    display: none; /* Replaced by mobile bottom navigation and map FAB */
  }

  .header-top {
    padding: 0.55rem 1rem;
  }

  .brand {
    gap: 0.6rem;
  }

  .brand-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
  }

  .brand-icon svg {
    width: 18px;
    height: 18px;
  }

  .brand-title {
    font-size: 0.975rem;
    line-height: 1.2;
  }

  .brand-sub {
    font-size: 0.7rem;
  }
}
</style>
