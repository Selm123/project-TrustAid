#!/usr/bin/env bash
set -e
if command -v npm >/dev/null 2>&1; then
  npm install
  npm run dev
else
  echo "Please install Node.js and npm first: https://nodejs.org/"
  exit 1
fi