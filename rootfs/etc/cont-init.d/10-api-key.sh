#!/bin/bash
# ==============================================================================
# Displays a simple banner on startup
# ==============================================================================
SB_API_KEY="$(python -m systembridgecli api-key)"
echo "Your API key is: $SB_API_KEY"
