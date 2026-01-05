#!/bin/bash
# Verification script for system-bridge release packages
# Ensures that embedded web client contains proper Tailwind CSS

set -e

BINARY_PATH="${1:-./system-bridge}"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR; killall system-bridge 2>/dev/null || true" EXIT

echo "Verifying system-bridge binary for proper CSS inclusion..."
echo "Binary path: $BINARY_PATH"

# Check if binary exists
if [ ! -f "$BINARY_PATH" ]; then
    echo "ERROR: Binary not found at $BINARY_PATH"
    exit 1
fi

# Check if binary contains embedded web client
echo "Checking for embedded web client..."
if ! strings "$BINARY_PATH" | grep -q "web-client/dist/index.html"; then
    echo "ERROR: Binary does not contain embedded web client"
    exit 1
fi

echo "✓ Binary contains embedded web client"

# Since Go's embed.FS doesn't work like traditional archive extraction,
# we'll run binary temporarily and check served content
if command -v curl >/dev/null 2>&1; then
    echo "Starting temporary server to verify embedded content..."
    PORT=9171
    LOG_FILE="$TEMP_DIR/server.log"
    
    # Start server in background
    SYSTEM_BRIDGE_PORT="$PORT" "$BINARY_PATH" backend >"$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    
    # Function to clean up server
    cleanup_server() {
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    }
    
    # Wait for server to start
    echo "Waiting for server to start..."
    for i in {1..10}; do
        if curl -s "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
            echo "✓ Server started successfully"
            break
        fi
        if [ $i -eq 10 ]; then
            echo "ERROR: Server failed to start within 10 seconds"
            cat "$LOG_FILE"
            cleanup_server
            exit 1
        fi
        sleep 1
    done
    
    # Fetch index page and check for CSS
    echo "Fetching index page to verify CSS inclusion..."
    INDEX_CONTENT=$(curl -s "http://localhost:$PORT/")
    
    if echo "$INDEX_CONTENT" | grep -q "\.css"; then
        echo "✓ Embedded web client contains CSS references"
    else
        echo "ERROR: No CSS references found in served index page"
        echo "Index content (first 500 chars):"
        echo "$INDEX_CONTENT" | head -c 500
        echo ""
        cleanup_server
        exit 1
    fi
    
    # Try to fetch CSS file directly
    CSS_URL=$(echo "$INDEX_CONTENT" | grep -o 'href="[^"]*\.css"' | cut -d'"' -f2 | head -1)
    if [ -n "$CSS_URL" ]; then
        echo "Fetching CSS file: $CSS_URL"
        CSS_CONTENT=$(curl -s "http://localhost:$PORT$CSS_URL")
        
        if echo "$CSS_CONTENT" | grep -q "tw-"; then
            echo "✓ CSS contains Tailwind utility classes"
            
            # Check CSS size
            CSS_SIZE=$(echo "$CSS_CONTENT" | wc -c)
            if [ "$CSS_SIZE" -lt 10000 ]; then
                echo "WARNING: CSS seems small ($CSS_SIZE bytes). Expected at least 10KB for full Tailwind build."
            else
                echo "✓ CSS file size is reasonable ($CSS_SIZE bytes)"
            fi
        else
            echo "ERROR: CSS does not contain Tailwind utility classes"
            echo "First 200 characters of CSS:"
            echo "$CSS_CONTENT" | head -c 200
            echo ""
            cleanup_server
            exit 1
        fi
    else
        echo "ERROR: Could not extract CSS URL from index page"
        cleanup_server
        exit 1
    fi
    
    # Clean up server
    cleanup_server
    
else
    echo "WARNING: curl not available, basic verification only"
    echo "✓ Binary contains embedded web client"
fi

echo "✓ Binary verification passed"