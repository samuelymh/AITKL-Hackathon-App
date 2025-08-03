# Frontend Component Development Guide

## Overview

This guide provides comprehensive instructions for implementing production-ready React components for our centralized health application. The backend authentication system, API endpoints, and data models are already implemented and production-ready.

## 🏗️ Current Architecture Status

### ✅ **Backend Ready (Production)**
- **Authentication System**: JWT-based with role-based access control
- **API Endpoints**: RESTful APIs with proper security and validation
- **Database Models**: MongoDB with audit logging and base schema
- **Security**: Password hashing, account lockout, input validation
- **Performance**: Query optimization, connection pooling, pagination

### 🚧 **Frontend Components (Needs Integration)**
- **UI Components**: Basic components exist but need backend integration
- **Authentication Flow**: No login/register forms connected to API
- **State Management**: Currently using local state, needs global state
- **Error Handling**: Missing production-ready error boundaries
- **Loading States**: No loading indicators or skeleton screens

## 🎯 **Your Mission: Production-Ready Frontend**

### 1. **Authentication Components** (Priority: HIGH)

#### A. Login/Register Forms
Create components that integrate with our authentication API:

```typescript
// components/auth/LoginForm.tsx
interface LoginFormProps {
  onLoginSuccess: (user: User, token: string) => void;
  onError: (error: string) => void;
}

// API Integration Points:
// POST /api/auth/login
// POST /api/auth/register
```

**Required Features:**
- Form validation using `zod` (matching backend schemas)
- Loading states during API calls
- Error handling with user-friendly messages
- Password strength indicator
- Account lockout notifications
- JWT token storage in httpOnly cookies or secure localStorage

