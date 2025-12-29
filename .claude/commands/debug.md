# Debug Mode

Full-stack debugging across contracts, game client, and server.

## Target

Debug issue: `$ARGUMENTS`

## Debugging Steps

### 1. Identify Layer
Determine which layer the issue is in:
- **Contracts**: Move module logic, resource handling
- **Server**: Game logic, chain sync, WebSocket
- **Client**: Phaser rendering, React UI, chain calls

### 2. Gather Information

For **Contracts**:
```bash
cd contracts
aptos move test --filter <module>
aptos move test -v  # verbose
```

For **Server**:
```bash
cd server
npm run dev  # Check console output
# Review logs for errors
```

For **Client**:
```bash
cd frontend
npm run dev  # Check browser console
# Use React DevTools
# Check Phaser debug mode
```

### 3. Chain State
Check Movement explorer for:
- Transaction status
- Event emissions
- Resource state

### 4. Common Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Item not appearing | Event not emitted | Add event::emit() |
| Combat not calculating | Server not authoritative | Check server->chain flow |
| Death not burning items | destroy() not called | Verify permadeath logic |
| Wallet not connecting | Privy config | Check environment vars |

### 5. Fix and Verify
- Apply fix
- Run relevant tests
- Verify in browser/chain

## Output

Report:
- Root cause identified
- Fix applied
- Verification steps taken
