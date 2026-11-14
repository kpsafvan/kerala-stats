<script setup lang="ts">
defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function onClose() {
  emit('close');
}
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="onClose">
    <div class="disclaimer-modal-card" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-title-group">
          <span class="warning-icon">⚠️</span>
          <div>
            <h2 id="disclaimer-title" class="modal-title">Disclaimer &amp; Limitation of Liability</h2>
            <p class="modal-subtitle">Important notice: Unofficial hobby project based on public sample data</p>
          </div>
        </div>
        <button class="modal-close-btn" @click="onClose" aria-label="Close disclaimer">&times;</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <!-- Highlight Callout -->
        <div class="highlight-callout">
          <strong>Summary:</strong> This website is built strictly for fun, educational research, and transit enthusiast exploration. It is an independent visualization of public sample data. The data <strong>contains errors, omissions, and approximations</strong>. Do not use this site for travel planning. The creators assume zero liability.
        </div>

        <div class="terms-section">
          <h3 class="terms-heading">1. Independent Hobby Project ("Just for Fun")</h3>
          <p class="terms-text">
            This platform is an independent, non-commercial, hobby and open-data visualization experiment.
            It is <strong>NOT affiliated with, sponsored by, authorized by, or in any way officially connected to</strong> the Kerala State Road Transport Corporation (KSRTC), KSRTC-SWIFT, the Motor Vehicles Department of Kerala, or the Government of Kerala. All product names, logos, trademarks, and registered trademarks are the property of their respective owners.
          </p>
        </div>

        <div class="terms-section">
          <h3 class="terms-heading">2. Public Sample Data &amp; Inherent Errors ("There will be mistakes")</h3>
          <p class="terms-text">
            All schedules, stop sequences, frequencies, and road geometries displayed on this website are compiled from publicly accessible web endpoints and automated algorithmic heuristics.
            Bus operations, timetables, and depot allocations change dynamically and frequently. <strong>This dataset will contain mistakes, inaccurate departure times, missing stops, discontinued routes, and approximated highway paths.</strong> No guarantee or representation is made as to the accuracy, completeness, or timeliness of any figure or map polyline.
          </p>
        </div>

        <div class="terms-section">
          <h3 class="terms-heading">3. Complete Limitation of Liability ("No Future Liabilities")</h3>
          <p class="terms-text">
            <strong>ALL CONTENT AND VISUALIZATIONS ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</strong>
          </p>
          <p class="terms-text">
            To the maximum extent permitted by applicable law, the creator, maintainer, hosting provider, and contributors of this application shall <strong>NOT be held liable under any legal theory</strong> (contract, tort, negligence, strict liability, or otherwise) for any direct, indirect, incidental, consequential, special, punitive, or exemplary damages or losses. This includes, without limitation:
          </p>
          <ul class="terms-list">
            <li>Missed bus departures, delays, cancellations, or lost transit connections.</li>
            <li>Stranded passengers, alternate transportation expenses, hotel costs, or re-booking fees.</li>
            <li>Loss of income, business interruption, missed appointments, or financial distress.</li>
            <li>Any reliance on coordinates, highway shapes, service categories, or bus counts displayed on this site.</li>
          </ul>
        </div>

        <div class="terms-section">
          <h3 class="terms-heading">4. Official Ticketing &amp; Real-Time Information</h3>
          <p class="terms-text">
            For official, guaranteed, real-time ticket reservations, depot contact numbers, and certified bus operations, users must exclusively visit official KSRTC channels:
          </p>
          <div class="official-links-box">
            <a href="https://onlineksrtcswift.com" target="_blank" rel="noopener noreferrer" class="official-link-btn">
              <span>🌐 Official KSRTC-SWIFT Booking (onlineksrtcswift.com)</span>
            </a>
            <a href="https://www.keralartc.com" target="_blank" rel="noopener noreferrer" class="official-link-btn">
              <span>🏛️ KSRTC Official Portal (keralartc.com)</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <span class="footer-hint">By continuing to use this site, you acknowledge and agree to this disclaimer.</span>
        <button class="accept-btn" @click="onClose">I Understand &amp; Agree</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(5px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  animation: fadeIn 0.18s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.disclaimer-modal-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
  max-width: 680px;
  width: 100%;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: scaleUp 0.18s ease-out;
}

@keyframes scaleUp {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  background: #fff1f2;
  border-bottom: 1px solid #fecdd3;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.warning-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #9f1239;
}

.modal-subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.775rem;
  color: #be123c;
}

.modal-close-btn {
  background: transparent;
  border: none;
  font-size: 1.6rem;
  line-height: 1;
  color: #9f1239;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  transition: all 0.15s;
}

.modal-close-btn:hover {
  background: #fecdd3;
  color: #881337;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  font-size: 0.85rem;
  color: #334155;
  line-height: 1.55;
}

.highlight-callout {
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
  padding: 0.85rem 1rem;
  border-radius: 6px;
  font-size: 0.825rem;
  color: #92400e;
}

.terms-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.terms-heading {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #0f172a;
}

.terms-text {
  margin: 0;
  font-size: 0.825rem;
  color: #475569;
}

.terms-list {
  margin: 0.25rem 0 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.official-links-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.official-link-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.85rem;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #0284c7;
  text-decoration: none;
  transition: all 0.15s;
}

.official-link-btn:hover {
  background: #e0f2fe;
  border-color: #38bdf8;
  color: #0369a1;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-hint {
  font-size: 0.725rem;
  color: #64748b;
  flex: 1;
}

.accept-btn {
  background: #0f172a;
  color: #ffffff;
  border: none;
  padding: 0.6rem 1.4rem;
  border-radius: 7px;
  font-weight: 700;
  font-size: 0.825rem;
  cursor: pointer;
  transition: all 0.15s;
}

.accept-btn:hover {
  background: #1e293b;
}
</style>
