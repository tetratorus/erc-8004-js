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
    identityRegistry: '0x8004a6090Cd10A7288092483047B097295Fb8847',
    reputationRegistry: '0x8004B8FD1A363aa02fDC07635C0c5F94f6Af5B7E',
    validationRegistry: '0x8004CB39f29c09145F24Ad9dDe2A108C1A2cdfC5',
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

// Submit feedback
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
