export type RegionName = 'North Kerala' | 'Central Kerala' | 'South Kerala' | 'Inter-State';
export type SouthIndianState = 'Kerala' | 'Tamil Nadu' | 'Karnataka' | 'Andhra Pradesh' | 'Telangana' | 'Puducherry';

export interface StopVertex {
  id: string;
  name: string;
  lat: number;
  lon: number;
  district: string;
  state?: string;
  region: RegionName;
  daily_departures: number;
  daily_arrivals: number;
  origin_departures?: number;
  dest_arrivals?: number;
  transit_calls?: number;
  movement_departures?: number;
  movement_arrivals?: number;
  in_degree: number;
  out_degree: number;
  total_daily_flow: number;
  total_movement_flow?: number;
  services?: Record<string, number>;
}

export interface NetworkEdge {
  from: string;
  to: string;
  from_coord: [number, number];
  to_coord: [number, number];
  from_region: RegionName;
  to_region: RegionName;
  from_district: string;
  to_district: string;
  from_state?: string;
  to_state?: string;
  weight: number;
  daily_buses: number;
  sample_trips_count: number;
  routes_count: number;
  services?: Record<string, number>;
  service_types?: string[];
  geometry?: [number, number][];
}

export interface HubFlow {
  stop: string;
  departures: number;
  arrivals: number;
  total: number;
}

export interface DistrictMetric {
  district: string;
  state?: string;
  region: RegionName;
  stops: string[];
  stops_count: number;
  daily_departures: number;
  daily_arrivals: number;
  origin_departures?: number;
  dest_arrivals?: number;
  total_flow: number;
  total_movement_flow?: number;
  top_hubs: HubFlow[];
}

export interface RegionalMetric {
  name: string;
  districts: string[];
  stops_count: number;
  daily_departures: number;
  routes_count: number;
}

export interface ServiceDistributionItem {
  service_type: string;
  routes_count: number;
  trips_count: number;
  daily_bus_volume: number;
}

export interface HourlyItem {
  hour: string;
  trips: number;
}

export interface TransitSummary {
  total_routes: number;
  total_trips_sampled: number;
  total_stops_vertices: number;
  total_corridors_edges: number;
  total_daily_network_volume: number;
}

export interface TransitMetadata {
  title: string;
  source: string;
  generated_at: string;
  coverage_note: string;
}

export interface TransitDataset {
  metadata: TransitMetadata;
  summary: TransitSummary;
  regions: Record<string, RegionalMetric>;
  districts: DistrictMetric[];
  service_distribution: ServiceDistributionItem[];
  hourly_distribution: HourlyItem[];
  top_corridors: NetworkEdge[];
  top_hubs: StopVertex[];
  top_terminal_hubs?: StopVertex[];
  top_movement_hubs?: StopVertex[];
  vertices: StopVertex[];
  edges: NetworkEdge[];
}
