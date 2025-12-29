#!/bin/bash

# Ashfall Contracts Deployment Script
# Run this after setting up your Movement testnet account

set -e

echo "🎮 Ashfall Contract Deployment"
echo "================================"

# Check if profile exists
if ! aptos config show-profiles | grep -q "movement-testnet"; then
    echo "❌ Profile 'movement-testnet' not found."
    echo ""
    echo "Create it with:"
    echo "  aptos init --profile movement-testnet \\"
    echo "    --network custom \\"
    echo "    --rest-url https://testnet.movementnetwork.xyz/v1"
    echo ""
    echo "Then fund the account at: https://faucet.movementnetwork.xyz"
    exit 1
fi

# Get the deployer address
DEPLOYER_ADDRESS=$(aptos config show-profiles --profile movement-testnet 2>/dev/null | grep "account:" | awk '{print $2}' | tr -d '"')

if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo "❌ Could not read deployer address from profile"
    exit 1
fi

echo "📍 Deployer: $DEPLOYER_ADDRESS"

# Compile
echo ""
echo "📦 Compiling contracts..."
aptos move compile --named-addresses ashfall=$DEPLOYER_ADDRESS

# Deploy
echo ""
echo "🚀 Deploying to Movement testnet..."
aptos move publish \
    --profile movement-testnet \
    --named-addresses ashfall=$DEPLOYER_ADDRESS \
    --assume-yes

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Contract Address: $DEPLOYER_ADDRESS"
echo ""
echo "Next steps:"
echo "1. Update frontend/.env.local with:"
echo "   NEXT_PUBLIC_CONTRACT_ADDRESS=$DEPLOYER_ADDRESS"
echo ""
echo "2. Update backend/.env with:"
echo "   CONTRACT_ADDRESS=$DEPLOYER_ADDRESS"
echo ""
echo "3. Add your server account as authorized:"
echo "   aptos move run --profile movement-testnet \\"
echo "     --function-id ${DEPLOYER_ADDRESS}::dungeon::add_server \\"
echo "     --args address:<SERVER_ADDRESS>"