#### B. Authentication Context
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}
```

### 2. **Data Fetching & API Integration** (Priority: HIGH)

#### A. API Client Setup
```typescript
// lib/api-client.ts
class ApiClient {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    this.token = null;
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Implementation with:
    // - JWT token in Authorization header
    // - Error handling for 401, 403, 500
    // - Retry logic for network failures
    // - Type-safe responses
  }
}
```

#### B. React Query Integration
```bash
npm install @tanstack/react-query
```

```typescript
// hooks/api/useUsers.ts
export function useUsers(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['users', page, limit],
    queryFn: () => apiClient.get(`/api/users?page=${page}&limit=${limit}`),
    enabled: isAuthenticated, // Only fetch when authenticated
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: CreateUserData) => 
      apiClient.post('/api/users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

### 3. **Role-Based Component Rendering** (Priority: HIGH)

#### A. Permission Guard Component
```typescript
// components/auth/PermissionGuard.tsx
interface PermissionGuardProps {
  requiredRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ requiredRoles, children, fallback }: PermissionGuardProps) {
  const { user } = useAuth();
  
  if (!user || !requiredRoles.includes(user.role)) {
    return fallback || <div>Access Denied</div>;
  }
  
  return <>{children}</>;
}
```

#### B. Role-Specific Dashboards
```typescript
// components/dashboards/PatientDashboard.tsx
export function PatientDashboard() {
  const { data: userProfile } = useUserProfile();
  const { data: prescriptions } = usePrescriptions();
  const { data: auditLogs } = useAuditLogs();

  return (
    <div>
      <ProfileSection user={userProfile} />
      <PrescriptionsList prescriptions={prescriptions} />
      <AuditLogViewer logs={auditLogs} />
    </div>
  );
}

// components/dashboards/DoctorDashboard.tsx
export function DoctorDashboard() {
  const { data: patients } = usePatients();
  const { data: sharedRecords } = useSharedRecords();

  return (
    <div>
      <PatientSearch />
      <SharedRecordsList records={sharedRecords} />
      <PrescriptionWriter />
    </div>
  );
}
```

### 4. **Production-Ready UI Components** (Priority: MEDIUM)

#### A. Data Display Components
```typescript
// components/ui/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination?: PaginationData;
  loading?: boolean;
  onRowClick?: (row: T) => void;
}

// Features to implement:
// - Sorting
// - Filtering
// - Pagination with backend integration
// - Loading skeletons
// - Empty states
// - Row selection
// - Bulk actions
```

#### B. Form Components
```typescript
// components/forms/UserForm.tsx
interface UserFormProps {
  initialData?: Partial<User>;
  onSubmit: (data: UserFormData) => Promise<void>;
  mode: 'create' | 'edit';
}

// Features:
// - Field validation with real-time feedback
// - Async validation (email uniqueness)
// - Auto-save drafts
// - Form state persistence
// - Accessibility compliance
```

### 5. **Error Handling & Loading States** (Priority: HIGH)

#### A. Error Boundary
```typescript
// components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  // Implementation with:
  // - Error logging to external service
  // - User-friendly error messages
  // - Retry mechanisms
  // - Fallback UI components
}
```

#### B. Loading Components
```typescript
// components/ui/LoadingStates.tsx
export function PageLoader() {
  return <div>Full page loading spinner</div>;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return <div>Table loading skeleton</div>;
}

export function CardSkeleton() {
  return <div>Card loading skeleton</div>;
}
```

### 6. **State Management** (Priority: MEDIUM)

#### A. Global State with Zustand
```bash
npm install zustand
```

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Implementation
}));
```

#### B. UI State Management
```typescript
// stores/uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Notification) => void;
}
```

## 📋 **Implementation Checklist**

### Phase 1: Authentication & Core Infrastructure (Week 1)
- [ ] Set up authentication context and hooks
- [ ] Create login/register forms with API integration
- [ ] Implement JWT token management
- [ ] Set up API client with authentication headers
- [ ] Add React Query for data fetching
- [ ] Create permission guard components

### Phase 2: User Management & Dashboards (Week 2)
- [ ] Implement role-specific dashboards
- [ ] Create user management components (CRUD)
- [ ] Add patient profile management
- [ ] Implement doctor portal with patient search
- [ ] Create pharmacist prescription management

### Phase 3: Advanced Features (Week 3)
- [ ] Implement audit log viewer
- [ ] Add document upload functionality
- [ ] Create prescription management system
- [ ] Implement record sharing with QR codes
- [ ] Add real-time notifications

### Phase 4: Production Polish (Week 4)
- [ ] Add comprehensive error handling
- [ ] Implement loading states and skeletons
- [ ] Add accessibility features
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Testing and bug fixes

## 🔧 **Technical Specifications**

### API Integration Examples

#### User Authentication
```typescript
// Login example
const loginUser = async (email: string, password: string) => {
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
  return {
    user: data.user,
    token: data.token,
  };
};
```

#### Protected API Calls
```typescript
// Fetch users (Admin/Doctor only)
const fetchUsers = async (token: string, page = 1, limit = 10) => {
  const response = await fetch(`/api/users?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    // Handle token expiration
    throw new Error('Session expired');
  }

  if (response.status === 403) {
    // Handle insufficient permissions
    throw new Error('Access denied');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
};
```

### Form Validation (Matching Backend)
```typescript
// Use the same Zod schemas as backend
import { z } from 'zod';

const UserSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    dateOfBirth: z.string().transform((str) => new Date(str)),
    contact: z.object({
      email: z.string().email(),
      phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
    }),
  }),
  medicalInfo: z.object({
    bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
    knownAllergies: z.array(z.string()).optional(),
  }).optional(),
});
```

## 🚨 **Critical Success Factors**

### 1. **Security First**
- Always validate user permissions before rendering sensitive data
- Never store sensitive data in localStorage
- Implement proper CSRF protection
- Sanitize all user inputs
- Use HTTPS in production

### 2. **Performance**
- Implement proper loading states
- Use React.memo for expensive components
- Lazy load non-critical components
- Optimize bundle size
- Implement proper caching strategies

### 3. **User Experience**
- Provide immediate feedback for all user actions
- Implement proper error messages
- Ensure accessibility compliance
- Mobile-first responsive design
- Consistent design system

### 4. **Testing**
- Unit tests for all business logic
- Integration tests for API calls
- E2E tests for critical user flows
- Accessibility testing
- Performance testing

## 📚 **Resources & Documentation**

### Backend API Documentation
- Authentication: `docs/production-ready-auth-guide.md`
- Database Models: `docs/audit-logging-implementation.md`
- API Endpoints: All documented in route files

### Frontend Libraries to Use
- **UI Components**: Already using shadcn/ui
- **State Management**: Zustand or React Query
- **Forms**: React Hook Form + Zod
- **HTTP Client**: fetch with custom wrapper
- **Icons**: Lucide React (already installed)

### Development Tools
- **Type Safety**: TypeScript strict mode
- **Code Quality**: ESLint + Prettier
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright or Cypress

## 🎯 **Success Criteria**

Your implementation will be considered production-ready when:

1. **Authentication flows work seamlessly** with the backend API
2. **Role-based access control** is properly implemented in the UI
3. **All CRUD operations** are connected to backend endpoints
4. **Error handling** gracefully manages all failure scenarios
5. **Loading states** provide good user experience
6. **Mobile responsive** and accessible
7. **Performance optimized** with proper caching
8. **Type-safe** throughout the application

## 🤝 **Getting Help**

- Backend API is fully documented and tested
- All authentication patterns are established
- Database schemas are production-ready
- Audit logging is implemented and working
- Connection pooling and performance optimization is complete

Focus on connecting the existing UI components to the robust backend infrastructure that's already in place. The authentication system, data models, and API endpoints are production-ready and waiting for frontend integration.

Good luck building an amazing healthcare application! 🚀
