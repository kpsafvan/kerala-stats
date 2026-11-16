<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import { useTransitStore } from '@/stores/useTransitStore';
import type { StopVertex } from '@/types/transit';

const store = useTransitStore();
const mapContainer = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let markersLayer: L.LayerGroup | null = null;
let edgesLayer: L.LayerGroup | null = null;

// Search autocomplete
const searchFocus = ref(false);

function onSearchBlur() {
  setTimeout(() => {
    searchFocus.value = false;
  }, 200);
}

// Layer and display controls
const showEdges = ref(true);
const showMarkers = ref(true);
const showLabels = ref(false);
const uniformMarkers = ref(false);
const isLegendCollapsed = ref(false);
const isolateSouthIndia = ref(true);
const directWheelZoom = ref(false);
const showScrollOverlay = ref(false);
let overlayTimer: number | null = null;
let lastZoomTime = 0;

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const modifierKey = isMac ? '⌘' : 'Ctrl';

// Mobile Sheet State
const isMobileFilterModalOpen = ref(false);
const hasActiveFilter = computed(() => {
  return store.selectedRegion !== 'All' ||
    store.minBusWeight > 0 ||
    !isolateSouthIndia.value ||
    !showEdges.value ||
    !showMarkers.value;
});

let maskLayer: L.GeoJSON | null = null;
let stateBoundaryLayer: L.GeoJSON | null = null;

const regionColors: Record<string, string> = {
  'North Kerala': '#10b981',
  'Central Kerala': '#3b82f6',
  'South Kerala': '#f59e0b',
  'Inter-State': '#8b5cf6'
};

const regionCounts = computed(() => {
  const counts: Record<string, number> = {
    'North Kerala': 0,
    'Central Kerala': 0,
    'South Kerala': 0,
    'Inter-State': 0
  };
  if (!store.dataset) return counts;
  for (const v of store.dataset.vertices) {
    if (counts[v.region] !== undefined) {
      counts[v.region]++;
    }
  }
  return counts;
});

const regionalLegendItems = computed(() => [
  { key: 'North Kerala', label: 'North Kerala (Malabar)', color: '#10b981', count: regionCounts.value['North Kerala'] || 0 },
  { key: 'Central Kerala', label: 'Central Kerala', color: '#3b82f6', count: regionCounts.value['Central Kerala'] || 0 },
  { key: 'South Kerala', label: 'South Kerala (Travancore)', color: '#f59e0b', count: regionCounts.value['South Kerala'] || 0 },
  { key: 'Inter-State', label: 'South India Hubs (TN, KA)', color: '#8b5cf6', count: regionCounts.value['Inter-State'] || 0 }
]);

const frequencyLegendItems = [
  { min: 25, label: '≥ 25 buses/day (Arterial)', color: '#e11d48', height: '5px' },
  { min: 15, label: '15 – 24 buses/day (Heavy)', color: '#f97316', height: '3.5px' },
  { min: 8, label: '8 – 14 buses/day (Medium)', color: '#6366f1', height: '2.5px' },
  { min: 0, label: 'All corridors (< 8 buses)', color: '#3b82f6', height: '1.8px' }
];

function toggleRegion(key: string) {
  if (store.selectedRegion === key) {
    store.setSelectedRegion('All');
  } else {
    store.setSelectedRegion(key);
  }
}

function setFrequencyPreset(min: number) {
  if (store.minBusWeight === min && min !== 0) {
    store.setMinBusWeight(0);
  } else {
    store.setMinBusWeight(min);
  }
}

function fitKeralaBounds() {
  if (!map) return;
  const vertices = store.filteredVertices;
  if (vertices.length > 0) {
    const bounds = L.latLngBounds(vertices.map(v => [v.lat, v.lon]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
  } else {
    map.setView([10.25, 76.4], 8, { animate: true });
  }
}

function fitSouthIndiaBounds() {
  if (!map) return;
  map.fitBounds([
    [8.0, 74.0],
    [19.8, 84.8]
  ], { padding: [40, 40] });
}

function getRegionColor(region: string): string {
  return regionColors[region] || '#64748b';
}

function getEdgeColor(buses: number): string {
  if (buses >= 25) return '#e11d48'; // High volume crimson
  if (buses >= 15) return '#f97316'; // Heavy orange
  if (buses >= 8) return '#6366f1';  // Medium indigo
  if (buses >= 3) return '#3b82f6';  // Regular blue
  return '#94a3b8';                  // Low volume slate
}

function getMarkerRadius(flow: number): number {
  if (uniformMarkers.value) return 6;
  if (flow > 400) return 14;
  if (flow > 200) return 11;
  if (flow > 80) return 8;
  if (flow > 30) return 6;
  return 4.5;
}

function initMap() {
  if (!mapContainer.value) return;

  // South Indian geographic bounding box (restricting panning strictly to South India)
  const southIndiaBounds: L.LatLngBoundsLiteral = [
    [7.2, 73.0],  // Southwest: Indian Ocean / Lakshadweep
    [20.5, 85.5]  // Northeast: Northern Telangana / Andhra Pradesh border
  ];

  // Initialize Kerala center
  map = L.map(mapContainer.value, {
    center: [10.25, 76.4],
    zoom: 8,
    minZoom: 6,
    maxZoom: 16,
    zoomControl: false,
    scrollWheelZoom: false, // Prevents scroll trapping so webpage scrolls naturally
    maxBounds: southIndiaBounds,
    maxBoundsViscosity: 1.0
  });

  // Attach non-passive wheel listener for gesture handling (Google Maps style)
  mapContainer.value.addEventListener('wheel', onMapWheel, { passive: false });
  mapContainer.value.addEventListener('mouseleave', onMapMouseLeave);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Custom pane for South India mask and boundaries (between tiles and routes)
  const maskPane = map.createPane('boundaryMaskPane');
  maskPane.style.zIndex = '350';

  // Base tile layers (100% free, no API keys required)
  const osmDetailed = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  const esriLightGray = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
  });

  const esriTopo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  });

  // Default to detailed OpenStreetMap
  osmDetailed.addTo(map);

  // Base map switcher control
  const baseLayers = {
    '🗺️ OpenStreetMap (Detailed)': osmDetailed,
    '⚪ Clean Light Gray (Esri)': esriLightGray,
    '⛰️ Topographic (Esri)': esriTopo
  };
  L.control.layers(baseLayers, undefined, { position: 'topright' }).addTo(map);

  edgesLayer = L.layerGroup().addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  loadSouthIndiaBoundaries();
  renderNetwork();
}

