#!/bin/bash
cd "$(dirname "$0")"
npm run build
node --no-inspect dist/main.js
