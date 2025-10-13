# IPFS Quick Reference

## Installation

```bash
npm install erc-8004-js
```

## Setup

```typescript
import { createIPFSClient } from 'erc-8004-js';

const ipfs = createIPFSClient({
  provider: 'pinata',  // or 'nftstorage', 'web3storage', 'ipfs'
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',  // Pinata only
});
```

## Common Operations

### Upload JSON
```typescript
const result = await ipfs.uploadJSON(data, { name: 'file.json' });
// result.cid, result.uri, result.url
```

### Upload File
```typescript
const result = await ipfs.upload(buffer, { name: 'file.bin' });
```

### Fetch Content
```typescript
const data = await ipfs.fetchJSON('Qm...' or 'ipfs://Qm...');
```

### Pin Content
```typescript
await ipfs.pin(cid, { name: 'important-data' });
```

## Providers

| Provider | Setup URL | Notes |
|----------|-----------|-------|
| Pinata | [pinata.cloud](https://pinata.cloud) | Best for production |
| NFT.Storage | [nft.storage](https://nft.storage) | Free for NFTs |
| Web3.Storage | [web3.storage](https://web3.storage) | Free unlimited |
| Local IPFS | `brew install ipfs` | Development |

## Environment Variables

```bash
# Pinata
PINATA_API_KEY=xxx
PINATA_API_SECRET=xxx

# NFT.Storage
NFT_STORAGE_KEY=xxx

# Web3.Storage
WEB3_STORAGE_KEY=xxx

# Local IPFS
IPFS_NODE_URL=http://127.0.0.1:5001
```

## Full Docs

📚 See `docs/IPFS_GUIDE.md` for complete documentation
🔬 See `examples/testIPFS.ts` for working examples
