interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

interface ApiError {
  error: string;
  details?: any;
  timestamp: string;
}

interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

class ApiClient {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "";
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("auth-token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("auth-refresh-token");
    if (!refreshToken) return false;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const refreshResponse: RefreshTokenResponse = await response.json();
        localStorage.setItem("auth-token", refreshResponse.data.accessToken);
        localStorage.setItem("auth-refresh-token", refreshResponse.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }

    // Refresh failed, clear auth data
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-refresh-token");
    localStorage.removeItem("auth-user");
    window.location.href = "/login";
    return false;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401) {
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          // Retry original request with new token
          const retryResponse = await fetch(response.url, {
            method: response.headers.get("x-original-method") || "GET",
            headers: this.getAuthHeaders(),
          });

          if (retryResponse.ok) {
            const retryData: ApiResponse<T> = await retryResponse.json();
            return retryData.data;
          }
        }
      }

      const errorData: ApiError = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();
    return result.data;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
