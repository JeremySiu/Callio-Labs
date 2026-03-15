#!/usr/bin/env bash
# Run Langflow (requires: pip install langflow)
# Then open http://127.0.0.1:7860 in your browser

if ! command -v langflow &>/dev/null; then
  echo "Langflow not found. Install with: pip install langflow"
  exit 1
fi
echo "Starting Langflow at http://127.0.0.1:7860"
langflow run
