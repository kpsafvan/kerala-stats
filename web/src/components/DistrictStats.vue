<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTransitStore } from '@/stores/useTransitStore';
import type { DistrictMetric } from '@/types/transit';

const store = useTransitStore();

type SortKey = 'total_flow' | 'daily_departures' | 'daily_arrivals' | 'enroute_transit' | 'stops_count' | 'district' | 'state_share';
type TerritoryScope = 'kerala' | 'all' | 'interstate';

const sortField = ref<SortKey>('total_flow');
const sortOrder = ref<'asc' | 'desc'>('desc');
const territoryScope = ref<TerritoryScope>('kerala');

function toggleSort(field: SortKey) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc';
  }
}

const sortedDistricts = computed(() => {
  const filtered = store.filteredDistricts.filter(d => {
    if (territoryScope.value === 'kerala') return d.state === 'Kerala';
    if (territoryScope.value === 'interstate') return d.state !== 'Kerala';
    return true;
  });

  filtered.sort((a: DistrictMetric, b: DistrictMetric) => {
    let aVal = a[sortField.value] ?? 0;
    let bVal = b[sortField.value] ?? 0;

    if (typeof aVal === 'string') {
      return sortOrder.value === 'asc'
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }

    return sortOrder.value === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });
  return filtered;
});

function getRegionBadgeClass(region: string): string {
  if (region === 'North Kerala') return 'badge-north';
  if (region === 'Central Kerala') return 'badge-central';
  if (region === 'South Kerala') return 'badge-south';
  return 'badge-interstate';
}
</script>

