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
import dotenv from 'dotenv';
dotenv.config();
import { ERC8004Client, EthersAdapter } from '../src';
import { ethers } from 'ethers';

// Contract addresses from your deployment (vanity addresses via CREATE2 - deterministic across chains)
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const VALIDATION_REGISTRY = '0x8004Cb1BF31DAf7788923b405b754f57acEB4272';

/**
 * Generate a random CIDv0 (Qm...) for testing purposes
 * CIDv0 format: base58(0x12 + 0x20 + 32 random bytes)
 */
function generateRandomCIDv0(): string {
  // Base58 alphabet
  const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  // Create random 32 bytes
  const randomBytes = ethers.randomBytes(32);

  // Build CIDv0 structure: [0x12 (sha256), 0x20 (32 bytes), ...random bytes...]
  const cidBytes = new Uint8Array(34);
  cidBytes[0] = 0x12; // sha256
  cidBytes[1] = 0x20; // 32 bytes length
  cidBytes.set(randomBytes, 2);

  // Encode to base58
  const bytes = Array.from(cidBytes);
  let num = BigInt('0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join(''));

  let encoded = '';
  while (num > 0n) {
    const remainder = Number(num % 58n);
    encoded = BASE58_ALPHABET[remainder] + encoded;
    num = num / 58n;
  }

  // Handle leading zeros
  for (let i = 0; i < cidBytes.length && cidBytes[i] === 0; i++) {
    encoded = '1' + encoded;
  }

  return encoded;
}

async function main() {
  console.log('🚀 ERC-8004 SDK Test\n');

  // Connect to Sepolia
  console.log('Connecting to Sepolia');
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || '');
  const SEPOLIA_TESTNET_PRIVATE_KEY_1 = process.env.SEPOLIA_TESTNET_PRIVATE_KEY_1 || '';
  const SEPOLIA_TESTNET_PRIVATE_KEY_2 = process.env.SEPOLIA_TESTNET_PRIVATE_KEY_2 || '';
  const agentOwner = new ethers.Wallet(SEPOLIA_TESTNET_PRIVATE_KEY_1, provider);
  const feedbackGiver = new ethers.Wallet(SEPOLIA_TESTNET_PRIVATE_KEY_2, provider);

  // Create adapter for agent owner
  const agentAdapter = new EthersAdapter(provider, agentOwner);

  // Initialize SDK with adapter for agent owner
  const agentClient = new ERC8004Client({
    adapter: agentAdapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 11155111, // Sepolia chain ID
    },
  });

  // Create SDK instance for feedback giver
  const feedbackAdapter = new EthersAdapter(provider, feedbackGiver);
  const feedbackClient = new ERC8004Client({
    adapter: feedbackAdapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 11155111, // Sepolia chain ID
    },
  });

  const agentOwnerAddress = agentOwner.address;
  const feedbackGiverAddress = feedbackGiver.address;
  console.log(`Agent Owner: ${agentOwnerAddress}`);
  console.log(`Feedback Giver: ${feedbackGiverAddress}\n`);

  // Register a single agent that will be used for all tests
  console.log('Registering agent with URI and metadata...');
  let agentId: bigint;
  try {
    const registrationURI = `ipfs://${generateRandomCIDv0()}`;
    const metadata = [
      { key: 'agentName', value: 'TestAgent' },
      { key: 'paymentWallet', value: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7' }
    ];

    const result = await agentClient.identity.registerWithMetadata(
      registrationURI,
      metadata
    );
    agentId = result.agentId;
    console.log(`✅ Registered agent ID: ${agentId}`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result.txHash}`);
    console.log(`   Owner: ${await agentClient.identity.getOwner(agentId)}`);
    console.log(`   URI: ${await agentClient.identity.getTokenURI(agentId)}`);

    // Read back metadata
    const agentName = await agentClient.identity.getMetadata(agentId, 'agentName');
    const paymentWallet = await agentClient.identity.getMetadata(agentId, 'paymentWallet');
    console.log(`   Metadata - agentName: ${agentName}`);
    console.log(`   Metadata - paymentWallet: ${paymentWallet}`);

    // Verify agentWallet is automatically set to owner on mint
    const agentWallet = await agentClient.identity.getAgentWallet(agentId);
    if (agentWallet.toLowerCase() === agentOwnerAddress.toLowerCase()) {
      console.log(`✅ AgentWallet automatically set to owner on mint: ${agentWallet}\n`);
    } else {
      console.log(`❌ AgentWallet NOT set on mint. Expected: ${agentOwnerAddress}, Got: ${agentWallet}\n`);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
    return;
  }

  // Test 1: Set metadata after registration
  console.log('Test 1: Set metadata after registration');
  try {
    const setMetadataResult = await agentClient.identity.setMetadata(agentId, 'status', 'active');
    const status = await agentClient.identity.getMetadata(agentId, 'status');
    console.log(`   Set metadata - status: ${status}`);
    console.log(`   TX Hash: ${setMetadataResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${setMetadataResult.txHash}\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 1.5: Verify agentWallet clears on transfer
  console.log('Test 1.5: Transfer agent, verify agentWallet clears');
  try {
    // AgentWallet was already set to owner on mint (verified above)
    const walletBefore = await agentClient.identity.getAgentWallet(agentId);
    console.log(`   AgentWallet before transfer: ${walletBefore}`);

    // Transfer agent to feedbackGiver
    const transferResult = await agentClient.identity.transferFrom(
      agentOwnerAddress,
      feedbackGiverAddress,
      agentId
    );
    console.log(`✅ Agent transferred to: ${feedbackGiverAddress}`);
    console.log(`   TX Hash: ${transferResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${transferResult.txHash}`);

    // Verify agentWallet is cleared (should be zero address)
    const walletAfter = await feedbackClient.identity.getAgentWallet(agentId);
    console.log(`   AgentWallet after transfer: ${walletAfter}`);
    if (walletAfter === '0x0000000000000000000000000000000000000000') {
      console.log(`✅ AgentWallet correctly cleared on transfer!\n`);
    } else {
      console.log(`❌ AgentWallet was NOT cleared on transfer!\n`);
    }

    // Transfer back to original owner for remaining tests
    const transferBackResult = await feedbackClient.identity.transferFrom(
      feedbackGiverAddress,
      agentOwnerAddress,
      agentId
    );
    console.log(`   Transferred agent back to original owner for remaining tests`);
    console.log(`   TX Hash: ${transferBackResult.txHash}`);

    // Verify agentWallet is cleared after transfer back too
    const walletAfterTransferBack = await agentClient.identity.getAgentWallet(agentId);
    console.log(`   AgentWallet after transfer back: ${walletAfterTransferBack}\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 1.6: Set agentWallet with EIP-712 signature
  console.log('Test 1.6: Set agentWallet with EIP-712 signature');
  try {
    // Get current block timestamp for deadline (within 5 minutes)
    const block = await provider.getBlock('latest');
    const deadline = BigInt(block!.timestamp + 240); // 4 minutes from now

    // EIP-712 domain and types for signing
    const chainId = Number((await provider.getNetwork()).chainId);
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
      agentId,
      newWallet: agentOwnerAddress,
      owner: agentOwnerAddress,
      deadline,
    };

    // newWallet signs to prove they control the wallet
    const signature = await agentOwner.signTypedData(domain, types, message);

    // Owner sets their own address as the agentWallet
    const setWalletResult = await agentClient.identity.setAgentWallet(
      agentId,
      agentOwnerAddress,
      deadline,
      signature
    );
    console.log(`✅ AgentWallet set via EIP-712 signature`);
    console.log(`   TX Hash: ${setWalletResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${setWalletResult.txHash}`);

    // Verify agentWallet is set
    const walletAfterSet = await agentClient.identity.getAgentWallet(agentId);
    if (walletAfterSet.toLowerCase() === agentOwnerAddress.toLowerCase()) {
      console.log(`✅ AgentWallet correctly set to: ${walletAfterSet}\n`);
    } else {
      console.log(`❌ AgentWallet NOT set correctly. Expected: ${agentOwnerAddress}, Got: ${walletAfterSet}\n`);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 2: Submit feedback (no auth required)
  console.log('Test 2: Submit feedback');
  try {
    // Feedback giver submits feedback
    const feedbackResult = await feedbackClient.reputation.giveFeedback({
      agentId,
      score: 95,
      tag1: 'excellent',
      tag2: 'reliable',
    });
    console.log(`✅ Feedback submitted!`);
    console.log(`   Score: 95 / 100`);
    console.log(`   Tags: excellent, reliable`);
    console.log(`   TX Hash: ${feedbackResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${feedbackResult.txHash}`);

    // Read the feedback back
    // Note: Feedback indices are 1-based in the smart contract
    const feedback = await feedbackClient.reputation.readFeedback(
      agentId,
      feedbackGiverAddress,
      BigInt(1) // First feedback is at index 1
    );
    console.log(`✅ Feedback retrieved:`);
    console.log(`   Score: ${feedback.score} / 100`);
    console.log(`   Tag1: ${feedback.tag1}`);
    console.log(`   Tag2: ${feedback.tag2}`);

    // Get reputation summary
    const summary = await agentClient.reputation.getSummary(agentId);
    console.log(`✅ Reputation summary:`);
    console.log(`   Feedback Count: ${summary.count}`);
    console.log(`   Average Score: ${summary.averageScore} / 100\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 3: Validation workflow
  console.log('Test 3: Validation workflow');
  try {
    // Generate a random IPFS CID for the validation request
    const validationCid = generateRandomCIDv0();
    const requestURI = `ipfs://${validationCid}`;

    // Import ipfsUriToBytes32 dynamically
    const { ipfsUriToBytes32 } = await import('../src');
    const requestHash = ipfsUriToBytes32(requestURI);

    // Request validation from feedback giver (acting as validator)
    const requestResult = await agentClient.validation.validationRequest({
      validatorAddress: feedbackGiverAddress,
      agentId: agentId,
      requestURI,
      requestHash,
    });
    console.log(`✅ Validation requested`);
    console.log(`   Validator: ${feedbackGiverAddress}`);
    console.log(`   Request URI: ${requestURI}`);
    console.log(`   Request Hash: ${requestResult.requestHash}`);
    console.log(`   TX Hash: ${requestResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${requestResult.txHash}`);

    // Wait for 1 block confirmation
    console.log(`   Waiting for 1 block confirmation...`);
    const requestTxReceipt = await provider.getTransactionReceipt(requestResult.txHash);
    if (requestTxReceipt) {
      const requestBlockNumber = requestTxReceipt.blockNumber;
      let currentBlock = await provider.getBlockNumber();
      while (currentBlock < requestBlockNumber + 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        currentBlock = await provider.getBlockNumber();
      }
      console.log(`   ✅ Block confirmation received (block ${currentBlock})`);
    }

    // Validator (feedback giver) provides response
    const responseURI = `ipfs://${generateRandomCIDv0()}`;
    const responseResult = await feedbackClient.validation.validationResponse({
      requestHash,
      response: 100, // 100 = passed
      responseURI,
      tag: 'zkML-proof',
    });
    console.log(`✅ Validation response provided`);
    console.log(`   Response: 100 (passed)`);
    console.log(`   Tag: zkML-proof`);
    console.log(`   Response URI: ${responseURI}`);
    console.log(`   TX Hash: ${responseResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${responseResult.txHash}`);

    // Read validation status
    const status = await agentClient.validation.getValidationStatus(requestHash);
    console.log(`✅ Validation status retrieved:`);
    console.log(`   Validator: ${status.validatorAddress}`);
    console.log(`   Agent ID: ${status.agentId}`);
    console.log(`   Response: ${status.response} / 100`);
    console.log(`   Tag: ${status.tag}`);
    console.log(`   Last Update: ${new Date(Number(status.lastUpdate) * 1000).toISOString()}`);

    // Get validation summary for agent
    const validationSummary = await agentClient.validation.getSummary(agentId, [feedbackGiverAddress]);
    console.log(`✅ Validation summary:`);
    console.log(`   Validation Count: ${validationSummary.count}`);
    console.log(`   Average Response: ${validationSummary.avgResponse} / 100`);

    // Get all validation requests for agent
    const agentValidations = await agentClient.validation.getAgentValidations(agentId);
    console.log(`✅ Agent validations retrieved:`);
    console.log(`   Total validations: ${agentValidations.length}`);
    for (let i = 0; i < agentValidations.length; i++) {
      console.log(`   [${i}] Request Hash: ${agentValidations[i]}`);
    }

    // Get all requests handled by validator
    const validatorRequests = await feedbackClient.validation.getValidatorRequests(feedbackGiverAddress);
    console.log(`✅ Validator requests retrieved:`);
    console.log(`   Total requests: ${validatorRequests.length}`);
    for (let i = 0; i < validatorRequests.length; i++) {
      console.log(`   [${i}] Request Hash: ${validatorRequests[i]}`);
    }
    console.log();
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
