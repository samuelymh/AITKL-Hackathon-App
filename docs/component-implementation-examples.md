# Component Implementation Examples

## Overview

This document provides concrete examples of how to implement production-ready components that integrate with our backend authentication system and APIs.

## 🔐 Authentication Components

### 1. Login Form Component

```typescript
// components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginForm() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setApiError('');
    setErrors({});

    try {
      // Validate form data
      const validatedData = LoginSchema.parse(formData);
      
      // Call backend API
      await login(validatedData.email, validatedData.password);
      
      // Redirect on success
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        // Handle API errors
        setApiError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={isLoading}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email}</p>
        )}
      </div>
      
      <div>
        <Input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          disabled={isLoading}
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && (
          <p className="text-sm text-red-600 mt-1">{errors.password}</p>
        )}
      </div>

      {apiError && (
        <Alert variant="destructive">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

### 2. Authentication Context

```typescript
// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  digitalIdentifier: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'pharmacist' | 'admin';
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('auth-token');
    const savedUser = localStorage.getItem('auth-user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const { data } = await response.json();
    
    // Store auth data
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('auth-token', data.token);
    localStorage.setItem('auth-user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    router.push('/login');
  };

  const register = async (userData: RegisterData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const { data } = await response.json();
    
    // Automatically log in after registration
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('auth-token', data.token);
    localStorage.setItem('auth-user', JSON.stringify(data.user));
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## 📊 Data Fetching with React Query

### 3. Users Management Hook

```typescript
// hooks/api/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  digitalIdentifier: string;
  name: string;
  age: number;
  bloodType?: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UsersResponse {
  users: User[];
  pagination: PaginationMeta;
}

// Fetch users with pagination
export function useUsers(page = 1, limit = 10) {
  const { token, isAuthenticated } = useAuth();

  return useQuery<UsersResponse>({
    queryKey: ['users', page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/users?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create user mutation
export function useCreateUser() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Update user mutation
export function useUpdateUser() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ digitalIdentifier, userData }: { 
      digitalIdentifier: string; 
      userData: Partial<User> 
    }) => {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ digitalIdentifier, ...userData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Delete user mutation (soft delete)
export function useDeleteUser() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (digitalIdentifier: string) => {
      const response = await fetch(`/api/users?digitalIdentifier=${digitalIdentifier}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

## 🛡️ Permission-Based Components

### 4. Permission Guard

```typescript
// components/auth/PermissionGuard.tsx
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

type UserRole = 'patient' | 'doctor' | 'pharmacist' | 'admin';

interface PermissionGuardProps {
  requiredRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
}

export function PermissionGuard({ 
  requiredRoles, 
  children, 
  fallback,
  showError = true 
}: PermissionGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return fallback || (
      showError ? (
        <Alert variant="destructive">
          <AlertDescription>
            You must be logged in to access this content.
          </AlertDescription>
        </Alert>
      ) : null
    );
  }

  if (!user || !requiredRoles.includes(user.role)) {
    return fallback || (
      showError ? (
        <Alert variant="destructive">
          <AlertDescription>
            You don't have permission to access this content.
          </AlertDescription>
        </Alert>
      ) : null
    );
  }

  return <>{children}</>;
}

// Usage example:
export function AdminPanel() {
  return (
    <PermissionGuard requiredRoles={['admin']}>
      <div>Admin-only content here</div>
    </PermissionGuard>
  );
}

export function DoctorOrAdminPanel() {
  return (
    <PermissionGuard requiredRoles={['doctor', 'admin']}>
      <div>Doctor or admin content here</div>
    </PermissionGuard>
  );
}
```

### 5. Users Management Component

```typescript
// components/admin/UsersTable.tsx
'use client';

import { useState } from 'react';
import { useUsers, useDeleteUser } from '@/hooks/api/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export function UsersTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data, isLoading, error } = useUsers(currentPage, 10);
  const deleteUserMutation = useDeleteUser();

  const handleDeleteUser = async (digitalIdentifier: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUserMutation.mutateAsync(digitalIdentifier);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load users: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <PermissionGuard requiredRoles={['admin', 'doctor']}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Users Management</h2>
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Blood Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.users.map((user) => (
                <TableRow key={user.digitalIdentifier}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'pharmacist' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>{user.age}</TableCell>
                  <TableCell>{user.bloodType || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.emailVerified && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          Email ✓
                        </span>
                      )}
                      {user.phoneVerified && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          Phone ✓
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteUser(user.digitalIdentifier)}
                        disabled={deleteUserMutation.isPending}
                      >
                        {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, data.pagination.totalItems)} of {data.pagination.totalItems} users
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!data.pagination.hasPrev}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!data.pagination.hasNext}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
```

## 🎨 Layout Components

### 6. Protected Layout

```typescript
// components/layout/ProtectedLayout.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  requiredRoles?: ('patient' | 'doctor' | 'pharmacist' | 'admin')[];
}

export function ProtectedLayout({ children, requiredRoles }: ProtectedLayoutProps) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user && requiredRoles && !requiredRoles.includes(user.role)) {
      router.push('/unauthorized');
    }
  }, [user, requiredRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return null; // Will redirect to unauthorized
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Health Records</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name}
              </span>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
```

## 🔧 Setup Instructions

### 1. Install Required Packages

```bash
npm install @tanstack/react-query zustand
```

### 2. Update Root Layout

```typescript
// app/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### 3. Create Protected Pages

```typescript
// app/dashboard/page.tsx
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { UsersTable } from '@/components/admin/UsersTable';

export default function DashboardPage() {
  return (
    <ProtectedLayout requiredRoles={['admin', 'doctor']}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <UsersTable />
      </div>
    </ProtectedLayout>
  );
}
```

## 🎯 Integration Checklist

- [ ] Authentication context provides user state and auth methods
- [ ] All API calls include JWT token in Authorization header  
- [ ] Form validation matches backend Zod schemas
- [ ] Error handling covers network failures and API errors
- [ ] Loading states provide good user experience
- [ ] Permission guards protect sensitive components
- [ ] React Query handles caching and synchronization
- [ ] Components are properly typed with TypeScript

This implementation provides a solid foundation for building production-ready components that integrate seamlessly with your backend authentication and API systems.
