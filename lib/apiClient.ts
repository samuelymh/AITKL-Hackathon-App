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
    // Use URL constructor for robust path joining
    const url = new URL(endpoint, API_BASE_URL);

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      // Safely attempt to parse error details from the response body
      try {
        const errorBody = await response.json();
        errorMessage = errorBody?.message || errorMessage;
      } catch (e) {
        // The error response was not JSON, stick with the default message
      }
      return { data: null, error: new ApiError(response.status, errorMessage) };
    }

    // Handle cases with no content (e.g., 204 No Content)
    if (response.status === 204) {
      return { data: null, error: null };
    }

    const data: T = await response.json();
    return { data, error: null };
  } catch (error) {
    // Catches network errors (e.g., offline) or other unexpected issues
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
  get: <T>(endpoint: string, options?: RequestInit) => {
    return request<T>(endpoint, { ...options, method: "GET" });
  },

  post: <T>(endpoint: string, body: unknown, options?: RequestInit) => {
    return request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put: <T>(endpoint: string, body: unknown, options?: RequestInit) => {
    return request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete: <T>(endpoint: string, options?: RequestInit) => {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
};