async function loadSouthIndiaBoundaries() {
  if (!map) return;
  try {
    const [maskRes, boundRes] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/south_india_mask.json`),
      fetch(`${import.meta.env.BASE_URL}data/south_india_boundary.json`)
    ]);
    const maskData = await maskRes.json();
    const boundData = await boundRes.json();

    maskLayer = L.geoJSON(maskData, {
      pane: 'boundaryMaskPane',
      style: {
        fillColor: '#f8fafc',
        fillOpacity: 0.96,
        color: '#475569',
        weight: 1.5,
        stroke: true
      },
      interactive: false
    });

    stateBoundaryLayer = L.geoJSON(boundData, {
      pane: 'boundaryMaskPane',
      style: {
        fill: false,
        color: '#64748b',
        weight: 1.2,
        dashArray: '4, 4',
        opacity: 0.75
      },
      interactive: false
    });

    if (isolateSouthIndia.value) {
      maskLayer.addTo(map);
      stateBoundaryLayer.addTo(map);
    }
  } catch (err) {
    console.warn('Failed to load South India boundary mask:', err);
  }
}

function renderNetwork() {
  if (!map || !markersLayer || !edgesLayer) return;

  edgesLayer.clearLayers();
  markersLayer.clearLayers();

  const edges = store.filteredEdges;
  const vertices = store.filteredVertices;

  // 1. Draw Edges
  if (showEdges.value) {
    for (const edge of edges) {
      const latlngs: [number, number][] = (edge.geometry && edge.geometry.length > 1)
        ? edge.geometry
        : [edge.from_coord, edge.to_coord];

      const isSelectedEdge = store.selectedEdge && store.selectedEdge.from === edge.from && store.selectedEdge.to === edge.to;
      const isConnectedToSelectedStop = store.selectedStop && (edge.from === store.selectedStop.name || edge.to === store.selectedStop.name);
      const hasActiveSelection = !!store.selectedStop || !!store.selectedEdge;

      let weight = Math.min(8, Math.max(2, Math.sqrt(edge.daily_buses) * 1.3));
      let color = getEdgeColor(edge.daily_buses);
      let opacity = 0.7;

      if (hasActiveSelection) {
        if (isSelectedEdge) {
          color = '#e11d48';
          weight = weight + 4;
          opacity = 1;
        } else if (isConnectedToSelectedStop) {
          color = edge.from === store.selectedStop?.name ? '#059669' : '#2563eb';
          weight = weight + 2.5;
          opacity = 0.95;
        } else {
          opacity = 0.15;
        }
      }

      const polyline = L.polyline(latlngs, {
        color: color,
        weight: weight,
        opacity: opacity,
        lineCap: 'round',
        lineJoin: 'round'
      });

      // Tooltip
      polyline.bindTooltip(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <strong>${edge.from} &rarr; ${edge.to}</strong><br/>
          Frequency: <strong>${edge.daily_buses}</strong> buses/day<br/>
          <span style="color: #64748b;">${edge.sample_trips_count} scheduled trips</span>
        </div>
      `, { sticky: true });

      polyline.on('click', () => {
        store.selectEdge(edge);
      });

      polyline.on('mouseover', (e) => {
        const layer = e.target;
        layer.setStyle({ opacity: 1, weight: weight + 2 });
      });

      polyline.on('mouseout', (e) => {
        const layer = e.target;
        layer.setStyle({ opacity: opacity, weight: weight });
      });

      edgesLayer.addLayer(polyline);
    }
  }

  // 2. Draw Stop Markers
  if (showMarkers.value) {
    const isTerminal = store.hubMetricMode === 'terminal';
    for (const v of vertices) {
      const color = getRegionColor(v.region);
      const flowVal = isTerminal ? v.total_daily_flow : (v.total_movement_flow ?? v.total_daily_flow);
      const depVal = isTerminal ? (v.origin_departures ?? v.daily_departures) : (v.movement_departures ?? v.daily_departures);
      const arrVal = isTerminal ? (v.dest_arrivals ?? v.daily_arrivals) : (v.movement_arrivals ?? v.daily_arrivals);
      const radius = getMarkerRadius(flowVal);

      const circle = L.circleMarker([v.lat, v.lon], {
        radius: radius,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85
      });

      if (showLabels.value) {
        circle.bindTooltip(`
          <span class="hub-label-text">${v.name}</span>
        `, {
          permanent: true,
          direction: 'right',
          className: 'stop-map-permanent-label',
          offset: [radius + 3, 0]
        });
      } else {
        const depLabel = isTerminal ? 'Origin Dep' : 'Outbound Dep';
        const arrLabel = isTerminal ? 'Dest Arr' : 'Inbound Arr';
        const transitInfo = isTerminal && v.transit_calls ? ` | En-route: <strong>${v.transit_calls.toLocaleString()}</strong>` : '';
        circle.bindTooltip(`
          <div style="font-family: inherit; font-size: 12px;">
            <strong>${v.name}</strong> (${v.district})<br/>
            State: <strong style="color: #0284c7;">${v.state || 'Kerala'}</strong> &bull;
            Region: <span style="font-weight: 600; color: ${color};">${v.region}</span><br/>
            ${isTerminal ? 'Physical Daily Buses' : 'Total Corridor Flow'}: <strong>${flowVal.toLocaleString()}</strong> buses/d<br/>
            <span style="font-size: 11px; color: #64748b;">${depLabel}: <strong>${depVal.toLocaleString()}</strong> | ${arrLabel}: <strong>${arrVal.toLocaleString()}</strong>${transitInfo}</span>
          </div>
        `, { direction: 'top', offset: [0, -radius] });
      }

      circle.on('click', () => {
        store.selectStop(v);
        if (map) {
          map.setView([v.lat, v.lon], Math.max(map.getZoom(), 10), { animate: true });
        }
      });

      markersLayer.addLayer(circle);
    }
  }

  // If a region is explicitly selected and vertices exist, auto-fit bounds
  if (store.selectedRegion !== 'All' && vertices.length > 0) {
    const bounds = L.latLngBounds(vertices.map(v => [v.lat, v.lon]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }
}

function handleStopSearchSelect(v: StopVertex) {
  store.selectStop(v);
  store.setSearchQuery('');
  if (map) {
    map.setView([v.lat, v.lon], 11, { animate: true });
  }
}

// Watch filters and active selections
watch(
  [
    () => store.selectedRegion,
    () => store.selectedServiceType,
    () => store.minBusWeight,
    () => store.searchQuery,
    () => store.selectedStop,
    () => store.selectedEdge,
    () => store.hubMetricMode,
    showEdges,
    showMarkers,
    showLabels,
    uniformMarkers
  ],
  () => {
    renderNetwork();
  }
);

watch(isolateSouthIndia, (val) => {
  if (!map) return;
  if (val) {
    if (maskLayer && !map.hasLayer(maskLayer)) maskLayer.addTo(map);
    if (stateBoundaryLayer && !map.hasLayer(stateBoundaryLayer)) stateBoundaryLayer.addTo(map);
  } else {
    if (maskLayer && map.hasLayer(maskLayer)) map.removeLayer(maskLayer);
    if (stateBoundaryLayer && map.hasLayer(stateBoundaryLayer)) map.removeLayer(stateBoundaryLayer);
  }
});

function onMapWheel(e: WheelEvent) {
  if (directWheelZoom.value) {
    // Direct wheel zoom mode enabled by user; Leaflet handles it natively
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    // User is intentionally holding Ctrl / Cmd: Zoom the map, prevent page zoom
    e.preventDefault();
    hideScrollOverlay();

    if (!map) return;
    const now = Date.now();
    if (now - lastZoomTime < 60) return;
    lastZoomTime = now;

    const mousePoint = map.mouseEventToContainerPoint(e);
    const currentZoom = map.getZoom();
    const zoomDelta = e.deltaY < 0 ? 1 : -1;
    const newZoom = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), currentZoom + zoomDelta));
    if (newZoom !== currentZoom) {
      map.setZoomAround(mousePoint, newZoom, { animate: true });
    }
  } else {
    // Normal scroll: DO NOT call e.preventDefault(), allowing the browser to scroll the webpage naturally!
    triggerScrollOverlay();
  }
}

