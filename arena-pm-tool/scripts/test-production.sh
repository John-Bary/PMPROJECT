#!/bin/bash

# ===========================================
# Arena PM Tool - Local Production Test Script
# ===========================================
# This script builds and runs the application in production mode locally
# to verify everything works before deploying.

set -e  # Exit on error

echo "=========================================="
echo "Arena PM Tool - Production Build Test"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

echo -e "\n${YELLOW}Step 1: Building React client...${NC}"
cd client
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Client build successful!${NC}"
else
    echo -e "${RED}Client build failed!${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 2: Checking server dependencies...${NC}"
cd ../server
npm install --production
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Server dependencies installed!${NC}"
else
    echo -e "${RED}Failed to install server dependencies!${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 3: Starting server in production mode...${NC}"
echo "Server will start on port ${PORT:-5001}"
echo "Press Ctrl+C to stop"
echo ""

# Set production environment
export NODE_ENV=production

# Start server
node server.js
