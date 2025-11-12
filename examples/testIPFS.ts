/**
 * Example: IPFS Upload and Pinning
 *
 * This example demonstrates how to use the IPFS client to:
 * - Upload files and JSON data to IPFS
 * - Pin content to keep it available
 * - Fetch content from IPFS
 * - Register agents with IPFS-hosted metadata
 */

import { createIPFSClient, ERC8004Client, EthersAdapter, IPFSClientConfig } from '../src';
import { ethers } from 'ethers';

// Contract addresses (vanity addresses via CREATE2 - deterministic across chains)
const IDENTITY_REGISTRY = '0x8004AbdDA9b877187bF865eD1d8B5A41Da3c4997';
const REPUTATION_REGISTRY = '0x8004B312333aCb5764597c2BeEe256596B5C6876';
const VALIDATION_REGISTRY = '0x8004C8AEF64521bC97AB50799d394CDb785885E3';

// Example agent registration data
const agentData = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'My AI Agent',
  description: 'An autonomous agent for task automation',
  image: 'https://example.com/agent-avatar.png',
  endpoints: [
    {
      name: 'A2A',
      endpoint: 'https://agent.example.com/.well-known/agent-card.json',
      version: '0.3.0',
    },
    {
      name: 'agentWallet',
      endpoint: 'eip155:31337:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    },
  ],
  registrations: [
    {
      agentId: 1,
      agentRegistry: 'eip155:31337:0x8004AbdDA9b877187bF865eD1d8B5A41Da3c4997',
    },
  ],
  supportedTrust: ['reputation', 'crypto-economic'],
};

