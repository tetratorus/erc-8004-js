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
const IDENTITY_REGISTRY = '0x7177a6867296406881E20d6647232314736Dd09A';
const REPUTATION_REGISTRY = '0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322';
const VALIDATION_REGISTRY = '0x662b40A526cb4017d947e71eAF6753BF3eeE66d8';

async function main() {
  console.log('🚀 ERC-8004 SDK Test\n');

  // Connect to Sepolia
  console.log('Connecting to Sepolia');
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/13Abg3EcD65uhCriL7B-H');
  // SEPOLIA TESTNET PRIVATE KEY 1 0xdcfbea7ee0ecf4f5b6b683ec380df3fccd574c36a7e9ec2719aa9319b10d84e2
  // SEPOLIA TESTNET PRIVATE KEY 2 0x6a0a4902c340427ff5f5e74131f5643a7e3435bf89beb813f244b757daa56825
  const signer = new ethers.Wallet('0xdcfbea7ee0ecf4f5b6b683ec380df3fccd574c36a7e9ec2719aa9319b10d84e2', provider);

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

  // Test 1: Register agent with no URI
  console.log('Test 1: Register agent with no URI');
  try {
    const result1 = await client.identity.register();
    console.log(`✅ Registered agent ID: ${result1.agentId}`);
    console.log(`   TX Hash: ${result1.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result1.txHash}`);
    console.log(`   Owner: ${await client.identity.getOwner(result1.agentId)}\n`);
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
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result2.txHash}`);
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
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result3.txHash}`);
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
    console.log(`   TX Hash: ${result4.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result4.txHash}`);

    const setMetadataResult = await client.identity.setMetadata(result4.agentId, 'status', 'active');
    const status = await client.identity.getMetadata(result4.agentId, 'status');
    console.log(`   Set metadata - status: ${status}`);
    console.log(`   TX Hash: ${setMetadataResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${setMetadataResult.txHash}\n`);
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
