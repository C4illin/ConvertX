#!/usr/bin/env bash
#
# health_check.sh - API Server Health Check Script
#
# This script performs health checks on the ConvertX API Server.
# It can be used for:
# - Docker container health checks
# - CI/CD pipeline readiness checks
# - Manual verification after deployment
#
# Usage:
#   ./health_check.sh [API_URL]
#
# Example:
#   ./health_check.sh http://localhost:3001
#   ./health_check.sh http://convertx-api:3001
#
# Exit codes:
#   0 - API is healthy
#   1 - API is unhealthy or unreachable
#

set -euo pipefail

# Default API URL
API_URL="${1:-http://localhost:3001}"
TIMEOUT="${HEALTH_CHECK_TIMEOUT:-5}"
RETRIES="${HEALTH_CHECK_RETRIES:-3}"
RETRY_DELAY="${HEALTH_CHECK_DELAY:-2}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check health endpoint
check_health() {
    local url="$1/health"
    local response
    local http_code
    
    # Make the request and capture both body and status code
    response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" "$url" 2>/dev/null) || return 1
    
    # Extract status code (last line) and body (everything else)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Check HTTP status code
    if [ "$http_code" != "200" ]; then
        log_error "Health check returned HTTP $http_code"
        return 1
    fi
    
    # Check response body for "healthy" status
    if echo "$body" | grep -q '"status":\s*"healthy"'; then
        return 0
    else
        log_error "Health check response does not indicate healthy status"
        log_error "Response: $body"
        return 1
    fi
}

# Function to check engines endpoint
check_engines() {
    local url="$1/api/v1/engines"
    local response
    local http_code
    
    # Note: This endpoint requires authentication in production
    # For basic connectivity check, we just verify it responds
    response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" "$url" 2>/dev/null) || return 1
    
    http_code=$(echo "$response" | tail -n1)
    
    # 200 OK or 401 Unauthorized both indicate the server is responding
    if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
        return 0
    fi
    
    return 1
}

# Main health check with retries
main() {
    log_info "Checking ConvertX API Server at $API_URL"
    log_info "Timeout: ${TIMEOUT}s, Retries: $RETRIES, Retry delay: ${RETRY_DELAY}s"
    
    local attempt=1
    
    while [ $attempt -le $RETRIES ]; do
        log_info "Attempt $attempt of $RETRIES..."
        
        if check_health "$API_URL"; then
            log_info "✓ Health check passed"
            
            if check_engines "$API_URL"; then
                log_info "✓ Engines endpoint responding"
            fi
            
            log_info "API Server is healthy and ready!"
            exit 0
        fi
        
        if [ $attempt -lt $RETRIES ]; then
            log_warn "Health check failed, retrying in ${RETRY_DELAY}s..."
            sleep "$RETRY_DELAY"
        fi
        
        attempt=$((attempt + 1))
    done
    
    log_error "Health check failed after $RETRIES attempts"
    log_error "API Server at $API_URL is not responding correctly"
    exit 1
}

# Run main function
main