function triggerScrollOverlay() {
  showScrollOverlay.value = true;
  if (overlayTimer) clearTimeout(overlayTimer);
  overlayTimer = window.setTimeout(() => {
    showScrollOverlay.value = false;
  }, 1200);
}

function hideScrollOverlay() {
  showScrollOverlay.value = false;
  if (overlayTimer) {
    clearTimeout(overlayTimer);
    overlayTimer = null;
  }
}

function onMapMouseLeave() {
  hideScrollOverlay();
}

watch(directWheelZoom, (enabled) => {
  if (!map) return;
  if (enabled) {
    map.scrollWheelZoom.enable();
    hideScrollOverlay();
  } else {
    map.scrollWheelZoom.disable();
  }
});

onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  if (mapContainer.value) {
    mapContainer.value.removeEventListener('wheel', onMapWheel);
    mapContainer.value.removeEventListener('mouseleave', onMapMouseLeave);
  }
  if (overlayTimer) {
    clearTimeout(overlayTimer);
    overlayTimer = null;
  }
  if (map) {
    map.remove();
    map = null;
    maskLayer = null;
    stateBoundaryLayer = null;
  }
});
</script>

<template>
  <div class="map-view-container">
    <!-- Overlay Map Controls Bar -->
    <div class="map-overlay-controls">
      <!-- Search Autocomplete Input -->
      <div class="search-box-wrapper">
        <div class="search-input-group">
          <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            v-model="store.searchQuery"
            placeholder="Search bus stop or district..."
            class="search-input"
            @focus="searchFocus = true"
            @blur="onSearchBlur"
          />
          <button
            v-if="store.searchQuery"
            class="clear-search-btn"
            @click="store.setSearchQuery('')"
          >
            &times;
          </button>
        </div>

        <!-- Autocomplete Suggestions Dropdown -->
        <div
          v-if="searchFocus && store.searchQuery && store.filteredVertices.length > 0"
          class="search-dropdown"
        >
          <div
            v-for="v in store.filteredVertices.slice(0, 8)"
            :key="v.id"
            class="search-item"
            @mousedown="handleStopSearchSelect(v)"
          >
            <div>
              <strong>{{ v.name }}</strong>
              <span class="search-sub">({{ v.district }} &bull; {{ v.region }})</span>
            </div>
            <span class="search-flow-badge">{{ v.total_daily_flow }} buses/d</span>
          </div>
        </div>
      </div>

      <!-- Corridor Frequency Filter Slider -->
      <div class="frequency-slider-group">
        <label class="slider-label">
          Min Daily Buses: <strong>{{ store.minBusWeight }}</strong>
        </label>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          v-model.number="store.minBusWeight"
          class="slider-input"
        />
      </div>

      <!-- Hub Metric Mode Segmented Control -->
      <div class="hub-mode-segmented-wrapper">
        <span class="mode-label-prefix">Mode:</span>
        <div class="segmented-pill-container">
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ active: store.hubMetricMode === 'terminal' }"
            @click="store.setHubMetricMode('terminal')"
            title="Scheduled originating & terminating runs from official timetable (major hubs prioritized)"
          >
            🏢 Terminal Hubs
          </button>
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ active: store.hubMetricMode === 'movements' }"
            @click="store.setHubMetricMode('movements')"
            title="Total corridor departures & arrivals including wayside highway pass-throughs"
          >
            🔄 Total Movements
          </button>
        </div>
      </div>

      <!-- Active Filter Badges -->
      <div class="active-map-badges">
        <span class="map-stat-badge">
          <strong>{{ store.filteredVertices.length }}</strong> stops visible
        </span>
        <span class="map-stat-badge">
          <strong>{{ store.filteredEdges.length }}</strong> corridors visible
        </span>
      </div>
    </div>

    <!-- Leaflet Canvas -->
    <div ref="mapContainer" class="leaflet-map-canvas"></div>

    <!-- Gesture Guidance Overlay (Google Maps Style) -->
    <transition name="gesture-fade">
      <div v-if="showScrollOverlay" class="map-gesture-overlay">
        <div class="gesture-pill">
          <span class="gesture-icon">🖱️</span>
          <span class="gesture-text">
            Use <kbd class="gesture-kbd">{{ modifierKey }}</kbd> + <strong>scroll</strong> to zoom the map
          </span>
        </div>
      </div>
    </transition>

    <!-- Mobile Floating Action Button (FAB) for Layers & Filters -->
    <button
      class="mobile-filter-fab"
      @click="isMobileFilterModalOpen = true"
      title="Open Map Layers & Filters"
      type="button"
    >
      <span class="fab-icon">🧭</span>
      <span class="fab-label">Layers &amp; Filters</span>
      <span v-if="hasActiveFilter" class="fab-active-dot"></span>
    </button>

    <!-- Mobile Filters & Layers Bottom Sheet Modal -->
    <transition name="mobile-sheet">
      <div v-if="isMobileFilterModalOpen" class="mobile-modal-overlay" @click.self="isMobileFilterModalOpen = false">
        <div class="mobile-filter-sheet">
          <div class="sheet-drag-handle"></div>
          
          <div class="sheet-header">
            <div class="sheet-title-group">
              <span class="sheet-icon">🧭</span>
              <div>
                <h3 class="sheet-title">Map Layers &amp; Filters</h3>
                <span class="sheet-sub">{{ store.filteredEdges.length }} corridors &bull; {{ store.filteredVertices.length }} stops</span>
              </div>
            </div>
            <button class="sheet-close-btn" @click="isMobileFilterModalOpen = false" aria-label="Close filters">&times;</button>
          </div>

          <div class="sheet-body">
            <!-- Quick View Extent Presets -->
            <div class="sheet-section">
              <span class="sheet-section-title">Quick Map Extent</span>
              <div class="sheet-btn-row">
                <button
                  class="sheet-action-btn"
                  @click="fitKeralaBounds(); isMobileFilterModalOpen = false;"
                >
                  🌴 Fit Kerala
                </button>
                <button
                  class="sheet-action-btn"
                  @click="fitSouthIndiaBounds(); isMobileFilterModalOpen = false;"
                >
                  🗺️ South India
                </button>
              </div>
            </div>

            <!-- Hub Metric Calculation Mode -->
            <div class="sheet-section">
              <span class="sheet-section-title">Hub Metric Mode</span>
              <div class="sheet-btn-row">
                <button
                  type="button"
                  class="sheet-action-btn"
                  :class="{ active: store.hubMetricMode === 'terminal' }"
                  @click="store.setHubMetricMode('terminal')"
                >
                  🏢 Terminal Hubs
                </button>
                <button
                  type="button"
                  class="sheet-action-btn"
                  :class="{ active: store.hubMetricMode === 'movements' }"
                  @click="store.setHubMetricMode('movements')"
                >
                  🔄 Total Movements
                </button>
              </div>
              <p class="sheet-section-hint">
                {{ store.hubMetricMode === 'terminal' ? 'Timetable origin/destination departures & arrivals (major hubs prioritized).' : 'Total corridor departures & arrivals including wayside pass-throughs.' }}
              </p>
            </div>

            <!-- Layer Toggles -->
            <div class="sheet-section">
              <span class="sheet-section-title">Display Layers</span>
              <div class="sheet-toggle-grid">
                <label class="sheet-toggle-item highlight-mask">
                  <input type="checkbox" v-model="isolateSouthIndia" />
                  <span><strong>South India Only</strong></span>
                </label>
                <label class="sheet-toggle-item">
                  <input type="checkbox" v-model="showEdges" />
                  <span>Corridors ({{ store.filteredEdges.length }})</span>
                </label>
                <label class="sheet-toggle-item">
                  <input type="checkbox" v-model="showMarkers" />
                  <span>Hubs ({{ store.filteredVertices.length }})</span>
                </label>
                <label class="sheet-toggle-item">
                  <input type="checkbox" v-model="showLabels" />
                  <span>Stop Labels</span>
                </label>
                <label class="sheet-toggle-item">
                  <input type="checkbox" v-model="uniformMarkers" />
                  <span>Uniform Dots</span>
                </label>
                <label class="sheet-toggle-item">
                  <input type="checkbox" v-model="directWheelZoom" />
                  <span>Free Wheel Zoom</span>
                </label>
              </div>
            </div>

            <!-- Min Frequency Filter -->
            <div class="sheet-section">
              <div class="sheet-label-row">
                <span class="sheet-section-title">Min Daily Frequency</span>
                <strong class="sheet-freq-val">{{ store.minBusWeight }} buses / day</strong>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                v-model.number="store.minBusWeight"
                class="slider-input sheet-slider"
              />
              <div class="sheet-chips-row">
                <button
                  v-for="freq in frequencyLegendItems"
                  :key="freq.min"
                  :class="['sheet-chip', { active: store.minBusWeight === freq.min }]"
                  @click="setFrequencyPreset(freq.min)"
                >
                  <span class="chip-color-bar" :style="{ backgroundColor: freq.color }"></span>
                  <span>{{ freq.label.split('(')[0].trim() }}</span>
                </button>
              </div>
            </div>

            <!-- Regional Distinction -->
            <div class="sheet-section">
              <div class="sheet-label-row">
                <span class="sheet-section-title">Regions</span>
                <button
                  v-if="store.selectedRegion !== 'All'"
                  class="reset-micro-btn"
                  @click="store.setSelectedRegion('All')"
                >
                  Reset All
                </button>
              </div>
              <div class="sheet-chips-row">
                <button
                  v-for="r in regionalLegendItems"
                  :key="r.key"
                  :class="['sheet-chip', { active: store.selectedRegion === r.key }]"
                  @click="toggleRegion(r.key)"
                >
                  <span class="chip-dot" :style="{ backgroundColor: r.color }"></span>
                  <span>{{ r.key }}</span>
                  <span class="chip-count">{{ r.count }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="sheet-footer">
            <button class="sheet-apply-btn" @click="isMobileFilterModalOpen = false">
              Done ({{ store.filteredEdges.length }} corridors visible)
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Interactive Map Legend & Controls -->
    <div :class="['map-legend-card', { collapsed: isLegendCollapsed }]">
      <!-- Legend Header -->
      <div class="legend-header">
        <div class="legend-title-wrapper">
          <span class="legend-header-icon">🧭</span>
          <span class="legend-header-title">Legend & Controls</span>
        </div>
        <div class="legend-header-actions">
          <button
            class="legend-tool-btn"
            title="Fit South Indian States"
            @click="fitSouthIndiaBounds"
          >
            <span>South India</span>
          </button>
          <button
            class="legend-tool-btn"
            title="Fit Kerala bounds"
            @click="fitKeralaBounds"
          >
            <span>Kerala</span>
          </button>
          <button
            class="legend-collapse-btn"
            :title="isLegendCollapsed ? 'Expand Legend & Controls' : 'Collapse Legend'"
            @click="isLegendCollapsed = !isLegendCollapsed"
          >
            {{ isLegendCollapsed ? '▲' : '▼' }}
          </button>
        </div>
      </div>

      <!-- Collapsed Quick Pill Preview -->
      <div v-if="isLegendCollapsed" class="legend-collapsed-summary" @click="isLegendCollapsed = false">
        <span>Click to expand controls & filters</span>
      </div>

      <!-- Full Controls Body -->
      <div v-else class="legend-body">
        <!-- 1. Layer Toggles -->
        <div class="legend-section">
          <div class="section-label">Map Layers & Display</div>
          <div class="layer-toggle-grid">
            <label class="layer-toggle-item highlight-mask-toggle" title="Only show South Indian states (Kerala, TN, KA, AP, TS) and mask out the rest of the world">
              <input type="checkbox" v-model="isolateSouthIndia" />
              <span class="toggle-text"><strong>South India Only</strong></span>
            </label>
            <label class="layer-toggle-item">
              <input type="checkbox" v-model="showEdges" />
              <span class="toggle-text">Routes ({{ store.filteredEdges.length }})</span>
            </label>
            <label class="layer-toggle-item">
              <input type="checkbox" v-model="showMarkers" />
              <span class="toggle-text">Hubs ({{ store.filteredVertices.length }})</span>
            </label>
            <label class="layer-toggle-item">
              <input type="checkbox" v-model="showLabels" />
              <span class="toggle-text">Stop Labels</span>
            </label>
            <label class="layer-toggle-item">
              <input type="checkbox" v-model="uniformMarkers" />
              <span class="toggle-text">Uniform Dots</span>
            </label>
            <label class="layer-toggle-item" title="Enable direct mouse wheel zoom without holding Ctrl / ⌘">
              <input type="checkbox" v-model="directWheelZoom" />
              <span class="toggle-text">Free Wheel Zoom</span>
            </label>
          </div>
        </div>

        <div class="legend-divider"></div>

        <!-- 2. Regional Distinction (Interactive Filter) -->
        <div class="legend-section">
          <div class="section-label-row">
            <span class="section-label">Regions (Click to filter)</span>
            <button
              v-if="store.selectedRegion !== 'All'"
              class="reset-micro-btn"
              @click="store.setSelectedRegion('All')"
            >
              Reset All
            </button>
          </div>
          <div class="region-legend-list">
            <div
              v-for="r in regionalLegendItems"
              :key="r.key"
              :class="['region-legend-item', { active: store.selectedRegion === r.key }]"
              @click="toggleRegion(r.key)"
            >
              <div class="region-legend-left">
                <span class="legend-dot" :style="{ backgroundColor: r.color }"></span>
                <span class="region-name">{{ r.label }}</span>
              </div>
              <span class="region-count-badge">{{ r.count }} hubs</span>
            </div>
          </div>
        </div>

        <div class="legend-divider"></div>

        <!-- 3. Corridor Frequency (Interactive Presets) -->
        <div class="legend-section">
          <div class="section-label-row">
            <span class="section-label">Corridor Volume (Click to isolate)</span>
            <button
              v-if="store.minBusWeight > 0"
              class="reset-micro-btn"
              @click="store.setMinBusWeight(0)"
            >
              Reset
            </button>
          </div>
          <div class="frequency-legend-list">
            <div
              v-for="freq in frequencyLegendItems"
              :key="freq.min"
              :class="['frequency-legend-item', { active: store.minBusWeight === freq.min }]"
              @click="setFrequencyPreset(freq.min)"
            >
              <div class="frequency-legend-left">
                <span class="legend-line" :style="{ backgroundColor: freq.color, height: freq.height }"></span>
                <span>{{ freq.label }}</span>
              </div>
              <span v-if="store.minBusWeight === freq.min" class="filter-active-tag">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stop Details Inspector Drawer -->
    <div v-if="store.selectedStop" class="inspector-drawer">
      <div class="sheet-drag-handle"></div>
      <div class="drawer-header">
        <div>
          <span :class="['drawer-badge', store.selectedStop.region.toLowerCase().replace(/\s+/g, '-')]">
            {{ store.selectedStop.region }}
          </span>
          <h2 class="drawer-title">{{ store.selectedStop.name }}</h2>
          <p class="drawer-sub">
            District: {{ store.selectedStop.district }} &bull; State: <strong>{{ store.selectedStop.state || 'Kerala' }}</strong>
          </p>
        </div>
        <button class="close-drawer-btn" @click="store.clearSelections()">&times;</button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="drawer-metrics">
        <div class="drawer-metric-box">
          <span class="box-label">{{ store.hubMetricMode === 'terminal' ? 'Physical Daily Buses' : 'Total Corridor Flow' }}</span>
          <span class="box-val highlight">
            {{ (store.hubMetricMode === 'terminal' ? store.selectedStop.total_daily_flow : (store.selectedStop.total_movement_flow ?? store.selectedStop.total_daily_flow)).toLocaleString() }}
          </span>
          <span class="box-sub">buses / day</span>
        </div>
        <div class="drawer-metric-box">
          <span class="box-label">{{ store.hubMetricMode === 'terminal' ? 'Origin Departures' : 'Outbound Departures' }}</span>
          <span class="box-val">
            {{ (store.hubMetricMode === 'terminal' ? (store.selectedStop.origin_departures ?? store.selectedStop.daily_departures) : (store.selectedStop.movement_departures ?? store.selectedStop.daily_departures)).toLocaleString() }}
          </span>
          <span class="box-sub">buses / day</span>
        </div>
        <div class="drawer-metric-box">
          <span class="box-label">{{ store.hubMetricMode === 'terminal' ? 'Terminating Arrivals' : 'Inbound Arrivals' }}</span>
          <span class="box-val">
            {{ (store.hubMetricMode === 'terminal' ? (store.selectedStop.dest_arrivals ?? store.selectedStop.daily_arrivals) : (store.selectedStop.movement_arrivals ?? store.selectedStop.daily_arrivals)).toLocaleString() }}
          </span>
          <span class="box-sub">buses / day</span>
        </div>
      </div>

      <!-- Mode Switcher Pill in Drawer -->
      <div class="drawer-mode-toggle">
        <span class="drawer-mode-label">Mode:</span>
        <div class="drawer-toggle-btns">
          <button
            type="button"
            class="drawer-mode-btn"
            :class="{ active: store.hubMetricMode === 'terminal' }"
            @click="store.setHubMetricMode('terminal')"
            title="Scheduled originating & terminating runs from official timetable"
          >
            🏢 Terminal Hub
          </button>
          <button
            type="button"
            class="drawer-mode-btn"
            :class="{ active: store.hubMetricMode === 'movements' }"
            @click="store.setHubMetricMode('movements')"
            title="Total corridor departures & arrivals including en-route calls"
          >
            🔄 Total Movements
          </button>
        </div>
      </div>

      <!-- En-route transit calls notice (shown in terminal mode when stop has pass-through buses) -->
      <div
        v-if="store.hubMetricMode === 'terminal' && store.selectedStop.transit_calls && store.selectedStop.transit_calls > 0"
        class="enroute-calls-notice"
      >
        <span class="enroute-icon">🚌</span>
        <span class="enroute-text">
          <strong>{{ store.selectedStop.transit_calls.toLocaleString() }} buses/day</strong> call at or pass through this station en route between other terminals.
        </span>
      </div>

      <!-- Service breakdown for this stop -->
      <div v-if="store.selectedStop.services && Object.keys(store.selectedStop.services).length > 0" class="drawer-section">
        <h3 class="section-title">Departing Service Types</h3>
        <div class="service-pills-list">
          <div
            v-for="(val, stype) in store.selectedStop.services"
            :key="stype"
            class="service-pill-item"
          >
            <span class="pill-name">{{ stype }}</span>
            <span class="pill-count">{{ val }} buses/d</span>
          </div>
        </div>
      </div>

      <!-- Connected Outgoing Routes -->
      <div class="drawer-section">
        <h3 class="section-title">Direct Outgoing Destinations</h3>
        <div v-if="store.connectedEdgesForSelectedStop.outgoing.length === 0" class="empty-hint">
          No direct outgoing routes recorded in sample.
        </div>
        <div v-else class="routes-list">
          <div
            v-for="e in store.connectedEdgesForSelectedStop.outgoing"
            :key="e.to"
            class="route-item"
            @click="store.selectEdge(e)"
          >
            <div class="route-info">
              <span class="route-dest">&rarr; {{ e.to }}</span>
              <span class="route-dist-badge">{{ e.to_district }}</span>
            </div>
            <span class="route-frequency">{{ e.daily_buses }} buses/d</span>
          </div>
        </div>
      </div>

      <!-- Connected Incoming Routes -->
      <div class="drawer-section">
        <h3 class="section-title">Direct Incoming Origins</h3>
        <div v-if="store.connectedEdgesForSelectedStop.incoming.length === 0" class="empty-hint">
          No direct incoming routes recorded in sample.
        </div>
        <div v-else class="routes-list">
          <div
            v-for="e in store.connectedEdgesForSelectedStop.incoming"
            :key="e.from"
            class="route-item"
            @click="store.selectEdge(e)"
          >
            <div class="route-info">
              <span class="route-dest">&larr; {{ e.from }}</span>
              <span class="route-dist-badge">{{ e.from_district }}</span>
            </div>
            <span class="route-frequency">{{ e.daily_buses }} buses/d</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Edge / Corridor Inspector Drawer -->
    <div v-if="store.selectedEdge" class="inspector-drawer">
      <div class="sheet-drag-handle"></div>
      <div class="drawer-header">
        <div>
          <span class="drawer-badge edge-badge">Transit Corridor</span>
          <h2 class="drawer-title">{{ store.selectedEdge.from }} &rarr; {{ store.selectedEdge.to }}</h2>
          <p class="drawer-sub">
            {{ store.selectedEdge.from_district }} ({{ store.selectedEdge.from_state || 'Kerala' }}) &rarr; {{ store.selectedEdge.to_district }} ({{ store.selectedEdge.to_state || 'Kerala' }})
          </p>
        </div>
        <button class="close-drawer-btn" @click="store.clearSelections()">&times;</button>
      </div>

      <div class="drawer-metrics">
        <div class="drawer-metric-box">
          <span class="box-label">Daily Frequency</span>
          <span class="box-val highlight">{{ store.selectedEdge.daily_buses }}</span>
          <span class="box-sub">buses / day</span>
        </div>
        <div class="drawer-metric-box">
          <span class="box-label">Scheduled Trips</span>
          <span class="box-val">{{ store.selectedEdge.sample_trips_count }}</span>
          <span class="box-sub">recorded trips</span>
        </div>
        <div class="drawer-metric-box">
          <span class="box-label">Route Variants</span>
          <span class="box-val">{{ store.selectedEdge.routes_count }}</span>
          <span class="box-sub">service patterns</span>
        </div>
      </div>

      <!-- Service breakdown on this corridor -->
      <div v-if="store.selectedEdge.services && Object.keys(store.selectedEdge.services).length > 0" class="drawer-section">
        <h3 class="section-title">Services on Corridor</h3>
        <div class="service-pills-list">
          <div
            v-for="(val, stype) in store.selectedEdge.services"
            :key="stype"
            class="service-pill-item"
          >
            <span class="pill-name">{{ stype }}</span>
            <span class="pill-count">{{ val }} buses/d</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-view-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 120px);
  min-height: 560px;
  overflow: hidden;
}

