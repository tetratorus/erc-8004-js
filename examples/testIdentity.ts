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

// Contract addresses from your deployment (vanity addresses via CREATE2)
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const VALIDATION_REGISTRY = '0x8004Cb1BF31DAf7788923b405b754f57acEB4272';

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
  if (!signerAddress) {
    console.error('No signer address found');
    return;
  }
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
    await client.identity.setAgentURI(result1.agentId, newURI);
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
      { key: 'paymentWallet', value: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7' }
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

  // Test 5: Verify agentWallet auto-set on mint
  console.log('Test 5: Verify agentWallet auto-set on mint');
  try {
    const result5 = await client.identity.register();
    console.log(`✅ Registered agent ID: ${result5.agentId}`);

    const agentWallet = await client.identity.getAgentWallet(result5.agentId);
    if (agentWallet.toLowerCase() === signerAddress.toLowerCase()) {
      console.log(`✅ AgentWallet automatically set to owner: ${agentWallet}\n`);
    } else {
      console.log(`❌ AgentWallet NOT auto-set. Expected: ${signerAddress}, Got: ${agentWallet}\n`);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 6: Transfer agent and verify agentWallet clears
  console.log('Test 6: Transfer agent, verify agentWallet clears');
  try {
    const result6 = await client.identity.register();
    console.log(`✅ Registered agent ID: ${result6.agentId}`);

    const walletBefore = await client.identity.getAgentWallet(result6.agentId);
    console.log(`   AgentWallet before transfer: ${walletBefore}`);

    // Get second signer for transfer
    const signer2 = await provider.getSigner(1);
    const signer2Address = await signer2.getAddress();

    // Transfer to second account
    await client.identity.transferFrom(signerAddress, signer2Address, result6.agentId);
    console.log(`   Transferred to: ${signer2Address}`);

    // Verify agentWallet is cleared
    const walletAfter = await client.identity.getAgentWallet(result6.agentId);
    if (walletAfter === '0x0000000000000000000000000000000000000000') {
      console.log(`✅ AgentWallet correctly cleared on transfer: ${walletAfter}\n`);
    } else {
      console.log(`❌ AgentWallet NOT cleared. Got: ${walletAfter}\n`);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 7: Set agentWallet with EIP-712 signature
  console.log('Test 7: Set agentWallet with EIP-712 signature');
  try {
    const result7 = await client.identity.register();
    console.log(`✅ Registered agent ID: ${result7.agentId}`);

    // Get second signer
    const signer2 = await provider.getSigner(1);
    const signer2Address = await signer2.getAddress();

    // Transfer to signer2 (clears agentWallet)
    await client.identity.transferFrom(signerAddress, signer2Address, result7.agentId);
    console.log(`   Transferred to: ${signer2Address}`);

    // Create client for signer2
    const adapter2 = new EthersAdapter(provider, signer2);
    const client2 = new ERC8004Client({
      adapter: adapter2,
      addresses: {
        identityRegistry: IDENTITY_REGISTRY,
        reputationRegistry: REPUTATION_REGISTRY,
        validationRegistry: VALIDATION_REGISTRY,
        chainId: 31337,
      },
    });

    // Get block timestamp for deadline
    const block = await provider.getBlock('latest');
    const deadline = BigInt(block!.timestamp + 240);

    // EIP-712 signing
    const chainId = 31337;
    const domain = {
      name: 'ERC8004IdentityRegistry',
      version: '1',
      chainId,
      verifyingContract: IDENTITY_REGISTRY,
    };
    const types = {
      AgentWalletSet: [
        { name: 'agentId', type: 'uint256' },
        { name: 'newWallet', type: 'address' },
        { name: 'owner', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
    };
    const message = {
      agentId: result7.agentId,
      newWallet: signer2Address,
      owner: signer2Address,
      deadline,
    };

    // newWallet (signer2) signs to prove they control the wallet
    const signature = await signer2.signTypedData(domain, types, message);

    // Set agentWallet
    await client2.identity.setAgentWallet(result7.agentId, signer2Address, deadline, signature);

    // Verify
    const walletAfterSet = await client2.identity.getAgentWallet(result7.agentId);
    if (walletAfterSet.toLowerCase() === signer2Address.toLowerCase()) {
      console.log(`✅ AgentWallet set via EIP-712: ${walletAfterSet}\n`);
    } else {
      console.log(`❌ AgentWallet NOT set. Expected: ${signer2Address}, Got: ${walletAfterSet}\n`);
    }
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
