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

```typescript
import { ERC8004Client, EthersAdapter } from 'erc-8004-js';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('YOUR_RPC_URL');
const signer = await provider.getSigner();

const adapter = new EthersAdapter(provider, signer);
const client = new ERC8004Client({
  adapter,
  addresses: {
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    validationRegistry: '0x8004Cb1BF31DAf7788923b405b754f57acEB4272',
    chainId: 11155111, // Sepolia
  },
});

// Register an agent
const result = await client.identity.registerWithURI('ipfs://QmYourAgentData');
console.log('Agent ID:', result.agentId);
```

## Usage

### Identity Management

```typescript
// Register an agent
const { agentId, txHash } = await client.identity.registerWithURI(
  'https://example.com/agent.json'
);

// Get agent info
const owner = await client.identity.getOwner(agentId);
const tokenURI = await client.identity.getTokenURI(agentId);
```

### Reputation & Feedback

```typescript
// Submit feedback (no authorization required)
await client.reputation.giveFeedback({
  agentId,
  score: 95, // 0-100
  tag1: 'excellent-service',
  tag2: 'fast-response',
  feedbackUri: 'ipfs://QmFeedbackData',
});

// Get reputation summary
const summary = await client.reputation.getSummary(agentId);
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

// Read validation status
const status = await client.validation.getValidationStatus(requestHash);
```

## License

MIT

## Links

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [GitHub Repository](https://github.com/tetratorus/erc-8004-js)