.leaflet-map-canvas {
  width: 100%;
  height: 100%;
  background: #f8fafc;
}

/* Gesture Scroll Guidance Overlay (Google Maps Style) */
.map-gesture-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: 450;
  pointer-events: none;
}

.gesture-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem 1.4rem;
  background: rgba(15, 23, 42, 0.94);
  color: #f8fafc;
  font-size: 0.95rem;
  font-weight: 500;
  border-radius: 9999px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.18);
  pointer-events: none;
  animation: gesture-pulse 1.6s infinite ease-in-out;
}

.gesture-icon {
  font-size: 1.2rem;
}

.gesture-text {
  letter-spacing: -0.01em;
}

.gesture-text strong {
  color: #38bdf8;
}

.gesture-kbd {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  font-size: 0.82rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  margin: 0 0.15rem;
}

.gesture-fade-enter-active,
.gesture-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.gesture-fade-enter-from,
.gesture-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

@keyframes gesture-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

/* Map Overlay Controls */
.map-overlay-controls {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  padding: 0.5rem 0.85rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  flex-wrap: wrap;
}

.search-box-wrapper {
  position: relative;
  min-width: 250px;
}

.search-input-group {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  gap: 0.45rem;
}

.search-icon {
  color: #64748b;
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.825rem;
  color: #0f172a;
  width: 100%;
}