async function main() {
  console.log('🚀 IPFS Upload & Pinning Example\n');

  // ============================================
  // 1. Setup IPFS Client
  // ============================================

  // Option 1: Using Pinata (recommended for production)
  const pinataConfig: IPFSClientConfig = {
    provider: 'pinata',
    apiKey: process.env.PINATA_API_KEY || 'your-pinata-api-key',
    apiSecret: process.env.PINATA_API_SECRET || 'your-pinata-secret',
    gatewayUrl: 'https://gateway.pinata.cloud/ipfs/', // Optional custom gateway
  };

  // Option 2: Using NFT.Storage
  const nftStorageConfig: IPFSClientConfig = {
    provider: 'nftstorage',
    apiKey: process.env.NFT_STORAGE_KEY || 'your-nft-storage-key',
    gatewayUrl: 'https://nftstorage.link/ipfs/',
  };

  // Option 3: Using Web3.Storage
  const web3StorageConfig: IPFSClientConfig = {
    provider: 'web3storage',
    apiKey: process.env.WEB3_STORAGE_KEY || 'your-web3-storage-key',
  };

  // Option 4: Using local IPFS node
  const localIPFSConfig: IPFSClientConfig = {
    provider: 'ipfs',
    nodeUrl: 'http://127.0.0.1:5001', // Your local IPFS daemon
    gatewayUrl: 'http://127.0.0.1:8080/ipfs/',
  };

  // Create client (using Pinata for this example)
  const ipfs = createIPFSClient(pinataConfig);

  // ============================================
  // 2. Upload JSON Data (Agent Registration)
  // ============================================

  console.log('📤 Uploading agent registration data to IPFS...');
  try {
    const result = await ipfs.uploadJSON(agentData, {
      name: 'my-agent-registration.json',
      metadata: {
        project: 'erc-8004-js',
        type: 'agent-registration',
      },
    });

    console.log('✅ Upload successful!');
    console.log('   CID:', result.cid);
    console.log('   URI:', result.uri);
    console.log('   Gateway URL:', result.url);
    if (result.size) {
      console.log('   Size:', result.size, 'bytes');
    }
    console.log();

    // ============================================
    // 3. Fetch Content from IPFS
    // ============================================

    console.log('📥 Fetching content from IPFS...');
    const fetchedData = await ipfs.fetchJSON(result.cid);
    console.log('✅ Fetched agent name:', fetchedData.name);
    console.log();

    // ============================================
    // 4. Pin Content (keep it available)
    // ============================================

    if (pinataConfig.provider === 'pinata') {
      console.log('📌 Pinning content to ensure availability...');
      await ipfs.pin(result.cid, { name: 'my-agent-registration' });
      console.log('✅ Content pinned successfully!');
      console.log();
    }

    // ============================================
    // 5. Register Agent with IPFS URI
    // ============================================

    console.log('📝 Registering agent with IPFS URI...');

    // Setup blockchain connection (local Hardhat)
    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'http://127.0.0.1:8545'
    );

    // Use Hardhat's first default account
    const wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      provider
    );

    const adapter = new EthersAdapter(provider, wallet);
    const client = new ERC8004Client({
      adapter,
      addresses: {
        identityRegistry: IDENTITY_REGISTRY,
        reputationRegistry: REPUTATION_REGISTRY,
        validationRegistry: VALIDATION_REGISTRY,
        chainId: 31337,
      },
    });

    // Register agent with IPFS URI
    const registration = await client.identity.registerWithURI(result.uri);
    console.log('✅ Agent registered!');
    console.log('   Agent ID:', registration.agentId);
    console.log('   Transaction:', registration.txHash);
    console.log();

    // ============================================
    // 6. Fetch Agent from Registry & Parse IPFS Data
    // ============================================

    console.log('🔍 Fetching agent from registry...');

    // Get the agent's token URI from the registry
    const agentUri = await client.identity.getTokenURI(registration.agentId);
    console.log('✅ Retrieved agent URI:', agentUri);

    // Fetch and parse the IPFS data
    console.log('📥 Fetching agent data from IPFS...');
    const agentDataFromIPFS = await ipfs.fetchJSON(agentUri);

    console.log('✅ Agent data retrieved and parsed:');
    console.log('   Name:', agentDataFromIPFS.name);
    console.log('   Description:', agentDataFromIPFS.description);
    console.log('   Type:', agentDataFromIPFS.type);
    console.log('   Endpoints:', agentDataFromIPFS.endpoints.length);
    console.log('   Supported Trust:', agentDataFromIPFS.supportedTrust);

    // Validate the structure matches ERC-8004 spec
    if (agentDataFromIPFS.type !== 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1') {
      console.warn('⚠️  Warning: Agent registration type does not match ERC-8004 spec');
    }

    // Example: Access specific endpoints
    const a2aEndpoint = agentDataFromIPFS.endpoints.find((ep: any) => ep.name === 'A2A');
    if (a2aEndpoint) {
      console.log('   A2A Endpoint:', a2aEndpoint.endpoint);
    }
    console.log();

    // ============================================
    // 7. Upload Feedback/Validation Data
    // ============================================

    const feedbackData = {
      task: 'Data analysis task #123',
      performance: {
        accuracy: 0.95,
        latency_ms: 1500,
        completeness: 1.0,
      },
      comments: 'Excellent work, met all requirements',
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Uploading feedback data to IPFS...');
    const feedbackResult = await ipfs.uploadJSON(feedbackData, {
      name: 'feedback-123.json',
    });
    console.log('✅ Feedback uploaded:', feedbackResult.uri);
    console.log();

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================
// Advanced Examples
// ============================================

/**
 * Example: Complete Agent Lifecycle - Upload, Register, Fetch, Verify
 * This shows the full cycle of agent registration and data retrieval
 */
async function completeAgentLifecycle() {
  console.log('\n🔄 Complete Agent Lifecycle Example\n');

  // 1. Create IPFS client
  const ipfs = createIPFSClient({
    provider: 'pinata',
    apiKey: process.env.PINATA_API_KEY!,
    apiSecret: process.env.PINATA_API_SECRET!,
  });

  // 2. Prepare agent metadata
  const agentMetadata = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Advanced Analytics Agent',
    description: 'Specialized in data analysis and insights',
    image: 'https://example.com/analytics-agent.png',
    endpoints: [
      {
        name: 'A2A',
        endpoint: 'https://analytics.example.com/.well-known/agent-card.json',
        version: '0.3.0',
      },
    ],
    registrations: [],
    supportedTrust: ['reputation', 'validation'],
  };

  // 3. Upload to IPFS
  console.log('📤 Step 1: Uploading agent metadata to IPFS...');
  const uploadResult = await ipfs.uploadJSON(agentMetadata, {
    name: 'analytics-agent.json',
  });
  console.log(`   ✅ Uploaded with CID: ${uploadResult.cid}`);

  // 4. Register on blockchain
  console.log('📝 Step 2: Registering agent on blockchain...');
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const wallet = new ethers.Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );
  const adapter = new EthersAdapter(provider, wallet);
  const client = new ERC8004Client({
    adapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 31337,
    },
  });
  const registration = await client.identity.registerWithURI(uploadResult.uri);
  console.log(`   ✅ Registered as Agent ID: ${registration.agentId}`);

  // 5. Fetch from registry (simulating another user discovering the agent)
  console.log('🔍 Step 3: Fetching agent data from registry...');
  const registeredUri = await client.identity.getTokenURI(registration.agentId);
  console.log(`   ✅ Retrieved URI: ${registeredUri}`);

  // 6. Fetch and parse IPFS data
  console.log('📥 Step 4: Fetching agent metadata from IPFS...');
  const retrievedMetadata = await ipfs.fetchJSON(registeredUri);
  console.log(`   ✅ Retrieved agent: ${retrievedMetadata.name}`);

  // 7. Verify integrity
  console.log('🔐 Step 5: Verifying data integrity...');
  const originalJson = JSON.stringify(agentMetadata, null, 2);
  const retrievedJson = JSON.stringify(retrievedMetadata, null, 2);
  const integrityMatch = originalJson === retrievedJson;
  console.log(`   ${integrityMatch ? '✅' : '❌'} Data integrity: ${integrityMatch ? 'VERIFIED' : 'FAILED'}`);

  // 8. Parse and use agent data
  console.log('📊 Step 6: Using agent data...');
  console.log(`   Agent supports: ${retrievedMetadata.supportedTrust.join(', ')}`);
  console.log(`   Endpoints available: ${retrievedMetadata.endpoints.length}`);

  return {
    agentId: registration.agentId,
    cid: uploadResult.cid,
    metadata: retrievedMetadata,
  };
}

