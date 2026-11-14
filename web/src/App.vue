<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTransitStore } from '@/stores/useTransitStore';
import AppHeader from '@/components/AppHeader.vue';
import MetricCard from '@/components/MetricCard.vue';
import TransitMap from '@/components/TransitMap.vue';
import RegionalBreakdown from '@/components/RegionalBreakdown.vue';
import DistrictStats from '@/components/DistrictStats.vue';
import CorridorRanking from '@/components/CorridorRanking.vue';
import ServiceDistribution from '@/components/ServiceDistribution.vue';
import HourlyChart from '@/components/HourlyChart.vue';
import DisclaimerModal from '@/components/DisclaimerModal.vue';

const store = useTransitStore();
const isDisclaimerOpen = ref(false);

onMounted(() => {
  store.loadTransitData();
});
</script>

<template>
  <div class="app-layout">
    <!-- Header -->
    <AppHeader />

    <!-- Loading State -->
    <main v-if="store.isLoading" class="loading-state">
      <div class="spinner"></div>
      <p class="loading-text">Loading KSRTC Kerala transit network &amp; analytics...</p>
    </main>

    <!-- Error State -->
    <main v-else-if="store.error" class="error-state">
      <div class="error-card">
        <h2 class="error-title">Failed to Load Transit Data</h2>
        <p class="error-msg">{{ store.error }}</p>
        <button class="retry-btn" @click="store.loadTransitData()">Retry</button>
      </div>
    </main>

    <!-- Main Content Area -->
    <main v-else-if="store.isReady" class="main-content">
      <!-- High-Level KPI Summary Grid (Always visible above tabs or inside tabs) -->
      <section v-if="store.summary" class="kpi-grid">
        <MetricCard
          title="Daily Network Volume"
          :value="`${store.summary.total_daily_network_volume.toLocaleString()} buses`"
          subtitle="Aggregated daily frequencies"
          badge="Live Scheduled"
          badgeColor="emerald"
        />
        <MetricCard
          title="Active Transit Hubs"
          :value="store.summary.total_stops_vertices"
          subtitle="Bus stands &amp; junctions"
          badge="Vertices"
          badgeColor="blue"
        />
        <MetricCard
          title="Network Corridors"
          :value="store.summary.total_corridors_edges"
          subtitle="Directed arterial links"
          badge="Edges"
          badgeColor="purple"
        />
        <MetricCard
          title="Fleet Services"
          :value="store.dataset?.service_distribution.length || 18"
          subtitle="Ordinary to Multi-Axle Volvo"
          badge="Service Types"
          badgeColor="rose"
        />
        <MetricCard
          title="Busiest Corridor"
          :value="store.dataset?.top_corridors[0]?.from + ' ↔ ' + store.dataset?.top_corridors[0]?.to"
          :subtitle="`${store.dataset?.top_corridors[0]?.daily_buses} buses / day`"
          badge="Peak Route"
          badgeColor="amber"
        />
      </section>

      <!-- Active Tab Views -->
      <section class="tab-content-area">
        <!-- Tab 1: Interactive Map -->
        <div v-show="store.activeTab === 'map'" class="tab-pane">
          <TransitMap />
        </div>

        <!-- Tab 2: Regional & Fleet Analytics -->
        <div v-show="store.activeTab === 'analytics'" class="tab-pane analytics-pane">
          <RegionalBreakdown />
          <div class="analytics-divider"></div>
          <ServiceDistribution />
          <div class="analytics-divider"></div>
          <HourlyChart />
        </div>

        <!-- Tab 3: District Insights -->
        <div v-show="store.activeTab === 'districts'" class="tab-pane">
          <DistrictStats />
        </div>

        <!-- Tab 4: Top Corridors -->
        <div v-show="store.activeTab === 'corridors'" class="tab-pane">
          <CorridorRanking />
        </div>
      </section>
    </main>

    <!-- Dedicated Disclaimer Section -->
    <section class="app-disclaimer-section">
      <div class="disclaimer-inner">
        <div class="disclaimer-header-row">
          <div class="disclaimer-title-wrap">
            <span class="disclaimer-badge">Public Data &bull; For Fun &amp; Research</span>
            <h3 class="disclaimer-title">Project Disclaimer &amp; Limitation of Liability</h3>
          </div>
          <button class="open-full-legal-btn" @click="isDisclaimerOpen = true">
            View Complete Liability Waiver &rarr;
          </button>
        </div>
        <p class="disclaimer-summary-text">
          <strong>Notice:</strong> This web application is an independent, unofficial hobby project created purely for educational research, analytical experimentation, and fun. It is <strong>NOT affiliated with, sponsored by, or endorsed by KSRTC</strong> or the Government of Kerala. 
          The transit schedules, frequencies, stop sequences, and road geometries displayed are derived from public web endpoints and automated heuristics; they <strong>will contain mistakes, timing errors, and omissions</strong>. Under no circumstances shall the creator, contributors, or maintainers be held liable for any travel disruptions, missed connections, expenses, or damages. For verified, real-time bus bookings and certified timings, always refer exclusively to official channels (<a href="https://onlineksrtcswift.com" target="_blank" rel="noopener noreferrer">onlineksrtcswift.com</a> or <a href="https://www.keralartc.com" target="_blank" rel="noopener noreferrer">keralartc.com</a>).
        </p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-inner">
        <div>
          <strong>KSRTC Kerala Transit &amp; Route Network Visualization</strong>
          <p class="footer-sub">
            Data aggregated from official public booking platforms: <code>onlineksrtcswift.com</code> and <code>ksrtcedp.com</code>.
            Includes Ordinary, Limited Stop Ordinary, Fast Passenger, Super Fast, Deluxe, and Volvo fleets.
          </p>
          <button class="footer-disclaimer-link" @click="isDisclaimerOpen = true">
            ⚠️ Legal Disclaimer &amp; Limitation of Liability Terms
          </button>
        </div>
        <div class="footer-meta">
          <span>Generated: {{ store.dataset?.metadata.generated_at ? new Date(store.dataset.metadata.generated_at).toLocaleDateString() : '2026-11-14' }}</span>
          <span>Coverage: 14 Districts + Interstate (South India)</span>
          <span class="meta-tag">Unofficial Demonstration</span>
        </div>
      </div>
    </footer>

    <!-- Persistent Floating Corner Disclaimer Badge (All Pages) -->
    <aside
      class="persistent-corner-disclaimer"
      :class="{ 'offset-for-map': store.activeTab === 'map' }"
      @click="isDisclaimerOpen = true"
      title="Click to view full disclaimer and limitation of liability"
      role="button"
      tabindex="0"
      @keydown.enter="isDisclaimerOpen = true"
    >
      <span class="corner-warning-icon">⚠️</span>
      <span class="corner-disclaimer-text">Unofficial &bull; For Fun Only &bull; <strong>Disclaimer</strong></span>
    </aside>

    <!-- Full Legal Disclaimer Modal -->
    <DisclaimerModal :isOpen="isDisclaimerOpen" @close="isDisclaimerOpen = false" />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
}