.clear-search-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  max-height: 280px;
  overflow-y: auto;
  z-index: 600;
}

.search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  font-size: 0.825rem;
  transition: background 0.1s;
}

.search-item:hover {
  background: #f8fafc;
}

.search-sub {
  font-size: 0.75rem;
  color: #64748b;
  margin-left: 0.35rem;
}

.search-flow-badge {
  font-size: 0.725rem;
  font-weight: 700;
  background: #ecfdf5;
  color: #059669;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
}

.frequency-slider-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.775rem;
  color: #475569;
}

.slider-label {
  white-space: nowrap;
}

.slider-input {
  width: 90px;
  cursor: pointer;
}

.active-map-badges {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.map-stat-badge {
  font-size: 0.75rem;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  color: #334155;
}

/* Interactive Legend & Controls Card */
.map-legend-card {
  position: absolute;
  bottom: 1.5rem;
  left: 1.5rem;
  z-index: 500;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  font-size: 0.775rem;
  width: 320px;
  max-width: calc(100vw - 3rem);
  max-height: calc(100vh - 12rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.map-legend-card.collapsed {
  width: auto;
  min-width: 210px;
}

.legend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  user-select: none;
}

.legend-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.legend-header-icon {
  font-size: 0.95rem;
}

.legend-header-title {
  font-weight: 700;
  font-size: 0.775rem;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.legend-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-tool-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.legend-tool-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.legend-collapse-btn {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.2rem 0.35rem;
  border-radius: 4px;
}

.legend-collapse-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.legend-collapsed-summary {
  padding: 0.55rem 0.85rem;
  font-size: 0.725rem;
  color: #64748b;
  cursor: pointer;
}

.legend-collapsed-summary:hover {
  color: #0284c7;
}

.legend-body {
  padding: 0.75rem 0.85rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.legend-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.section-label {
  font-weight: 700;
  color: #475569;
  font-size: 0.675rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reset-micro-btn {
  background: transparent;
  border: none;
  color: #0284c7;
  font-size: 0.675rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.reset-micro-btn:hover {
  text-decoration: underline;
}

/* Layer toggles */
.layer-toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
}

.layer-toggle-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  font-size: 0.725rem;
  color: #334155;
  user-select: none;
}

.layer-toggle-item input[type="checkbox"] {
  accent-color: #0284c7;
  cursor: pointer;
}

.layer-toggle-item.highlight-mask-toggle {
  grid-column: span 2;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  color: #15803d;
}

.layer-toggle-item.highlight-mask-toggle input[type="checkbox"] {
  accent-color: #16a34a;
}

/* Region items */
.region-legend-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.region-legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s;
  border: 1px solid transparent;
}

.region-legend-item:hover {
  background: #f1f5f9;
}

.region-legend-item.active {
  background: #eff6ff;
  border-color: #bfdbfe;
  font-weight: 600;
}

.region-legend-left {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.region-name {
  color: #1e293b;
  font-size: 0.75rem;
}

.region-count-badge {
  font-size: 0.675rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.region-legend-item.active .region-count-badge {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
}

/* Frequency items */
.frequency-legend-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.frequency-legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s;
  border: 1px solid transparent;
  font-size: 0.725rem;
  color: #475569;
}

.frequency-legend-item:hover {
  background: #f1f5f9;
}

.frequency-legend-item.active {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #9f1239;
  font-weight: 600;
}

.frequency-legend-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-active-tag {
  font-size: 0.65rem;
  font-weight: 700;
  color: #e11d48;
  background: #ffe4e6;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  text-transform: uppercase;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.legend-line {
  width: 22px;
  border-radius: 2px;
  display: inline-block;
  flex-shrink: 0;
}

.legend-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 0.15rem 0;
}

/* Stop map permanent label */
:deep(.stop-map-permanent-label) {
  background: rgba(15, 23, 42, 0.88);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  white-space: nowrap;
}

:deep(.stop-map-permanent-label::before) {
  display: none;
}

/* Inspector Drawer */
.inspector-drawer {
  position: absolute;
  top: 1rem;
  right: 1rem;
  bottom: 1rem;
  width: 360px;
  max-width: 90vw;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  z-index: 600;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 0.75rem;
}

.drawer-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  display: inline-block;
  margin-bottom: 0.35rem;
}

.drawer-badge.north-kerala { background: #ecfdf5; color: #059669; }
.drawer-badge.central-kerala { background: #eff6ff; color: #2563eb; }
.drawer-badge.south-kerala { background: #fffbeb; color: #d97706; }
.drawer-badge.inter-state { background: #faf5ff; color: #7c3aed; }
.drawer-badge.edge-badge { background: #fff1f2; color: #e11d48; }

.drawer-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  line-height: 1.25;
}

.drawer-sub {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0.2rem 0 0;
}

.close-drawer-btn {
  background: #f1f5f9;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 1.2rem;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-drawer-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.drawer-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.drawer-metric-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.65rem 0.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.box-label {
  font-size: 0.675rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.box-val {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0.2rem 0;
}

.box-val.highlight {
  color: #e11d48;
}

.box-sub {
  font-size: 0.65rem;
  color: #94a3b8;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Hub Mode Segmented Control in Top Filter Bar */
.hub-mode-segmented-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #f8fafc;
  padding: 0.25rem 0.45rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.mode-label-prefix {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.segmented-pill-container {
  display: flex;
  background: #e2e8f0;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.segmented-pill-btn {
  border: none;
  background: transparent;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.segmented-pill-btn:hover {
  color: #0f172a;
}

.segmented-pill-btn.active {
  background: #ffffff;
  color: #0284c7;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 700;
}

/* Drawer Mode Toggle & En-Route Notice */
.drawer-mode-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  gap: 0.5rem;
}

.drawer-mode-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.drawer-toggle-btns {
  display: flex;
  background: #e2e8f0;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  flex: 1;
}

.drawer-mode-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.3rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  white-space: nowrap;
}

.drawer-mode-btn:hover {
  color: #0f172a;
}

.drawer-mode-btn.active {
  background: #ffffff;
  color: #0284c7;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.enroute-calls-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
  font-size: 0.775rem;
  color: #1e40af;
  line-height: 1.4;
}

.enroute-icon {
  font-size: 1rem;
  line-height: 1;
}

.enroute-text {
  flex: 1;
}

.sheet-section-hint {
  font-size: 0.725rem;
  color: #64748b;
  margin: 0.35rem 0 0 0;
  line-height: 1.35;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}

.service-pills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.service-pill-item {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.pill-name {
  color: #334155;
  font-weight: 600;
}

.pill-count {
  color: #0284c7;
  font-weight: 700;
  background: #e0f2fe;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.7rem;
}

.routes-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 200px;
  overflow-y: auto;
}

.route-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.65rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
  cursor: pointer;
  font-size: 0.775rem;
  transition: all 0.12s;
}

.route-item:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.route-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.route-dest {
  font-weight: 600;
  color: #1e293b;
}

.route-dist-badge {
  font-size: 0.675rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.route-frequency {
  font-weight: 700;
  color: #059669;
}

.empty-hint {
  font-size: 0.775rem;
  color: #94a3b8;
  font-style: italic;
}

/* Drag Handle for Bottom Sheets */
.sheet-drag-handle {
  width: 42px;
  height: 4px;
  background: #cbd5e1;
  border-radius: 9999px;
  margin: 0 auto 0.65rem;
  display: none;
}

/* Mobile Floating Filter Button (Hidden on Desktop) */
.mobile-filter-fab {
  display: none;
}

/* Mobile Modal Overlay & Filter Sheet */
.mobile-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.mobile-filter-sheet {
  background: #ffffff;
  width: 100%;
  max-width: 540px;
  max-height: 85vh;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  padding: 0.75rem 1.25rem 1.5rem;
  overflow: hidden;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 0.75rem;
}

.sheet-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sheet-icon {
  font-size: 1.3rem;
}

.sheet-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.sheet-sub {
  font-size: 0.75rem;
  color: #64748b;
}

.sheet-close-btn {
  background: #f1f5f9;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 1.4rem;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-body {
  overflow-y: auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.sheet-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.sheet-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sheet-btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.sheet-action-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.15s;
}

.sheet-action-btn:active {
  background: #f1f5f9;
  transform: scale(0.98);
}

.sheet-toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.sheet-toggle-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.775rem;
  color: #334155;
  background: #f8fafc;
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.sheet-toggle-item.highlight-mask {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.sheet-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-freq-val {
  font-size: 0.8rem;
  color: #e11d48;
}

.sheet-slider {
  width: 100%;
}

.sheet-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.sheet-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.12s;
}

.sheet-chip.active {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #be123c;
}

.chip-color-bar {
  width: 14px;
  height: 4px;
  border-radius: 2px;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chip-count {
  font-size: 0.7rem;
  opacity: 0.75;
}

.sheet-footer {
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.sheet-apply-btn {
  width: 100%;
  background: #e11d48;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
  transition: all 0.15s;
}

.sheet-apply-btn:active {
  transform: scale(0.98);
}

/* Animations */
.mobile-sheet-enter-active,
.mobile-sheet-leave-active {
  transition: opacity 0.22s ease;
}

.mobile-sheet-enter-active .mobile-filter-sheet,
.mobile-sheet-leave-active .mobile-filter-sheet {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.mobile-sheet-enter-from,
.mobile-sheet-leave-to {
  opacity: 0;
}

.mobile-sheet-enter-from .mobile-filter-sheet,
.mobile-sheet-leave-to .mobile-filter-sheet {
  transform: translateY(100%);
}

/* =========================================================
   Mobile Touch & Screen Media Queries (< 768px)
   ========================================================= */
@media (max-width: 768px) {
  .map-view-container {
    height: calc(100dvh - 54px - 60px);
    min-height: calc(100dvh - 54px - 60px);
  }

  /* Hide desktop legend card on phone */
  .map-legend-card {
    display: none;
  }

  /* Show Mobile FAB */
  .mobile-filter-fab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    position: absolute;
    bottom: 1.25rem;
    left: 1rem;
    z-index: 500;
    background: #0f172a;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 9999px;
    padding: 0.65rem 1.15rem;
    font-size: 0.825rem;
    font-weight: 700;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mobile-filter-fab:active {
    transform: scale(0.96);
  }

  .fab-active-dot {
    width: 7px;
    height: 7px;
    background: #e11d48;
    border-radius: 50%;
    box-shadow: 0 0 6px #e11d48;
  }

  /* Simplify top overlay controls */
  .map-overlay-controls {
    top: 0.75rem;
    left: 0.75rem;
    right: 0.75rem;
    padding: 0;
    background: transparent;
    border: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .map-overlay-controls .frequency-slider-group,
  .map-overlay-controls .active-map-badges {
    display: none;
  }

  .search-box-wrapper {
    width: 100%;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    border-radius: 10px;
    background: #ffffff;
  }

  .search-dropdown {
    width: 100%;
    max-height: 240px;
  }

  /* Transform desktop sidebar into app-style Bottom Sheet */
  .inspector-drawer {
    position: fixed;
    top: auto;
    left: 0;
    right: 0;
    bottom: 60px; /* Aligns right above mobile bottom nav */
    width: 100%;
    max-width: 100%;
    max-height: 70vh;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -12px 35px rgba(0, 0, 0, 0.3);
    z-index: 1050;
    padding: 0.85rem 1.25rem 1.5rem;
    animation: slideUpSheet 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .sheet-drag-handle {
    display: block;
  }

  @keyframes slideUpSheet {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
}
</style>
