#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/.deploy"
SITE_DIR="$BUILD_DIR/site"
CRM_DIR="$BUILD_DIR/crm"

echo "Building site and CRM bundles..."
npm --prefix "$ROOT_DIR" run build:all

echo "Preparing deployment directories..."
rm -rf "$SITE_DIR" "$CRM_DIR"
mkdir -p "$SITE_DIR/.next" "$CRM_DIR"

cp -R "$ROOT_DIR/.next/standalone/." "$SITE_DIR/"
cp -R "$ROOT_DIR/.next/static" "$SITE_DIR/.next/static"
cp -R "$ROOT_DIR/public" "$SITE_DIR/public"
cp -R "$ROOT_DIR/frontend/dist/." "$CRM_DIR/"

echo "Deployment bundle created:"
echo "  Site: $SITE_DIR"
echo "  CRM:  $CRM_DIR"
