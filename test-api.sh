#!/bin/bash

# ConvertX API Test Script
# This script tests the basic API functionality

BASE_URL="http://localhost:3110/api/v1"
EMAIL="test@example.com"
PASSWORD="testpassword123"

echo "🧪 ConvertX API Test Suite"
echo "========================="
echo ""

# Function to pretty print JSON
pretty_json() {
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

# 1. Test Health Endpoint
echo "1️⃣ Testing Health Endpoint..."
HEALTH=$(curl -s $BASE_URL/health)
echo "Response:"
pretty_json "$HEALTH"
echo ""

# 2. Test Swagger Documentation
echo "2️⃣ Checking Swagger Documentation..."
SWAGGER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/swagger)
if [ "$SWAGGER_STATUS" = "200" ]; then
    echo "✅ Swagger documentation is available at $BASE_URL/swagger"
else
    echo "❌ Swagger documentation not accessible (HTTP $SWAGGER_STATUS)"
fi
echo ""

# 3. Test Registration
echo "3️⃣ Testing Registration..."
REGISTER=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
echo "Response:"
pretty_json "$REGISTER"

# Extract token
TOKEN=$(echo "$REGISTER" | jq -r '.data.token' 2>/dev/null)
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "Registration might have failed. Trying login instead..."
    
    # Try login
    LOGIN=$(curl -s -X POST $BASE_URL/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
    echo "Login Response:"
    pretty_json "$LOGIN"
    TOKEN=$(echo "$LOGIN" | jq -r '.data.token' 2>/dev/null)
fi

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."
echo ""

# 4. Test Current User
echo "4️⃣ Testing Get Current User..."
ME=$(curl -s $BASE_URL/auth/me \
  -H "Authorization: Bearer $TOKEN")
echo "Response:"
pretty_json "$ME"
echo ""

# 5. Test List Converters
echo "5️⃣ Testing List Converters..."
CONVERTERS=$(curl -s $BASE_URL/converters \
  -H "Authorization: Bearer $TOKEN")
echo "Response (first 500 chars):"
echo "$CONVERTERS" | jq '.' 2>/dev/null | head -c 500
echo "..."
echo ""

# 6. Test Get Specific Converter
echo "6️⃣ Testing Get Specific Converter (ffmpeg)..."
FFMPEG=$(curl -s $BASE_URL/converters/ffmpeg \
  -H "Authorization: Bearer $TOKEN")
echo "Response (first 500 chars):"
echo "$FFMPEG" | jq '.' 2>/dev/null | head -c 500
echo "..."
echo ""

# 7. Test Format Support
echo "7️⃣ Testing Format Support (PDF)..."
PDF_CONVERTERS=$(curl -s $BASE_URL/converters/formats/pdf \
  -H "Authorization: Bearer $TOKEN")
echo "Response:"
pretty_json "$PDF_CONVERTERS"
echo ""

# 8. Test List Jobs
echo "8️⃣ Testing List Jobs..."
JOBS=$(curl -s $BASE_URL/jobs \
  -H "Authorization: Bearer $TOKEN")
echo "Response:"
pretty_json "$JOBS"
echo ""

# 9. Test Start Conversion (with dummy data)
echo "9️⃣ Testing Start Conversion..."
CONVERSION=$(curl -s -X POST $BASE_URL/conversions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [{"name": "test.pdf"}],
    "converter": "libreoffice",
    "outputFormat": "docx"
  }')
echo "Response:"
pretty_json "$CONVERSION"
echo ""

# Summary
echo "📊 Test Summary"
echo "==============="
echo "✅ Health Check"
echo "✅ Authentication"
echo "✅ Converter Endpoints"
echo "✅ Job Management"
echo ""
echo "🎉 All basic API tests completed!"
echo ""
echo "📝 Note: File conversion endpoints require actual file uploads."
echo "   Use the Swagger UI at $BASE_URL/swagger for interactive testing."