<template>
  <div class="district-stats-container">
    <div class="section-intro">
      <div>
        <h2 class="section-heading">District Mobility Dynamics</h2>
        <p class="section-desc">
          Distinct daily bus volume, scheduled departures, arrivals, and primary transit hubs across all 14 administrative districts of Kerala and connected South Indian state corridors.
        </p>
      </div>
      <div class="controls-toolbar">
        <!-- Territory Scope Filter -->
        <div class="mode-toggle-pill">
          <span class="mode-label">Scope:</span>
          <div class="mode-btns">
            <button
              type="button"
              :class="['mode-chip', { active: territoryScope === 'kerala' }]"
              @click="territoryScope = 'kerala'"
            >
              🌴 Kerala (14)
            </button>
            <button
              type="button"
              :class="['mode-chip', { active: territoryScope === 'interstate' }]"
              @click="territoryScope = 'interstate'"
            >
              🗺️ Inter-State (19)
            </button>
            <button
              type="button"
              :class="['mode-chip', { active: territoryScope === 'all' }]"
              @click="territoryScope = 'all'"
            >
              All (33)
            </button>
          </div>
        </div>

        <!-- Metric Mode Filter -->
        <div class="mode-toggle-pill">
          <span class="mode-label">Mode:</span>
          <div class="mode-btns">
            <button
              type="button"
              :class="['mode-chip', { active: store.hubMetricMode === 'terminal' }]"
              @click="store.setHubMetricMode('terminal')"
              title="Official timetable originating & terminating schedules"
            >
              🏢 Terminal Hubs
            </button>
            <button
              type="button"
              :class="['mode-chip', { active: store.hubMetricMode === 'movements' }]"
              @click="store.setHubMetricMode('movements')"
              title="Total corridor departures & arrivals including en-route calls"
            >
              🔄 Total Movements
            </button>
          </div>
        </div>

        <div class="sort-helper">
          <span class="sort-label">Sorted by:</span>
          <button
            v-for="opt in [
              { key: 'total_flow', label: 'Buses Operating' },
              { key: 'daily_departures', label: 'Departures' },
              { key: 'daily_arrivals', label: 'Arrivals' },
              { key: 'enroute_transit', label: 'En-Route' },
              { key: 'stops_count', label: 'Stops' }
            ]"
            :key="opt.key"
            :class="['sort-chip', { active: sortField === opt.key }]"
            @click="toggleSort(opt.key as SortKey)"
          >
            {{ opt.label }}
            <span v-if="sortField === opt.key">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- District Table -->
    <div class="table-card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th @click="toggleSort('district')">
                District / Territory
                <span v-if="sortField === 'district'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th>Region</th>
              <th @click="toggleSort('stops_count')" class="text-right">
                Stops
                <span v-if="sortField === 'stops_count'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('daily_departures')" class="text-right">
                {{ store.hubMetricMode === 'terminal' ? 'Origin Dep' : 'Outbound Dep' }}
                <span v-if="sortField === 'daily_departures'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('daily_arrivals')" class="text-right">
                {{ store.hubMetricMode === 'terminal' ? 'Dest Arr' : 'Inbound Arr' }}
                <span v-if="sortField === 'daily_arrivals'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('enroute_transit')" class="text-right">
                En-Route Transit
                <span v-if="sortField === 'enroute_transit'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('total_flow')" class="text-right">
                {{ store.hubMetricMode === 'terminal' ? 'Buses Operating' : 'Total Movements' }}
                <span v-if="sortField === 'total_flow'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('state_share')" class="text-right">
                State Share
                <span v-if="sortField === 'state_share'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th>Top Transit Hubs</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in sortedDistricts"
              :key="d.district"
              class="table-row"
            >
              <td class="district-name-cell">
                <div class="district-name-flex">
                  <strong>{{ d.district }}</strong>
                  <span v-if="d.state" class="state-mini-badge">{{ d.state }}</span>
                </div>
              </td>
              <td>
                <span :class="['badge-pill', getRegionBadgeClass(d.region)]">
                  {{ d.region }}
                </span>
              </td>
              <td class="text-right number-cell">{{ d.stops_count }}</td>
              <td class="text-right number-cell departures-col">
                {{ (store.hubMetricMode === 'terminal' ? d.daily_departures : (d.total_movement_flow ? Math.round(d.total_movement_flow / 2) : d.daily_departures)).toLocaleString() }}
              </td>
              <td class="text-right number-cell arrivals-col">
                {{ (store.hubMetricMode === 'terminal' ? d.daily_arrivals : (d.total_movement_flow ? Math.round(d.total_movement_flow / 2) : d.daily_arrivals)).toLocaleString() }}
              </td>
              <td class="text-right number-cell transit-col">
                {{ (d.enroute_transit || 0).toLocaleString() }}
              </td>
              <td class="text-right number-cell flow-col">
                <strong>{{ (store.hubMetricMode === 'terminal' ? (d.distinct_daily_buses ?? d.total_flow) : (d.total_movement_flow ?? d.total_flow)).toLocaleString() }}</strong>
              </td>
              <td class="text-right number-cell share-col">
                <span v-if="d.state_share" class="share-badge">{{ d.state_share }}%</span>
                <span v-else>-</span>
              </td>
              <td>
                <div class="hub-pills">
                  <span
                    v-for="hub in d.top_hubs.slice(0, 3)"
                    :key="hub.stop"
                    class="hub-pill"
                    :title="`${hub.stop}: ${hub.total} daily bus volume`"
                  >
                    {{ hub.stop }} ({{ hub.total }})
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.district-stats-container {
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

.controls-toolbar {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.mode-toggle-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mode-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.mode-btns {
  display: flex;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  border: 1px solid #e2e8f0;
}

.mode-chip {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border: none;
  background: transparent;
  color: #475569;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.mode-chip.active {
  background: #0284c7;
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sort-helper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.sort-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.sort-chip {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sort-chip.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.table-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;
  text-align: left;
}

.data-table th {
  background: #f8fafc;
  padding: 0.85rem 1rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.data-table th:hover {
  background: #f1f5f9;
}

.data-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
}

.table-row:hover {
  background: #f8fafc;
}

.text-right {
  text-align: right;
}

.number-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.825rem;
}

.departures-col {
  color: #0284c7;
}

.arrivals-col {
  color: #7c3aed;
}

.flow-col {
  color: #e11d48;
}

.district-name-cell {
  color: #0f172a;
  font-size: 0.875rem;
}

.district-name-flex {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.state-mini-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.badge-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  display: inline-block;
  white-space: nowrap;
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

.hub-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.hub-pill {
  font-size: 0.725rem;
  background: #f1f5f9;
  color: #334155;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
}

.transit-col {
  color: #0284c7;
  font-weight: 600;
}

.share-col {
  font-weight: 700;
}

.share-badge {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
}
</style>
