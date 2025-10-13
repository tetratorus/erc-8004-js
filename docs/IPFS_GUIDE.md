# IPFS Integration Guide

This guide covers how to use the IPFS client for uploading, pinning, and fetching content in the ERC-8004 SDK.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Supported Services](#supported-services)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Installation

The IPFS client is included in the SDK. No additional packages needed:

```bash
npm install erc-8004-js
```

For local IPFS node support, install IPFS Desktop or Kubo:
```bash
# macOS
brew install ipfs

# Or download from https://ipfs.tech
```

## Quick Start

### Using Pinata (Recommended)

```typescript
import { createIPFSClient } from 'erc-8004-js';

const ipfs = createIPFSClient({
  provider: 'pinata',
  apiKey: 'your-pinata-api-key',
  apiSecret: 'your-pinata-secret',
});

// Upload JSON data
const agentData = {
  name: 'My Agent',
  description: 'An AI agent',
  endpoints: [/* ... */],
};

const result = await ipfs.uploadJSON(agentData, {
  name: 'my-agent.json',
});

console.log('IPFS URI:', result.uri); // ipfs://Qm...
console.log('Gateway URL:', result.url);
```

## Supported Services

### 1. Pinata (Recommended for Production)

Best for: Production applications, reliability, advanced features

**Pros:**
- High reliability and uptime
- Dedicated pinning service
- Advanced API features
- Good free tier + reasonable pricing

**Setup:**
1. Sign up at [pinata.cloud](https://pinata.cloud)
2. Get API key and secret from dashboard
3. Configure:

```typescript
const ipfs = createIPFSClient({
  provider: 'pinata',
  apiKey: process.env.PINATA_API_KEY,
  apiSecret: process.env.PINATA_API_SECRET,
  gatewayUrl: 'https://gateway.pinata.cloud/ipfs/', // Optional
});
```

### 2. NFT.Storage

Best for: NFT-related content, free storage

**Pros:**
- Free for NFT content
- Backed by Filecoin
- Simple API

**Setup:**
1. Sign up at [nft.storage](https://nft.storage)
2. Get API token
3. Configure:

```typescript
const ipfs = createIPFSClient({
  provider: 'nftstorage',
  apiKey: process.env.NFT_STORAGE_KEY,
});
```

### 3. Web3.Storage

Best for: Web3 applications, free decentralized storage

**Pros:**
- Free storage
- Decentralized via Filecoin
- Simple to use

**Setup:**
1. Sign up at [web3.storage](https://web3.storage)
2. Get API token
3. Configure:

```typescript
const ipfs = createIPFSClient({
  provider: 'web3storage',
  apiKey: process.env.WEB3_STORAGE_KEY,
});
```

### 4. Local IPFS Node

Best for: Development, full control, privacy

**Pros:**
- Full control over your data
- No API keys needed
- No rate limits
- Works offline

**Setup:**
1. Install IPFS: `brew install ipfs` or download from [ipfs.tech](https://ipfs.tech)
2. Initialize: `ipfs init`
3. Start daemon: `ipfs daemon`
4. Configure:

```typescript
const ipfs = createIPFSClient({
  provider: 'ipfs',
  nodeUrl: 'http://127.0.0.1:5001',
  gatewayUrl: 'http://127.0.0.1:8080/ipfs/',
});
```

## API Reference

### `createIPFSClient(config)`

Creates a new IPFS client instance.

```typescript
interface IPFSClientConfig {
  provider: 'pinata' | 'nftstorage' | 'web3storage' | 'ipfs';
  apiKey?: string;
  apiSecret?: string;
  gatewayUrl?: string;
  nodeUrl?: string;
}
```

### `upload(content, options)`

Upload content to IPFS.

```typescript
await ipfs.upload(
  content: string | Buffer | Blob,
  options?: {
    name?: string;
    metadata?: Record<string, any>;
  }
): Promise<IPFSUploadResult>
```

**Returns:**
```typescript
interface IPFSUploadResult {
  cid: string;           // IPFS Content Identifier
  uri: string;           // ipfs:// URI
  url: string;           // Gateway URL
  size?: number;         // File size in bytes
}
```

### `uploadJSON(data, options)`

Upload JSON data to IPFS (convenience method).

```typescript
await ipfs.uploadJSON(
  data: any,
  options?: {
    name?: string;
    metadata?: Record<string, any>;
  }
): Promise<IPFSUploadResult>
```

### `pin(cid, options)`

Pin content to ensure availability (Pinata and local IPFS only).

```typescript
await ipfs.pin(
  cid: string,
  options?: { name?: string }
): Promise<void>
```

### `fetch(cidOrUri)`

Fetch content from IPFS.

```typescript
await ipfs.fetch(cidOrUri: string): Promise<string>
```

### `fetchJSON<T>(cidOrUri)`

Fetch and parse JSON content from IPFS.

```typescript
await ipfs.fetchJSON<T>(cidOrUri: string): Promise<T>
```

### `getGatewayUrl(cid)`

Get the gateway URL for a CID.

```typescript
ipfs.getGatewayUrl(cid: string): string
```

## Examples

### Upload Agent Registration

```typescript
import { createIPFSClient, ERC8004Client } from 'erc-8004-js';

// 1. Create IPFS client
const ipfs = createIPFSClient({
  provider: 'pinata',
  apiKey: process.env.PINATA_API_KEY,
  apiSecret: process.env.PINATA_API_SECRET,
});

// 2. Prepare agent data
const agentData = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'GPT-4 Agent',
  description: 'Advanced reasoning agent powered by GPT-4',
  image: 'https://example.com/avatar.png',
  endpoints: [
    {
      name: 'A2A',
      endpoint: 'https://agent.example.com/.well-known/agent-card.json',
      version: '0.3.0',
    },
  ],
  registrations: [],
  supportedTrust: ['reputation'],
};

// 3. Upload to IPFS
const result = await ipfs.uploadJSON(agentData, {
  name: 'gpt4-agent-registration.json',
  metadata: { agentType: 'llm', model: 'gpt-4' },
});

console.log('Uploaded to:', result.uri);

// 4. Register agent with IPFS URI
const client = new ERC8004Client({ /* ... */ });
await client.identity.registerWithURI(result.uri);
```

### Submit Feedback with IPFS Data

```typescript
// 1. Create detailed feedback data
const feedbackData = {
  taskId: 'task-123',
  timestamp: new Date().toISOString(),
  performance: {
    accuracy: 0.95,
    responseTime: 1200,
    quality: 'excellent',
  },
  evidence: [
    { type: 'screenshot', url: 'https://...' },
    { type: 'log', url: 'https://...' },
  ],
  comments: 'Agent completed the task flawlessly',
};

// 2. Upload to IPFS
const result = await ipfs.uploadJSON(feedbackData);

// 3. Submit feedback with IPFS reference
await client.reputation.submitFeedback({
  agentId: 123,
  score: 95,
  fileuri: result.uri,
  filehash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  tag1: ethers.encodeBytes32String('task-completion'),
  tag2: ethers.encodeBytes32String('high-quality'),
  feedbackAuth: /* ... */,
});
```

### Validation Request with IPFS

```typescript
import { ipfsUriToBytes32 } from 'erc-8004-js';

// 1. Prepare validation request data
const validationData = {
  taskId: 'task-456',
  inputs: { /* task inputs */ },
  outputs: { /* expected outputs */ },
  constraints: { timeout: 5000, maxTokens: 1000 },
  evidence: 'https://...',
};

// 2. Upload to IPFS
const result = await ipfs.uploadJSON(validationData);

// 3. Convert CID to bytes32 for on-chain storage
const requestHash = ipfsUriToBytes32(result.uri);

// 4. Submit validation request
await client.validation.requestValidation({
  agentId: 123,
  validatorAddress: '0x...',
  requestUri: result.uri,
  requestHash,
  tag: ethers.encodeBytes32String('output-verification'),
});
```

### Fetch and Verify Agent Data

```typescript
// 1. Get agent URI from registry
const agentId = 123;
const uri = await client.identity.getTokenURI(agentId);

// 2. Fetch from IPFS
const agentData = await ipfs.fetchJSON(uri);

// 3. Verify structure
if (agentData.type !== 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1') {
  throw new Error('Invalid agent registration format');
}

console.log('Agent name:', agentData.name);
console.log('Endpoints:', agentData.endpoints);
```

### Batch Upload

```typescript
async function uploadMultipleAgents(agents: any[]) {
  const results = [];

  for (const agent of agents) {
    try {
      const result = await ipfs.uploadJSON(agent, {
        name: `${agent.name}.json`,
      });

      results.push({
        success: true,
        name: agent.name,
        uri: result.uri,
      });

      // Pin for persistence
      await ipfs.pin(result.cid, { name: agent.name });

    } catch (error) {
      results.push({
        success: false,
        name: agent.name,
        error: error.message,
      });
    }
  }

  return results;
}
```

## Best Practices

### 1. Use Environment Variables

Never hardcode API keys:

```typescript
// ✅ Good
const ipfs = createIPFSClient({
  provider: 'pinata',
  apiKey: process.env.PINATA_API_KEY,
  apiSecret: process.env.PINATA_API_SECRET,
});

// ❌ Bad
const ipfs = createIPFSClient({
  provider: 'pinata',
  apiKey: 'hardcoded-key',
  apiSecret: 'hardcoded-secret',
});
```

### 2. Pin Important Content

Always pin content you want to keep available:

```typescript
const result = await ipfs.uploadJSON(data);
await ipfs.pin(result.cid, { name: 'important-data' });
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await ipfs.upload(content);
  console.log('Success:', result.uri);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 1000));
    return ipfs.upload(content);
  }
  throw error;
}
```

### 4. Use Metadata for Organization

```typescript
await ipfs.uploadJSON(data, {
  name: 'agent-123-registration.json',
  metadata: {
    agentId: 123,
    version: '1.0',
    created: new Date().toISOString(),
    project: 'my-agent-platform',
  },
});
```

### 5. Verify Content After Upload

```typescript
// Upload
const result = await ipfs.uploadJSON(originalData);

// Verify
const fetchedData = await ipfs.fetchJSON(result.cid);
const isValid = JSON.stringify(originalData) === JSON.stringify(fetchedData);

if (!isValid) {
  throw new Error('Data verification failed');
}
```

### 6. Choose the Right Gateway

For production, use dedicated gateways:

```typescript
const ipfs = createIPFSClient({
  provider: 'pinata',
  apiKey: process.env.PINATA_API_KEY,
  apiSecret: process.env.PINATA_API_SECRET,
  gatewayUrl: 'https://gateway.pinata.cloud/ipfs/', // Faster, more reliable
});
```

### 7. Cache CIDs

Store CIDs in your database to avoid re-uploading:

```typescript
// Check if already uploaded
const cachedCID = await db.getCID(contentHash);
if (cachedCID) {
  return { cid: cachedCID, uri: `ipfs://${cachedCID}` };
}

// Upload new content
const result = await ipfs.uploadJSON(data);
await db.saveCID(contentHash, result.cid);
return result;
```

### 8. Use IPFS for Immutable Data

IPFS is content-addressed, so the same content always gets the same CID:

```typescript
// Perfect for:
// - Agent registration data (versioned)
// - Feedback records (immutable)
// - Validation evidence (permanent)
// - Task specifications (fixed)

// Not ideal for:
// - Frequently changing data
// - Real-time data streams
```

## Troubleshooting

### "Upload failed: 401 Unauthorized"

Check your API credentials:
```typescript
console.log('API Key:', process.env.PINATA_API_KEY);
console.log('API Secret:', process.env.PINATA_API_SECRET?.slice(0, 5) + '...');
```

### "Failed to fetch from IPFS"

Try alternative gateways:
```typescript
const gateways = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
];

for (const gateway of gateways) {
  try {
    const url = `${gateway}${cid}`;
    const response = await fetch(url);
    if (response.ok) return response.text();
  } catch (error) {
    continue;
  }
}
```

### Local IPFS node not responding

Check if daemon is running:
```bash
ipfs daemon
# Should see: Daemon is ready
```

## Additional Resources

- [IPFS Documentation](https://docs.ipfs.tech)
- [Pinata Documentation](https://docs.pinata.cloud)
- [NFT.Storage Documentation](https://nft.storage/docs)
- [Web3.Storage Documentation](https://web3.storage/docs)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
