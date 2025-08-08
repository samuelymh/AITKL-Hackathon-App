/**
 * Centralized API client for pharmacist operations
 * Reduces code duplication and improves error handling
 */

import {
  type MedicationsResponse,
  type DispenseRequest,
  type DispenseResponse,
  type RecordsResponse,
} from "@/lib/types/pharmacist";

class PharmacistAPIClient {
  private baseUrl = "/api/pharmacist";

  private getAuthHeaders() {
    const token = localStorage.getItem("auth-token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Network error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Fetch patient medications
   */
  async getPatientMedications(digitalId: string): Promise<MedicationsResponse> {
    const response = await fetch(`${this.baseUrl}/patient/${digitalId}/medications`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<MedicationsResponse>(response);
  }

  /**
   * Fetch patient medical records
   */
  async getPatientRecords(digitalId: string): Promise<RecordsResponse> {
    const response = await fetch(`${this.baseUrl}/patient/${digitalId}/records`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<RecordsResponse>(response);
  }

  /**
   * Dispense medication
   */
  async dispenseMedication(digitalId: string, request: DispenseRequest): Promise<DispenseResponse> {
    const response = await fetch(`${this.baseUrl}/patient/${digitalId}/dispense`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<DispenseResponse>(response);
  }

  /**
   * Generic fetch with auth headers
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });
  }
}

// Export singleton instance
export const pharmacistAPI = new PharmacistAPIClient();
export default pharmacistAPI;
