"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export function useApi() {
  const { token, refreshAuthToken, logout } = useAuth();

  const makeRequest = useCallback(
    async <T = any>(url: string, options: FetchOptions = {}): Promise<T> => {
      const { skipAuth = false, ...fetchOptions } = options;

      // Prepare headers
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      };

      // Add auth header if not skipped and token exists
      if (!skipAuth && token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        // First attempt
        let response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        // Handle 401 - Token expired
        if (response.status === 401 && !skipAuth && token) {
          try {
            // Try to refresh the token
            await refreshAuthToken();

            // Get the new token from localStorage (since refreshAuthToken updates it)
            const newToken = localStorage.getItem("auth-token");

            if (newToken) {
              // Retry the request with the new token
              headers["Authorization"] = `Bearer ${newToken}`;
              response = await fetch(url, {
                ...fetchOptions,
                headers,
              });
            }
          } catch (refreshError) {
            // Token refresh failed, logout the user
            console.error("Token refresh failed:", refreshError);
            logout();
            throw new Error("Session expired. Please login again.");
          }
        }

        // If still 401 after refresh attempt, logout
        if (response.status === 401 && !skipAuth) {
          logout();
          throw new Error("Authentication failed. Please login again.");
        }

        // Handle other errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `HTTP error! status: ${response.status}`,
          }));
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`,
          );
        }

        // Parse response
        const result: ApiResponse<T> = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Request failed");
        }

        return result.data;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("An unexpected error occurred");
      }
    },
    [token, refreshAuthToken, logout],
  );

  const get = useCallback(
    <T = any>(url: string, options?: Omit<FetchOptions, "method" | "body">) =>
      makeRequest<T>(url, { ...options, method: "GET" }),
    [makeRequest],
  );

  const post = useCallback(
    <T = any>(
      url: string,
      data?: any,
      options?: Omit<FetchOptions, "method">,
    ) =>
      makeRequest<T>(url, {
        ...options,
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      }),
    [makeRequest],
  );

  const put = useCallback(
    <T = any>(url: string, data: any, options?: Omit<FetchOptions, "method">) =>
      makeRequest<T>(url, {
        ...options,
        method: "PUT",
        body: JSON.stringify(data),
      }),
    [makeRequest],
  );

  const del = useCallback(
    <T = any>(url: string, options?: Omit<FetchOptions, "method" | "body">) =>
      makeRequest<T>(url, { ...options, method: "DELETE" }),
    [makeRequest],
  );

  const patch = useCallback(
    <T = any>(url: string, data: any, options?: Omit<FetchOptions, "method">) =>
      makeRequest<T>(url, {
        ...options,
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    [makeRequest],
  );

  return {
    get,
    post,
    put,
    delete: del,
    patch,
  };
}
