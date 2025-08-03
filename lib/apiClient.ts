// A custom error class for API-specific issues
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// A generic response type
interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

// Base URL for your API - store this in .env.local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        // Add Authorization headers if needed
        ...options?.headers,
      },
    });

    if (!response.ok) {
      // Try to parse error message from the API, otherwise use status text
      let errorMessage = `API Error: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || errorMessage;
      } catch (e) {
        // Ignore if response body is not JSON
      }
      return { data: null, error: new ApiError(response.status, errorMessage) };
    }

    // Handle cases with no content
    if (response.status === 204) {
      return { data: null, error: null };
    }

    const data: T = await response.json();
    return { data, error: null };
  } catch (error) {
    // Network errors or other unexpected issues
    if (error instanceof Error) {
      return { data: null, error: new ApiError(500, error.message) };
    }
    return {
      data: null,
      error: new ApiError(500, "An unknown network error occurred"),
    };
  }
}

// Export methods for different HTTP verbs
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
