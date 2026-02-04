#!/bin/bash
# Authentication API Test Script
# Tests all auth endpoints

echo "🧪 Testing Todoria Authentication API"
echo "============================================"
echo ""

BASE_URL="http://localhost:5001/api"

# Test 1: Health Check
echo "1️⃣  Testing health check..."
curl -s "$BASE_URL/health" | json_pp
echo ""

# Test 2: Login with Admin
echo "2️⃣  Testing login (admin@todorio.com)..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@todorio.com","password":"password123"}' \
  -c /tmp/auth_cookies.txt)
echo $LOGIN_RESPONSE | json_pp
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"
echo ""

# Test 3: Get Current User
echo "3️⃣  Testing get current user..."
curl -s -X GET "$BASE_URL/auth/me" \
  -b /tmp/auth_cookies.txt | json_pp
echo ""

# Test 4: Get All Users
echo "4️⃣  Testing get all users..."
curl -s -X GET "$BASE_URL/auth/users" \
  -b /tmp/auth_cookies.txt | json_pp
echo ""

# Test 5: Protected Route Without Auth
echo "5️⃣  Testing protected route without authentication..."
curl -s -X GET "$BASE_URL/auth/me" | json_pp
echo ""

# Test 6: Logout
echo "6️⃣  Testing logout..."
curl -s -X POST "$BASE_URL/auth/logout" \
  -b /tmp/auth_cookies.txt | json_pp
echo ""

# Test 7: Access After Logout
echo "7️⃣  Testing access after logout (should fail)..."
curl -s -X GET "$BASE_URL/auth/me" \
  -b /tmp/auth_cookies.txt | json_pp
echo ""

# Test 8: Login with Bearer Token
echo "8️⃣  Testing Bearer token authentication..."
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | json_pp
echo ""

# Test 9: Invalid Credentials
echo "9️⃣  Testing login with invalid credentials..."
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@todorio.com","password":"wrongpass"}' | json_pp
echo ""

# Test 10: Registration (will fail due to 5 user limit)
echo "🔟 Testing user registration (should hit 5-user limit)..."
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@todorio.com","password":"newpass123","name":"New User"}' | json_pp
echo ""

echo "✅ All tests completed!"
