#!/bin/bash
# Launch Extension Development Host with workspace
# This script ensures the workspace opens correctly

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

echo "Compiling extension..."
cd "$SCRIPT_DIR"
npm run compile

echo ""
echo "Launching Extension Development Host..."
echo ""
echo "Window should open with:"
echo "- Extension loaded"
echo "- Lineage workspace opened"
echo "- Extension activated"
echo ""

# Launch with extension development path and workspace
code --extensionDevelopmentPath="$SCRIPT_DIR" "$WORKSPACE_DIR"

echo ""
echo "If workspace didn't open:"
echo "1. In the Extension Development Host window, press Ctrl+K Ctrl+O"
echo "2. Select: $WORKSPACE_DIR"
echo "3. Extension will activate once workspace is open"
echo ""
