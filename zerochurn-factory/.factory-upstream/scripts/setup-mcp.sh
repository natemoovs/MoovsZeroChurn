#!/bin/bash

# MCP Setup Script for Moovs Factory
# Run this once to configure your API keys for Claude Code MCP servers

set -e

echo "🔧 Moovs Factory MCP Setup"
echo "=========================="
echo ""
echo "This script will help you configure API keys for Claude Code's MCP servers."
echo "Keys are stored in ~/.zshrc and never committed to git."
echo ""

# Detect shell config file
if [ -f "$HOME/.zshrc" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
else
    SHELL_CONFIG="$HOME/.zshrc"
fi

echo "Your keys will be added to: $SHELL_CONFIG"
echo ""

# Function to add or update an env var
add_env_var() {
    local var_name=$1
    local var_value=$2

    if grep -q "export $var_name=" "$SHELL_CONFIG" 2>/dev/null; then
        # Update existing
        sed -i '' "s|export $var_name=.*|export $var_name=\"$var_value\"|" "$SHELL_CONFIG"
    else
        # Add new
        echo "export $var_name=\"$var_value\"" >> "$SHELL_CONFIG"
    fi
}

# Notion
echo "📝 NOTION"
echo "Get your API key at: https://www.notion.so/my-integrations"
read -p "Notion API Key (or press Enter to skip): " NOTION_KEY
if [ -n "$NOTION_KEY" ]; then
    add_env_var "NOTION_API_KEY" "$NOTION_KEY"
    echo "✓ Notion configured"
fi
echo ""

# HubSpot
echo "🟠 HUBSPOT"
echo "Get your access token at: Settings → Integrations → Private Apps"
read -p "HubSpot Access Token (or press Enter to skip): " HUBSPOT_TOKEN
if [ -n "$HUBSPOT_TOKEN" ]; then
    add_env_var "HUBSPOT_ACCESS_TOKEN" "$HUBSPOT_TOKEN"
    echo "✓ HubSpot configured"
fi
echo ""

# Metabase
echo "📊 METABASE"
read -p "Metabase URL (e.g., https://metabase.moovs.io) (or press Enter to skip): " METABASE_URL_VAL
if [ -n "$METABASE_URL_VAL" ]; then
    add_env_var "METABASE_URL" "$METABASE_URL_VAL"
    echo "Get your API key at: Settings → Admin → Authentication → API Keys"
    read -p "Metabase API Key: " METABASE_KEY
    if [ -n "$METABASE_KEY" ]; then
        add_env_var "METABASE_API_KEY" "$METABASE_KEY"
    fi
    echo "✓ Metabase configured"
fi
echo ""

echo "=========================="
echo "✅ Setup complete!"
echo ""
echo "Run this to apply changes:"
echo "  source $SHELL_CONFIG"
echo ""
echo "Then restart Claude Code to connect to MCP servers."
