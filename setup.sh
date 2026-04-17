#!/bin/bash
# Run this once on the VPS to set everything up.
set -e

REMOTE_DIR="/home/ubuntu/inflow"
STATIC_DIR="/var/www/inflow"

echo "==> Creating directories..."
sudo mkdir -p "$STATIC_DIR"
sudo chown ubuntu:ubuntu "$STATIC_DIR"
mkdir -p "$REMOTE_DIR"

echo "==> Installing Python deps..."
pip install -q -r "$REMOTE_DIR/requirements.txt"

echo "==> Installing systemd service..."
sudo cp "$REMOTE_DIR/api/inflow-api.service" /etc/systemd/system/inflow-api.service
sudo systemctl daemon-reload
sudo systemctl enable inflow-api
sudo systemctl start inflow-api

echo "==> Configuring Caddy..."
sudo cp "$REMOTE_DIR/Caddyfile" /etc/caddy/Caddyfile
sudo systemctl reload caddy

echo "==> Setup complete."
sudo systemctl status inflow-api --no-pager