.spinner {
  width: 44px;
  height: 44px;
  border: 4px solid #e2e8f0;
  border-top-color: #e11d48;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 500;
}

.error-card {
  background: #ffffff;
  border: 1px solid #fecdd3;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  max-width: 450px;
}

.error-title {
  color: #e11d48;
  margin: 0 0 0.5rem;
}

.error-msg {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0 0 1rem;
}

.retry-btn {
  background: #0f172a;
  color: #ffffff;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 1.25rem 1.5rem 0.5rem;
}

.tab-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tab-pane {
  flex: 1;
  padding: 1rem 1.5rem 2rem;
}

.tab-pane:first-child {
  padding: 0.75rem 1rem 1.5rem;
}

.analytics-pane {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.analytics-divider {
  height: 1px;
  background: #e2e8f0;
}

.app-footer {
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 1.25rem 1.5rem;
  font-size: 0.8rem;
  color: #64748b;
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.footer-sub {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
}

.footer-sub code {
  background: #f1f5f9;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.footer-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Dedicated Disclaimer Section */
.app-disclaimer-section {
  background: #fff7ed;
  border-top: 1px solid #fed7aa;
  border-bottom: 1px solid #fed7aa;
  padding: 1.25rem 1.5rem;
}

.disclaimer-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.disclaimer-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.disclaimer-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.disclaimer-badge {
  font-size: 0.675rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #ffedd5;
  color: #c2410c;
  border: 1px solid #fdba74;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.disclaimer-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #9a3412;
}

.open-full-legal-btn {
  background: #ffffff;
  border: 1px solid #ea580c;
  color: #c2410c;
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  font-size: 0.775rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.open-full-legal-btn:hover {
  background: #ea580c;
  color: #ffffff;
}

.disclaimer-summary-text {
  margin: 0;
  font-size: 0.8rem;
  color: #7c2d12;
  line-height: 1.5;
}

.disclaimer-summary-text a {
  color: #9a3412;
  font-weight: 700;
  text-decoration: underline;
}

.footer-disclaimer-link {
  background: transparent;
  border: none;
  padding: 0;
  margin-top: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #ea580c;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.footer-disclaimer-link:hover {
  text-decoration: underline;
}

.meta-tag {
  color: #c2410c;
  font-weight: 600;
  background: #ffedd5;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  margin-top: 0.2rem;
}

/* Persistent Floating Corner Disclaimer Badge (All Pages) */
.persistent-corner-disclaimer {
  position: fixed;
  bottom: 1rem;
  right: 1.25rem;
  z-index: 999;
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.persistent-corner-disclaimer:hover {
  background: #e11d48;
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(225, 29, 72, 0.35);
}

.persistent-corner-disclaimer.offset-for-map {
  right: 3.75rem; /* Clears Leaflet bottomright zoom control */
}

.corner-warning-icon {
  font-size: 0.85rem;
  line-height: 1;
}

.corner-disclaimer-text strong {
  text-decoration: underline;
}
</style>
