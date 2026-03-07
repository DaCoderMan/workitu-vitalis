#!/bin/bash
# Scaffold a new Workitu project
# Usage: ./scripts/new-project.sh <project-name> <type>
# Types: nextjs, python, static
# Options: --vercel  Add Vercel deployment config (for nextjs type)

set -e

NAME=${1:?"Usage: new-project.sh <project-name> <type>"}
TYPE=${2:?"Type required: nextjs | python | static"}
DIR="workitu-$NAME"

if [ -d "$DIR" ]; then
  echo "❌ Directory $DIR already exists"
  exit 1
fi

echo "🏗️  Scaffolding $DIR (type: $TYPE)..."

case $TYPE in
  nextjs)
    npx create-next-app@latest "$DIR" --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
    cd "$DIR"
    ;;
  python)
    mkdir -p "$DIR/app"
    cd "$DIR"
    cat > app/main.py << 'PYEOF'
from fastapi import FastAPI

app = FastAPI(title="workitu-$NAME")

@app.get("/")
def root():
    return {"status": "ok", "project": "workitu-$NAME"}

@app.get("/health")
def health():
    return {"healthy": True}
PYEOF
    cat > requirements.txt << 'REQEOF'
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
REQEOF
    cat > .gitignore << 'GIEOF'
__pycache__/
*.py[cod]
venv/
.venv/
.env
.env.local
GIEOF
    git init
    ;;
  static)
    mkdir -p "$DIR"
    cd "$DIR"
    cat > index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workitu — $NAME</title>
</head>
<body>
  <h1>Workitu — $NAME</h1>
</body>
</html>
HTMLEOF
    cat > .gitignore << 'GIEOF'
.env
.DS_Store
Thumbs.db
GIEOF
    git init
    ;;
  *)
    echo "❌ Unknown type: $TYPE (use: nextjs | python | static)"
    exit 1
    ;;
esac

cat > README.md << READEOF
# workitu-$NAME

A Workitu Tech project.

## Setup

See project type for instructions.

## Deploy

\`\`\`bash
./scripts/deploy.sh $NAME
\`\`\`
READEOF

# Add Vercel config if --vercel flag is passed
if [[ "${3:-}" == "--vercel" ]] || [[ "${4:-}" == "--vercel" ]]; then
  cat > vercel.json << 'VCLEOF'
{
  "regions": ["fra1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
VCLEOF
  echo "   Added vercel.json (region: fra1)"
fi

echo "✅ Created $DIR ($TYPE)"
echo "   cd $DIR && start building!"
