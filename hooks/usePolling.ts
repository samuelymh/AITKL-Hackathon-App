import { useState, useEffect, useCallback, useRef } from "react";

export interface PollingOptions {
  interval?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for polling data with automatic cleanup and error handling
 * @param fetchData - Function that returns a promise with the data to poll
 * @param options - Polling configuration options
 * @returns Tuple containing [data, loading, error, refresh function]
 */
export function usePolling<T>(
  fetchData: () => Promise<T>,
  options: PollingOptions = {}
): [T | null, boolean, Error | null, () => void] {
  const { interval = 30000, enabled = true, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  const execute = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    try {
      setError(null);
      const result = await fetchData();

      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");

      if (mountedRef.current) {
        setError(error);
        if (onError) {
          onError(error);
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchData, enabled, onError]);

  const refresh = useCallback(() => {
    setLoading(true);
    execute();
  }, [execute]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      setLoading(false);
      return;
    }

    // Execute immediately
    execute();

    // Set up polling interval
    intervalRef.current = setInterval(execute, interval);

    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [execute, interval, enabled]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return [data, loading, error, refresh];
}

/**
 * Hook for polling notifications specifically
 * @param token - Authentication token
 * @param options - Polling options
 */
export function useNotificationPolling(
  token: string | null,
  options: Omit<PollingOptions, "enabled"> & { limit?: number } = {}
) {
  const { limit = 20, ...pollingOptions } = options;

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      throw new Error("No authentication token available");
    }

    const response = await fetch(`/api/notifications?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to fetch notifications");
    }

    return result.data;
  }, [token, limit]);

  return usePolling(fetchNotifications, {
    ...pollingOptions,
    enabled: !!token,
  });
}

/**
 * Hook for polling practitioner notifications
 * @param token - Authentication token
 * @param organizationId - Organization ID to filter by
 * @param options - Polling options
 */
export function usePractitionerNotificationPolling(
  token: string | null,
  organizationId: string | null,
  options: Omit<PollingOptions, "enabled"> & { limit?: number } = {}
) {
  const { limit = 20, ...pollingOptions } = options;

  const fetchPractitionerNotifications = useCallback(async () => {
    if (!token) {
      throw new Error("No authentication token available");
    }

    const url = organizationId
      ? `/api/practitioner/notifications?organizationId=${organizationId}&limit=${limit}`
      : `/api/practitioner/notifications?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch practitioner notifications: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to fetch practitioner notifications");
    }

    return result.data;
  }, [token, organizationId, limit]);

  return usePolling(fetchPractitionerNotifications, {
    ...pollingOptions,
    enabled: !!token,
  });
}
