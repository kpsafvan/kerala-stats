<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTransitStore } from '@/stores/useTransitStore';
import type { DistrictMetric } from '@/types/transit';

const store = useTransitStore();

type SortKey = 'total_flow' | 'daily_departures' | 'daily_arrivals' | 'stops_count' | 'district';
const sortField = ref<SortKey>('total_flow');
const sortOrder = ref<'asc' | 'desc'>('desc');

function toggleSort(field: SortKey) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc';
  }
}

const sortedDistricts = computed(() => {
  const list = [...store.filteredDistricts];
  list.sort((a: DistrictMetric, b: DistrictMetric) => {
    let aVal = a[sortField.value];
    let bVal = b[sortField.value];

    if (typeof aVal === 'string') {
      return sortOrder.value === 'asc'
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }

    return sortOrder.value === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });
  return list;
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
          Total scheduled bus flow, departures, arrivals, and primary transit hubs across all 14 administrative districts of Kerala and connected South Indian state districts.
        </p>
      </div>
      <div class="sort-helper">
        <span class="sort-label">Sorted by:</span>
        <button
          v-for="opt in [
            { key: 'total_flow', label: 'Total Flow' },
            { key: 'daily_departures', label: 'Departures' },
            { key: 'daily_arrivals', label: 'Arrivals' },
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
                Daily Departures
                <span v-if="sortField === 'daily_departures'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('daily_arrivals')" class="text-right">
                Daily Arrivals
                <span v-if="sortField === 'daily_arrivals'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('total_flow')" class="text-right">
                Total Daily Flow
                <span v-if="sortField === 'total_flow'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
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
              <td class="text-right number-cell departures-col">{{ d.daily_departures.toLocaleString() }}</td>
              <td class="text-right number-cell arrivals-col">{{ d.daily_arrivals.toLocaleString() }}</td>
              <td class="text-right number-cell flow-col">
                <strong>{{ d.total_flow.toLocaleString() }}</strong>
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
</style>
