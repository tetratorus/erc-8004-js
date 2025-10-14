/**
 * Example script to test ERC-8004 SDK with local Hardhat chain
 *
 * Prerequisites:
 * 1. Run hardhat node: npx hardhat node
 * 2. Deploy contracts with the ignition script
 *
 * This example demonstrates:
 * - Initializing the SDK with adapter pattern
 * - Registering agents
 * - Reading agent information
 * - Updating tokenURI
 */

import { ERC8004Client, EthersAdapter } from '../src';
import { ethers } from 'ethers';

// Contract addresses from your deployment
const IDENTITY_REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const REPUTATION_REGISTRY = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const VALIDATION_REGISTRY = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

async function main() {
  console.log('🚀 ERC-8004 SDK Test\n');

  // Connect to local Hardhat
  console.log('Connecting to local Hardhat...');
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const signer = await provider.getSigner(0); // Use first hardhat account

  // Create adapter
  const adapter = new EthersAdapter(provider, signer);

  // Initialize SDK with adapter
  const client = new ERC8004Client({
    adapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 31337, // Hardhat chain ID
    },
  });

  const signerAddress = await client.getAddress();
  console.log(`Connected with signer: ${signerAddress}\n`);

  // Test 1: Register agent with no URI, then set URI
  console.log('Test 1: Register agent with no URI, then set URI');
  try {
    const result1 = await client.identity.register();
    console.log(`✅ Registered agent ID: ${result1.agentId}`);
    console.log(`   TX Hash: ${result1.txHash}`);
    console.log(`   Owner: ${await client.identity.getOwner(result1.agentId)}`);

    // Set the tokenURI after registration
    const newURI = 'ipfs://QmNewAgent456';
    await client.identity.setAgentUri(result1.agentId, newURI);
    console.log(`✅ Set tokenURI to: ${newURI}`);

    // Verify it was set
    const retrievedURI = await client.identity.getTokenURI(result1.agentId);
    console.log(`   Retrieved URI: ${retrievedURI}\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 2: Register agent with URI
  console.log('Test 2: Register agent with URI');
  try {
    // Example registration file (in production, this would be hosted)
    const registrationURI = 'https://example.com/agent1.json';
    const result2 = await client.identity.registerWithURI(registrationURI);
    console.log(`✅ Registered agent ID: ${result2.agentId}`);
    console.log(`   TX Hash: ${result2.txHash}`);
    console.log(`   Owner: ${await client.identity.getOwner(result2.agentId)}`);
    console.log(`   URI: ${await client.identity.getTokenURI(result2.agentId)}\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 3: Register agent with URI and metadata
  console.log('Test 3: Register agent with URI and on-chain metadata');
  try {
    const registrationURI = 'ipfs://QmExample123';
    const metadata = [
      { key: 'agentName', value: 'TestAgent' },
      { key: 'agentWallet', value: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7' }
    ];

    const result3 = await client.identity.registerWithMetadata(
      registrationURI,
      metadata
    );
    console.log(`✅ Registered agent ID: ${result3.agentId}`);
    console.log(`   TX Hash: ${result3.txHash}`);
    console.log(`   Owner: ${await client.identity.getOwner(result3.agentId)}`);
    console.log(`   URI: ${await client.identity.getTokenURI(result3.agentId)}`);

    // Read back metadata
    const agentName = await client.identity.getMetadata(result3.agentId, 'agentName');
    const agentWallet = await client.identity.getMetadata(result3.agentId, 'agentWallet');
    console.log(`   Metadata - agentName: ${agentName}`);
    console.log(`   Metadata - agentWallet: ${agentWallet}\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 4: Set metadata after registration
  console.log('Test 4: Set metadata after registration');
  try {
    const result4 = await client.identity.register();
    console.log(`✅ Registered agent ID: ${result4.agentId}`);

    await client.identity.setMetadata(result4.agentId, 'status', 'active');
    const status = await client.identity.getMetadata(result4.agentId, 'status');
    console.log(`   Set metadata - status: ${status}\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  console.log('✨ All tests completed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
