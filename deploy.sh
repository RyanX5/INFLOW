#!/bin/bash
set -e

VPS_USER="ubuntu"
VPS_HOST="seminar2.duckdns.org"
REMOTE_DIR="/home/ubuntu/inflow"
STATIC_DIR="/var/www/inflow"

echo "==> Building frontend..."
cd visualization
npm ci --silent
npm run build
cd ..

echo "==> Syncing files to $VPS_HOST..."
ssh "$VPS_USER@$VPS_HOST" "mkdir -p $REMOTE_DIR $STATIC_DIR"

rsync -az --delete visualization/dist/ "$VPS_USER@$VPS_HOST:$STATIC_DIR/"
rsync -az --delete simulation/ "$VPS_USER@$VPS_HOST:$REMOTE_DIR/simulation/"
rsync -az --delete api/ "$VPS_USER@$VPS_HOST:$REMOTE_DIR/api/"
rsync -az requirements.txt "$VPS_USER@$VPS_HOST:$REMOTE_DIR/"

echo "==> Installing deps and restarting API..."
ssh "$VPS_USER@$VPS_HOST" bash << 'ENDSSH'
  cd /home/ubuntu/inflow
  pip install -q -r requirements.txt
  sudo systemctl restart inflow-api
  sudo systemctl is-active inflow-api
ENDSSH

echo "==> Done. Visit https://seminar2.duckdns.org"
