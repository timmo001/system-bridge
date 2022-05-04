#!/bin/bash
# ==============================================================================
# Displays an message right before terminating in case something went wrong
# ==============================================================================

if [[ "${S6_STAGE2_EXITED}" -ne 0 ]]; then
  echo '-----------------------------------------------------------'
  echo '                Oops! Something went wrong.'
  echo ' Be sure to check the log above, line by line, for hints.'
  echo '-----------------------------------------------------------'
fi
