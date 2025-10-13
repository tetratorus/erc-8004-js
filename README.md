# ERC-8004 SDK

TypeScript SDK for interacting with ERC-8004 Trustless Agents protocol.

## Overview

ERC-8004 enables trustless agent economies through three core registries:

- **Identity Registry** - On-chain agent registration with portable identifiers
- **Reputation Registry** - Feedback and reputation scoring system
- **Validation Registry** - Independent validation and verification hooks

This SDK provides a simple, type-safe interface to interact with ERC-8004 contracts using either **ethers.js** or **viem**.

## Installation

```bash
npm install erc-8004-js
```

## Quick Start

### Using Ethers.js

```typescript
import { ERC8004Client, EthersAdapter } from 'erc-8004-js';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('YOUR_RPC_URL');
const signer = await provider.getSigner();

const adapter = new EthersAdapter(provider, signer);
const client = new ERC8004Client({
  adapter,
  addresses: {
    identityRegistry: '0x...',
    reputationRegistry: '0x...',
    validationRegistry: '0x...',
    chainId: 11155111, // Sepolia
  },
});

// Register an agent
const result = await client.identity.registerWithURI('ipfs://QmYourAgentData');
console.log('Agent ID:', result.agentId);
```

### Using Viem

```typescript
import { ERC8004Client, ViemAdapter } from 'erc-8004-js';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('YOUR_RPC_URL'),
});

const account = privateKeyToAccount('0x...');
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http('YOUR_RPC_URL'),
});

const adapter = new ViemAdapter(publicClient, walletClient, account);
const client = new ERC8004Client({
  adapter,
  addresses: {
    identityRegistry: '0x...',
    reputationRegistry: '0x...',
    validationRegistry: '0x...',
    chainId: 11155111,
  },
});
```

## Contract Addresses

### Sepolia (ChaosChainsAI Deployment)

```typescript
const addresses = {
  identityRegistry: '0x7177a6867296406881E20d6647232314736Dd09A',
  reputationRegistry: '0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322',
  validationRegistry: '0x662b40A526cb4017d947e71eAF6753BF3eeE66d8',
  chainId: 11155111,
};
```

## Core Features

### Identity Management

```typescript
// Register an agent
const { agentId, txHash } = await client.identity.registerWithURI(
  'https://example.com/agent.json'
);

// Get agent info
const owner = await client.identity.ownerOf(agentId);
const tokenURI = await client.identity.tokenURI(agentId);
```

### Reputation & Feedback

```typescript
// Create feedback authorization (agent owner signs)
const feedbackAuth = client.reputation.createFeedbackAuth(
  agentId,
  clientAddress,
  indexLimit,
  expiry,
  chainId,
  signerAddress
);

const signedAuth = await client.reputation.signFeedbackAuth(feedbackAuth);

// Submit feedback (client submits with signed auth)
await client.reputation.giveFeedback({
  agentId,
  score: 95, // 0-100
  tag1: 'excellent-service',
  tag2: 'fast-response',
  fileuri: 'ipfs://QmFeedbackData',
  feedbackAuth: signedAuth,
});

// Get reputation summary
const summary = await client.reputation.getSummary(agentId);
console.log('Average Score:', summary.averageScore);
console.log('Total Feedback:', summary.count);
```

### Validation

```typescript
import { ipfsUriToBytes32 } from 'erc-8004-js';

// Request validation
const requestUri = 'ipfs://QmValidationRequest';
const requestHash = ipfsUriToBytes32(requestUri);

await client.validation.validationRequest({
  validatorAddress,
  agentId,
  requestUri,
  requestHash,
});

// Validator provides response
await client.validation.validationResponse({
  requestHash,
  response: 100, // 0-100 (0=failed, 100=passed)
  responseUri: 'ipfs://QmValidationResponse',
  tag: 'zkML-proof',
});

// Read validation status
const status = await client.validation.getValidationStatus(requestHash);
```

## IPFS Integration

The SDK includes comprehensive IPFS support for uploading, pinning, and fetching content.

### Quick Example

```typescript
import { createIPFSClient } from 'erc-8004-js';

// Create IPFS client (supports Pinata, NFT.Storage, Web3.Storage, local IPFS)
const ipfs = createIPFSClient({
  provider: 'pinata',
  apiKey: process.env.PINATA_API_KEY,
  apiSecret: process.env.PINATA_API_SECRET,
});

// Upload agent registration data
const agentData = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'My Agent',
  description: 'AI agent for task automation',
  endpoints: [/* ... */],
};

const result = await ipfs.uploadJSON(agentData);
console.log('IPFS URI:', result.uri); // ipfs://Qm...

// Register agent with IPFS URI
await client.identity.registerWithURI(result.uri);

// Fetch content from IPFS
const data = await ipfs.fetchJSON(result.cid);
```

### CID Conversion Utilities

Convert IPFS CIDs to bytes32 for on-chain storage:

```typescript
import { cidToBytes32, ipfsUriToBytes32 } from 'erc-8004-js';

// Convert CID to bytes32 for use as request hash
const cid = 'QmR7GSQM93Cx5eAg6a6yRzNde1FQv7uL6X1o4k7zrJa3LX';
const hash = cidToBytes32(cid);

// Or with ipfs:// URI
const uri = 'ipfs://QmR7GSQM93Cx5eAg6a6yRzNde1FQv7uL6X1o4k7zrJa3LX';
const hash2 = ipfsUriToBytes32(uri);
```

📚 **[Full IPFS Guide](./docs/IPFS_GUIDE.md)** - Comprehensive documentation with examples for all IPFS providers

## Examples

See the `examples/` directory for complete working examples:

- `testIdentity.ts` - Agent registration
- `testReputation.ts` - Reputation and feedback flow
- `testValidation.ts` - Validation requests and responses
- `testViem.ts` - Using the Viem adapter
- `testChaosChain.ts` - Testing against Sepolia deployment
- `testIPFS.ts` - IPFS uploading, pinning, and fetching

Run examples:

```bash
npm run test:register
npm run test:feedback
npm run test:validation
npm run test:viem
```

## Architecture

The SDK uses an adapter pattern to support multiple blockchain libraries:

- **EthersAdapter** - For ethers.js v6
- **ViemAdapter** - For viem v2

Both adapters implement the same `BlockchainAdapter` interface, making them fully interchangeable.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## License

MIT

## Specification

For the complete ERC-8004 specification, see [SPEC.md](./SPEC.md).

## Links

- [ERC-8004 Specification](./SPEC.md)
- [ChaosChainsAI](https://chaoschain.ai)
- [GitHub Repository](https://github.com/tetratorus/sdk)
