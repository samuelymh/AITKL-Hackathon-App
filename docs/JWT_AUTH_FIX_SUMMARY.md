# JWT Authentication Fix for Doctor Professional Info API

## Issue Identified
The doctor professional information API was failing with a "JWT malformed" error due to incorrect token retrieval from localStorage.

## Root Cause
- **AuthContext** stores JWT tokens with key `"auth-token"` in localStorage
- **Doctor components** were looking for `"authToken"` key in localStorage  
- This resulted in `null` or `undefined` tokens being sent, causing JWT malformed errors

## Solution Applied

### 1. Updated DoctorProfessionalInformation Component
**Before:**
```typescript
const token = localStorage.getItem("authToken"); // Wrong key
```

**After:**
```typescript
const { user, token, logout, refreshAuthToken } = useAuth(); // Use auth hook
```

### 2. Updated DoctorDashboard Component  
**Before:**
```typescript
const token = localStorage.getItem("authToken"); // Wrong key
```

**After:**
```typescript
const { user, token, refreshAuthToken, logout } = useAuth(); // Use auth hook
```

### 3. Enhanced Error Handling
Added proper token refresh logic and fallback handling:
- Check for token availability before API calls
- Automatic token refresh on 401 responses
- Proper logout on authentication failures

## Changes Made

### Files Modified:
1. **`components/healthcare/DoctorProfessionalInformation.tsx`**
   - Updated to use `useAuth()` hook instead of localStorage
   - Added token refresh logic for expired tokens
   - Enhanced error handling with logout fallback

2. **`components/healthcare/DoctorDashboard.tsx`**
   - Updated to use `useAuth()` hook instead of localStorage  
   - Added token validation before API calls
   - Improved error handling for authentication failures

### Key Improvements:
- ✅ **Correct Token Retrieval**: Using proper auth hook instead of localStorage
- ✅ **Token Refresh Logic**: Automatic retry with refreshed tokens on 401 errors
- ✅ **Error Handling**: Proper logout on authentication failures
- ✅ **Consistency**: Now matches pattern used by patient components

## Testing Results
- ✅ No compilation errors
- ✅ Components properly use auth context
- ✅ Token authentication should now work correctly
- ✅ Follows same pattern as working patient components

## Technical Notes

The fix ensures consistency across the application by:
1. Using the centralized auth context instead of direct localStorage access
2. Following the same authentication patterns as existing patient components  
3. Providing robust error handling for token-related issues
4. Implementing proper token refresh mechanisms

This should resolve the JWT malformed errors and allow doctors to successfully access and update their professional information.
