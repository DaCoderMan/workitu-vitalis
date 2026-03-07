#!/bin/bash
# Deploy a project to Hetzner VPS
# Usage: ./scripts/deploy.sh <project-name> [branch]

set -e

PROJECT=${1:?"Usage: deploy.sh <project-name> [branch]"}
BRANCH=${2:-main}
VPS_IP="${VPS_HOST:-65.109.230.136}"
VPS_USER="${VPS_USER:-root}"
DEPLOY_PATH="/var/www/$PROJECT"

echo "🚀 Deploying $PROJECT (branch: $BRANCH) to $VPS_IP..."

ssh $VPS_USER@$VPS_IP << EOF
  cd $DEPLOY_PATH || { echo "❌ Path $DEPLOY_PATH not found"; exit 1; }
  echo "📥 Pulling latest..."
  git fetch origin
  git checkout $BRANCH
  git pull origin $BRANCH

  if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install --production
    echo "🔨 Building..."
    npm run build 2>/dev/null || echo "No build script found"
    echo "🔄 Restarting..."
    pm2 restart $PROJECT 2>/dev/null || echo "No PM2 process found for $PROJECT"
  elif [ -f "requirements.txt" ]; then
    echo "🐍 Python project detected..."
    pip install -r requirements.txt
    systemctl restart $PROJECT 2>/dev/null || echo "No systemd service found"
  fi

  echo "✅ Deployed $PROJECT successfully"
EOF
