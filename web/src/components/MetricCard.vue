<script setup lang="ts">
defineProps<{
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
}>();
</script>

<template>
  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-title">{{ title }}</span>
      <span v-if="badge" :class="['metric-badge', badgeColor || 'blue']">
        {{ badge }}
      </span>
    </div>
    <div class="metric-value">{{ value }}</div>
    <div v-if="subtitle" class="metric-subtitle">{{ subtitle }}</div>
  </div>
</template>

<style scoped>
.metric-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.metric-title {
  font-size: 0.825rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
}

.metric-badge.emerald {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.metric-badge.blue {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.metric-badge.amber {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.metric-badge.purple {
  background: #faf5ff;
  color: #7c3aed;
  border: 1px solid #e9d5ff;
}

.metric-badge.rose {
  background: #fff1f2;
  color: #e11d48;
  border: 1px solid #fecdd3;
}

.metric-value {
  font-size: 1.85rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.metric-subtitle {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.35rem;
}
</style>
