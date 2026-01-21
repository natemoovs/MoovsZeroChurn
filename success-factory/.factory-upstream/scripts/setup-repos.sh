#!/bin/bash
#
# Setup script for Moovs platform repos
#
# This script clones the required Moovs repos as siblings to moovs-factory.
# Run from the moovs-factory directory.
#
# Usage: ./scripts/setup-repos.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the moovs-factory directory
FACTORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(dirname "$FACTORY_DIR")"

echo "🚀 Moovs Platform Setup"
echo "======================="
echo ""
echo "Factory dir: $FACTORY_DIR"
echo "Repos will be cloned to: $PARENT_DIR"
echo ""

# Check for GitHub CLI or SSH access
if ! command -v gh &> /dev/null && ! ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo -e "${YELLOW}⚠️  Warning: Neither GitHub CLI nor SSH access detected.${NC}"
    echo "   You may need to authenticate. Install gh CLI or set up SSH keys."
    echo ""
fi

# Repos to clone (GitHub org/repo format)
declare -A REPOS=(
    ["server"]="moovsio/swoop-server"
    ["dooms-operator"]="moovsio/dooms-operator"
    ["dooms-customer"]="moovsio/dooms-customer"
    ["dooms-native-driver"]="moovsio/dooms-native-driver"
)

clone_or_update() {
    local name=$1
    local repo=$2
    local target="$PARENT_DIR/$name"

    if [[ -d "$target/.git" ]]; then
        echo -e "${GREEN}✓${NC} $name already exists, pulling latest..."
        cd "$target"
        git pull --quiet 2>/dev/null || echo -e "${YELLOW}  ⚠️  Could not pull (might have uncommitted changes)${NC}"
    else
        echo -e "📦 Cloning $name..."
        cd "$PARENT_DIR"

        # Try HTTPS first, then SSH
        if git clone "https://github.com/$repo.git" "$name" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} $name cloned successfully"
        elif git clone "git@github.com:$repo.git" "$name" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} $name cloned successfully (via SSH)"
        else
            echo -e "${RED}✗${NC} Failed to clone $name"
            echo "   Try: gh auth login"
            return 1
        fi
    fi
}

# Clone each repo
for name in "${!REPOS[@]}"; do
    clone_or_update "$name" "${REPOS[$name]}"
done

echo ""
echo "✅ Setup complete!"
echo ""
echo "Directory structure:"
echo "  $PARENT_DIR/"
echo "  ├── moovs-factory/    (this repo)"
echo "  ├── server/           (backend)"
echo "  ├── dooms-operator/   (operator frontend)"
echo "  ├── dooms-customer/   (customer frontend)"
echo "  └── dooms-native-driver/ (driver app)"
echo ""
echo "The SessionStart hook will now automatically pull these repos when you start Claude Code."
