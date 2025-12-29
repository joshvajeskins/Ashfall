# Ashfall Deployment Guide

## Prerequisites

- Node.js 18+
- Movement testnet access
- Privy account (https://dashboard.privy.io)
- Server wallet with MOVE for gas
- Aptos CLI installed

## 1. Deploy Contracts

```bash
cd contracts

# Set up Movement testnet profile
aptos init --profile movement-testnet \
  --network custom \
  --rest-url https://testnet.movementnetwork.xyz/v1

# Fund the account at https://faucet.movementnetwork.xyz

# Deploy
./deploy.sh
```

Record the deployed contract address.

## 2. Configure Environment

### Frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

### Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
SERVER_PRIVATE_KEY=your_server_private_key
```

## 3. Add Server Authorization

After deployment, authorize the server wallet:

```bash
aptos move run --profile movement-testnet \
  --function-id '0xYOUR_ADDRESS::dungeon::add_server' \
  --args address:0xSERVER_WALLET_ADDRESS
```

## 4. Local Development

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

## 5. Production Deployment

### Frontend (Vercel)

```bash
cd frontend
npm install -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_PRIVY_APP_ID`

### Backend (Railway/Render)

```bash
cd backend
npm run build
# Deploy to your hosting provider
```

Required environment variables:
- `PORT`
- `NODE_ENV=production`
- `MOVEMENT_RPC_URL`
- `SERVER_PRIVATE_KEY`
- `CONTRACT_ADDRESS`
- `CORS_ORIGIN` (your frontend URL)

## 6. Verify Deployment

```bash
# Frontend health
curl https://your-frontend.vercel.app/api/health

# Backend health
curl https://your-backend.railway.app/api/health
```

## Security Checklist

- [ ] `SERVER_PRIVATE_KEY` not in git
- [ ] `.env` files in `.gitignore`
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled
- [ ] HTTPS only in production

## Troubleshooting

### "Server account not initialized"
Check `SERVER_PRIVATE_KEY` in backend `.env`

### "E_UNAUTHORIZED"
Make sure server wallet was added via `add_server`

### Transaction timeouts
Movement testnet may be congested - increase timeout values