/**
 * Example: Discover and interact with an existing agent
 */
async function discoverAgent(agentId: bigint) {
  console.log(`\n🔎 Discovering Agent ID: ${agentId}\n`);

  // Setup clients
  const ipfs = createIPFSClient({
    provider: 'pinata',
    apiKey: process.env.PINATA_API_KEY!,
    apiSecret: process.env.PINATA_API_SECRET!,
  });

  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const wallet = new ethers.Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );
  const adapter = new EthersAdapter(provider, wallet);
  const client = new ERC8004Client({
    adapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 31337,
    },
  });

  // 1. Fetch agent URI from registry
  console.log('📖 Fetching agent from registry...');
  const uri = await client.identity.getTokenURI(agentId);
  console.log(`   Token URI: ${uri}`);

  // 2. Fetch agent data from IPFS
  console.log('📥 Fetching agent data from IPFS...');
  const agentData = await ipfs.fetchJSON(uri);

  // 3. Display agent information
  console.log('\n📋 Agent Information:');
  console.log(`   Name: ${agentData.name}`);
  console.log(`   Description: ${agentData.description}`);
  console.log(`   Type: ${agentData.type}`);

  // 4. Check trust models
  console.log('\n🔒 Trust Models:');
  if (agentData.supportedTrust && agentData.supportedTrust.length > 0) {
    agentData.supportedTrust.forEach((trust: string) => {
      console.log(`   ✓ ${trust}`);
    });
  } else {
    console.log('   ⚠️  No trust models specified');
  }

  // 5. List endpoints
  console.log('\n🔌 Endpoints:');
  if (agentData.endpoints && agentData.endpoints.length > 0) {
    agentData.endpoints.forEach((endpoint: any) => {
      console.log(`   • ${endpoint.name}: ${endpoint.endpoint}`);
      if (endpoint.version) {
        console.log(`     Version: ${endpoint.version}`);
      }
    });
  } else {
    console.log('   ⚠️  No endpoints defined');
  }

  // 6. Check registrations
  console.log('\n📝 Registrations:');
  if (agentData.registrations && agentData.registrations.length > 0) {
    agentData.registrations.forEach((reg: any) => {
      console.log(`   • Agent ID: ${reg.agentId} on ${reg.agentRegistry}`);
    });
  } else {
    console.log('   No cross-chain registrations');
  }

  return agentData;
}

/**
 * Example: Upload a file buffer
 */
async function uploadFileBuffer() {
  const ipfs = createIPFSClient({
    provider: 'pinata',
    apiKey: process.env.PINATA_API_KEY!,
    apiSecret: process.env.PINATA_API_SECRET!,
  });

  // Upload binary data
  const buffer = Buffer.from('Hello, IPFS!', 'utf-8');
  const result = await ipfs.upload(buffer, { name: 'message.txt' });

  console.log('Uploaded buffer:', result.uri);
  return result;
}

/**
 * Example: Upload multiple files and create a manifest
 */
async function uploadWithManifest() {
  const ipfs = createIPFSClient({
    provider: 'nftstorage',
    apiKey: process.env.NFT_STORAGE_KEY!,
  });

  // Upload individual files
  const file1 = await ipfs.uploadJSON({ data: 'File 1' });
  const file2 = await ipfs.uploadJSON({ data: 'File 2' });

  // Create manifest
  const manifest = {
    files: [
      { name: 'file1.json', uri: file1.uri },
      { name: 'file2.json', uri: file2.uri },
    ],
  };

  const manifestResult = await ipfs.uploadJSON(manifest, {
    name: 'manifest.json',
  });

  console.log('Manifest CID:', manifestResult.cid);
  return manifestResult;
}

/**
 * Example: Bulk upload with error handling
 */
async function bulkUpload(dataArray: any[]) {
  const ipfs = createIPFSClient({
    provider: 'web3storage',
    apiKey: process.env.WEB3_STORAGE_KEY!,
  });

  const results = [];

  for (const [index, data] of dataArray.entries()) {
    try {
      const result = await ipfs.uploadJSON(data, {
        name: `data-${index}.json`,
      });
      results.push({ success: true, result });
      console.log(`✅ Uploaded ${index + 1}/${dataArray.length}`);
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`❌ Failed ${index + 1}/${dataArray.length}`);
    }
  }

  return results;
}

// Run the example
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export {
  uploadFileBuffer,
  uploadWithManifest,
  bulkUpload,
  completeAgentLifecycle,
  discoverAgent
};
