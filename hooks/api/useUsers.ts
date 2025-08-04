import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";

export interface User {
  digitalIdentifier: string;
  name: string;
  age: number;
  bloodType?: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    contact: {
      email: string;
      phone: string;
    };
  };
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsersResponse {
  users: User[];
  pagination: PaginationMeta;
}

export interface CreateUserData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    contact: {
      email: string;
      phone: string;
    };
  };
  password: string;
  role: "patient" | "doctor" | "pharmacist" | "admin";
  medicalInfo?: {
    bloodType?: string;
    knownAllergies?: string[];
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
}

// Fetch users with pagination
export function useUsers(page = 1, limit = 10) {
  const { isAuthenticated } = useAuth();

  return useQuery<UsersResponse>({
    queryKey: ["users", page, limit],
    queryFn: async () => {
      return apiClient.get<UsersResponse>(
        `/api/users?page=${page}&limit=${limit}`,
      );
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Fetch single user by digital identifier
export function useUser(digitalIdentifier: string) {
  const { isAuthenticated } = useAuth();

  return useQuery<User>({
    queryKey: ["users", digitalIdentifier],
    queryFn: async () => {
      return apiClient.get<User>(`/api/users/${digitalIdentifier}`);
    },
    enabled: isAuthenticated && !!digitalIdentifier,
    staleTime: 5 * 60 * 1000,
  });
}

// Create user mutation
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      return apiClient.post<User>("/api/users", userData);
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("Failed to create user:", error);
    },
  });
}

// Update user mutation
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      digitalIdentifier,
      userData,
    }: {
      digitalIdentifier: string;
      userData: Partial<CreateUserData>;
    }) => {
      return apiClient.put<User>("/api/users", {
        digitalIdentifier,
        ...userData,
      });
    },
    onSuccess: (data, variables) => {
      // Update the specific user in cache
      queryClient.setQueryData(["users", variables.digitalIdentifier], data);
      // Invalidate users list to refresh
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("Failed to update user:", error);
    },
  });
}

// Delete user mutation (soft delete)
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (digitalIdentifier: string) => {
      return apiClient.delete<{ message: string }>(
        `/api/users?digitalIdentifier=${digitalIdentifier}`,
      );
    },
    onSuccess: () => {
      // Invalidate users list to refresh
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("Failed to delete user:", error);
    },
  });
}

// Restore user mutation (undo soft delete)
export function useRestoreUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (digitalIdentifier: string) => {
      return apiClient.patch<User>("/api/users", {
        digitalIdentifier,
        restore: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("Failed to restore user:", error);
    },
  });
}

// Search users
export function useSearchUsers(searchTerm: string, enabled = true) {
  const { isAuthenticated } = useAuth();

  return useQuery<UsersResponse>({
    queryKey: ["users", "search", searchTerm],
    queryFn: async () => {
      return apiClient.get<UsersResponse>(
        `/api/users?search=${encodeURIComponent(searchTerm)}`,
      );
    },
    enabled: isAuthenticated && enabled && searchTerm.length > 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}
