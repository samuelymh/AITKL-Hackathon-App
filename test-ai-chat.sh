#!/bin/bash

# Test AI Chat API Endpoints
# Make sure your Next.js app is running on localhost:3000

BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api"

echo "🤖 Testing AI Chat API Endpoints"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo -e "\n${YELLOW}1. Testing AI Chat Health Check${NC}"
curl -s "${API_BASE}/ai/chat?action=health" | jq '.' || echo -e "${RED}❌ Health check failed${NC}"

# Test 2: Create AI session (requires authentication - will fail without valid JWT)
echo -e "\n${YELLOW}2. Testing AI Session Creation (will fail without auth)${NC}"
curl -s -X POST "${API_BASE}/ai/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionType": "general",
    "title": "Test Chat Session"
  }' | jq '.' || echo -e "${RED}❌ Expected failure - no authentication${NC}"

# Test 3: Get AI sessions (requires authentication - will fail without valid JWT)
echo -e "\n${YELLOW}3. Testing AI Sessions Retrieval (will fail without auth)${NC}"
curl -s "${API_BASE}/ai/sessions" | jq '.' || echo -e "${RED}❌ Expected failure - no authentication${NC}"

# Test 4: Send AI chat message (requires authentication - will fail without valid JWT)
echo -e "\n${YELLOW}4. Testing AI Chat Message (will fail without auth)${NC}"
curl -s -X POST "${API_BASE}/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "message": "Hello, I have a question about my health",
    "sessionType": "general",
    "userRole": "patient"
  }' | jq '.' || echo -e "${RED}❌ Expected failure - no authentication${NC}"

echo -e "\n${GREEN}✅ API endpoint structure tests completed${NC}"
echo -e "${YELLOW}ℹ️  Note: Authentication failures are expected when testing without valid JWT tokens${NC}"
echo -e "${YELLOW}ℹ️  To test with authentication, log in to the app and use browser dev tools to get the session token${NC}"

# Instructions for manual testing
echo -e "\n${YELLOW}📋 Manual Testing Instructions:${NC}"
echo "1. Start your Next.js app: npm run dev"
echo "2. Log in to the app at http://localhost:3000"
echo "3. Go to the dashboard and try the AI chat features"
echo "4. Check the browser console for any errors"
echo "5. Verify chat messages are being sent and responses received"

echo -e "\n${YELLOW}🔍 Expected AI Chat Features:${NC}"
echo "• Chat interface in patient dashboard"
echo "• AI Assistant tab in doctor dashboard with clinical support and consultation prep"
echo "• Session management (create, list, update, delete)"
echo "• Different chat types: general, clinical_support, consultation_prep, medication_education, emergency_triage"
echo "• Emergency detection and appropriate responses"
echo "• Audit logging of all AI interactions"
echo "• Role-based access control"
