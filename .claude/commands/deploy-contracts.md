# Deploy Contracts

Deploy Move modules to Movement blockchain.

## Target

Deploy: `$ARGUMENTS` (or all if not specified)

## Pre-Deployment Checklist

- [ ] All tests pass: `aptos move test`
- [ ] No compilation errors: `aptos move compile`
- [ ] Environment variables set: `source .env`
- [ ] Wallet has MOVE for gas

## Deployment Steps

### 1. Compile
```bash
cd contracts
aptos move compile
```

### 2. Deploy to Testnet
```bash
aptos move publish \
  --named-addresses moverogue=default \
  --assume-yes
```

### 3. Verify Deployment
```bash
# Check module exists
aptos move view --function-id 'moverogue::character::get_version'
```

### 4. Update Frontend

After successful deployment:
1. Copy contract addresses to `frontend/src/lib/move/addresses.ts`
2. Update ABI if changed

## Post-Deployment

- [ ] Verify on Movement explorer
- [ ] Test basic functions work
- [ ] Update deployment config

## Rollback

If issues occur:
1. Keep old module version noted
2. Fix issues
3. Redeploy with new version
