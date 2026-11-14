import type { TransitDataset } from '@/types/transit';

/**
 * Transit API Client
 * Centralized data retrieval layer as required by architectural guidelines.
 * Views and components must not call fetch directly.
 */
class TransitApiClient {
  private cache: TransitDataset | null = null;
  private readonly dataUrl = `${import.meta.env.BASE_URL}data/transit_dataset.json`;

  /**
   * Fetch the comprehensive KSRTC transit dataset.
   * Returns cached data if already retrieved in current session.
   */
  async getTransitDataset(): Promise<TransitDataset> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const response = await fetch(this.dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to load transit data: HTTP ${response.status} ${response.statusText}`);
      }

      const data: TransitDataset = await response.json();
      this.cache = data;
      return data;
    } catch (error) {
      console.error('[TransitApiClient] Error fetching dataset:', error);
      throw error;
    }
  }

  /**
   * Clear in-memory cache if manual reload is triggered.
   */
  clearCache(): void {
    this.cache = null;
  }
}

export const transitApi = new TransitApiClient();
