import { defineStore } from 'pinia';
import { transitApi } from '@/services/transitApi';
import type {
  TransitDataset,
  StopVertex,
  NetworkEdge,
  DistrictMetric,
  RegionalMetric,
  RegionName
} from '@/types/transit';

export type AppTab = 'map' | 'analytics' | 'districts' | 'corridors';

interface TransitStoreState {
  dataset: TransitDataset | null;
  isLoading: boolean;
  error: string | null;
  selectedRegion: string;
  selectedServiceType: string;
  searchQuery: string;
  selectedStop: StopVertex | null;
  selectedEdge: NetworkEdge | null;
  minBusWeight: number;
  activeTab: AppTab;
}

export const useTransitStore = defineStore('transit', {
  state: (): TransitStoreState => ({
    dataset: null,
    isLoading: false,
    error: null,
    selectedRegion: 'All',
    selectedServiceType: 'All',
    searchQuery: '',
    selectedStop: null,
    selectedEdge: null,
    minBusWeight: 0,
    activeTab: 'map'
  }),

  getters: {
    isReady: (state): boolean => state.dataset !== null && !state.isLoading,

    summary: (state) => state.dataset?.summary ?? null,

    serviceTypes: (state): string[] => {
      if (!state.dataset) return [];
      return ['All', ...state.dataset.service_distribution.map((s) => s.service_type)];
    },

    filteredVertices: (state): StopVertex[] => {
      if (!state.dataset) return [];
      const query = state.searchQuery.trim().toLowerCase();

      return state.dataset.vertices.filter((v) => {
        // Region filter
        if (state.selectedRegion !== 'All' && v.region !== state.selectedRegion) {
          return false;
        }

        // Service type filter
        if (state.selectedServiceType !== 'All') {
          if (!v.services || !v.services[state.selectedServiceType] || v.services[state.selectedServiceType] <= 0) {
            return false;
          }
        }

        // Search text query
        if (query) {
          const matchName = v.name.toLowerCase().includes(query);
          const matchDistrict = v.district.toLowerCase().includes(query);
          if (!matchName && !matchDistrict) return false;
        }

        return true;
      });
    },

    filteredEdges: (state): NetworkEdge[] => {
      if (!state.dataset) return [];

      return state.dataset.edges.filter((e) => {
        // Minimum bus weight filter
        if (e.daily_buses < state.minBusWeight) {
          return false;
        }

        // Region filter (matches either origin or destination)
        if (state.selectedRegion !== 'All') {
          if (e.from_region !== state.selectedRegion && e.to_region !== state.selectedRegion) {
            return false;
          }
        }

        // Service type filter
        if (state.selectedServiceType !== 'All') {
          if (!e.services || !e.services[state.selectedServiceType] || e.services[state.selectedServiceType] <= 0) {
            return false;
          }
        }

        return true;
      });
    },

    regionalBreakdown: (state) => {
      if (!state.dataset) return [];
      const order: RegionName[] = ['North Kerala', 'Central Kerala', 'South Kerala', 'Inter-State'];
      const totalDailyFlow = state.dataset.summary.total_daily_network_volume || 1;

      return order.map((regionKey) => {
        const metric: RegionalMetric | undefined = state.dataset!.regions[regionKey];
        const stopsInRegion = state.dataset!.vertices.filter((v) => v.region === regionKey);
        const regionalDepartures = metric?.daily_departures || 0;
        const totalFlow = stopsInRegion.reduce((sum, v) => sum + v.total_daily_flow, 0);

        let color = '#3b82f6';
        let badgeClass = 'badge-central';
        if (regionKey === 'North Kerala') {
          color = '#10b981';
          badgeClass = 'badge-north';
        } else if (regionKey === 'South Kerala') {
          color = '#f59e0b';
          badgeClass = 'badge-south';
        } else if (regionKey === 'Inter-State') {
          color = '#8b5cf6';
          badgeClass = 'badge-interstate';
        }

        return {
          regionKey,
          name: metric?.name || regionKey,
          districts: metric?.districts || [],
          stopsCount: metric?.stops_count || stopsInRegion.length,
          dailyDepartures: regionalDepartures,
          totalFlow: Math.round(totalFlow * 10) / 10,
          flowShare: Math.round((regionalDepartures / totalDailyFlow) * 1000) / 10,
          color,
          badgeClass
        };
      });
    },

    filteredDistricts: (state): DistrictMetric[] => {
      if (!state.dataset) return [];
      if (state.selectedRegion === 'All') {
        return state.dataset.districts;
      }
      return state.dataset.districts.filter((d) => d.region === state.selectedRegion);
    },

    connectedEdgesForSelectedStop: (state): { incoming: NetworkEdge[]; outgoing: NetworkEdge[] } => {
      if (!state.dataset || !state.selectedStop) {
        return { incoming: [], outgoing: [] };
      }
      const stopName = state.selectedStop.name;
      const outgoing = state.dataset.edges.filter((e) => e.from === stopName);
      const incoming = state.dataset.edges.filter((e) => e.to === stopName);
      return { incoming, outgoing };
    }
  },

  actions: {
    async loadTransitData(): Promise<void> {
      if (this.dataset) return;
      this.isLoading = true;
      this.error = null;

      try {
        const data = await transitApi.getTransitDataset();
        this.dataset = data;
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Unknown error loading transit data';
      } finally {
        this.isLoading = false;
      }
    },

    setSelectedRegion(region: string): void {
      this.selectedRegion = region;
      this.clearSelections();
    },

    setSelectedServiceType(serviceType: string): void {
      this.selectedServiceType = serviceType;
    },

    setSearchQuery(query: string): void {
      this.searchQuery = query;
    },

    setMinBusWeight(weight: number): void {
      this.minBusWeight = weight;
    },

    setActiveTab(tab: AppTab): void {
      this.activeTab = tab;
    },

    selectStop(stop: StopVertex | null): void {
      this.selectedStop = stop;
      this.selectedEdge = null;
    },

    selectEdge(edge: NetworkEdge | null): void {
      this.selectedEdge = edge;
      this.selectedStop = null;
    },

    clearSelections(): void {
      this.selectedStop = null;
      this.selectedEdge = null;
    },

    resetFilters(): void {
      this.selectedRegion = 'All';
      this.selectedServiceType = 'All';
      this.searchQuery = '';
      this.minBusWeight = 0;
      this.clearSelections();
    }
  }
});
