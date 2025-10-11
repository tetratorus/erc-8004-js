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

// Contract addresses from your deployment
const IDENTITY_REGISTRY = '0x7177a6867296406881E20d6647232314736Dd09A';
const REPUTATION_REGISTRY = '0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322';
const VALIDATION_REGISTRY = '0x662b40A526cb4017d947e71eAF6753BF3eeE66d8';

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
  const client = new ERC8004Client({
    adapter: agentAdapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 31337, // Hardhat chain ID
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
      chainId: 31337,
    },
  });

  const agentOwnerAddress = agentOwner.address;
  const feedbackGiverAddress = feedbackGiver.address;
  console.log(`Agent Owner: ${agentOwnerAddress}`);
  console.log(`Feedback Giver: ${feedbackGiverAddress}\n`);

  // Test 1: Register agent with URI and metadata
  console.log('Test 1: Register agent with URI and on-chain metadata');
  try {
    const registrationURI = `ipfs://${generateRandomCIDv0()}`;
    const metadata = [
      { key: 'agentName', value: 'TestAgent' },
      { key: 'agentWallet', value: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7' }
    ];

    const result1 = await client.identity.registerWithMetadata(
      registrationURI,
      metadata
    );
    console.log(`✅ Registered agent ID: ${result1.agentId}`);
    console.log(`   TX Hash: ${result1.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result1.txHash}`);
    console.log(`   Owner: ${await client.identity.getOwner(result1.agentId)}`);
    console.log(`   URI: ${await client.identity.getTokenURI(result1.agentId)}`);

    // Read back metadata
    const agentName = await client.identity.getMetadata(result1.agentId, 'agentName');
    const agentWallet = await client.identity.getMetadata(result1.agentId, 'agentWallet');
    console.log(`   Metadata - agentName: ${agentName}`);
    console.log(`   Metadata - agentWallet: ${agentWallet}\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 2: Set metadata after registration
  console.log('Test 2: Set metadata after registration');
  try {
    const result2 = await client.identity.register();
    console.log(`✅ Registered agent ID: ${result2.agentId}`);
    console.log(`   TX Hash: ${result2.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result2.txHash}`);

    const setMetadataResult = await client.identity.setMetadata(result2.agentId, 'status', 'active');
    const status = await client.identity.getMetadata(result2.agentId, 'status');
    console.log(`   Set metadata - status: ${status}`);
    console.log(`   TX Hash: ${setMetadataResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${setMetadataResult.txHash}\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 3: Create feedbackAuth and submit feedback
  console.log('Test 3: Create feedbackAuth and submit feedback');
  try {
    const result3 = await client.identity.register();
    const agentId = result3.agentId;
    console.log(`✅ Registered agent ID: ${agentId}`);
    console.log(`   TX Hash: ${result3.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result3.txHash}`);

    // Get chain ID
    const chainId = await client.getChainId();

    // Get the last feedback index for the feedback giver
    const lastIndex = await client.reputation.getLastIndex(agentId, feedbackGiverAddress);
    console.log(`   Last feedback index: ${lastIndex}`);

    // Create feedbackAuth (agent owner authorizes feedback giver)
    const feedbackAuth = client.reputation.createFeedbackAuth(
      agentId,
      feedbackGiverAddress,
      lastIndex + BigInt(1), // Allow next feedback
      BigInt(Math.floor(Date.now() / 1000) + 3600), // Valid for 1 hour
      BigInt(chainId),
      agentOwnerAddress
    );
    console.log(`✅ FeedbackAuth created (indexLimit: ${feedbackAuth.indexLimit})`);

    // Agent owner signs the feedbackAuth
    const signedAuth = await client.reputation.signFeedbackAuth(feedbackAuth);
    console.log(`✅ FeedbackAuth signed: ${signedAuth.slice(0, 20)}...`);

    // Feedback giver submits feedback
    const feedbackResult = await feedbackClient.reputation.giveFeedback({
      agentId,
      score: 95,
      tag1: 'excellent',
      tag2: 'reliable',
      feedbackAuth: signedAuth,
    });
    console.log(`✅ Feedback submitted!`);
    console.log(`   Score: 95 / 100`);
    console.log(`   Tags: excellent, reliable`);
    console.log(`   TX Hash: ${feedbackResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${feedbackResult.txHash}`);

    // Read the feedback back
    // Note: Feedback indices are 1-based in the smart contract
    // After submitting feedback, lastIndex is incremented to 1
    const feedback = await feedbackClient.reputation.readFeedback(
      agentId,
      feedbackGiverAddress,
      lastIndex + BigInt(1) // Use the new index after submission
    );
    console.log(`✅ Feedback retrieved:`);
    console.log(`   Score: ${feedback.score} / 100`);
    console.log(`   Tag1: ${feedback.tag1}`);
    console.log(`   Tag2: ${feedback.tag2}`);

    // Get reputation summary
    const summary = await client.reputation.getSummary(agentId);
    console.log(`✅ Reputation summary:`);
    console.log(`   Feedback Count: ${summary.count}`);
    console.log(`   Average Score: ${summary.averageScore} / 100\n`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Test 4: Validation workflow
  console.log('Test 4: Validation workflow');
  try {
    // Register a new agent for validation testing
    const result4 = await client.identity.register();
    const validationAgentId = result4.agentId;
    console.log(`✅ Registered agent ID for validation: ${validationAgentId}`);
    console.log(`   TX Hash: ${result4.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result4.txHash}`);

    // Generate a random IPFS CID for the validation request
    const validationCid = generateRandomCIDv0();
    const requestUri = `ipfs://${validationCid}`;

    // Import ipfsUriToBytes32 dynamically
    const { ipfsUriToBytes32 } = await import('../src');
    const requestHash = ipfsUriToBytes32(requestUri);

    // Request validation from feedback giver (acting as validator)
    const requestResult = await client.validation.validationRequest({
      validatorAddress: feedbackGiverAddress,
      agentId: validationAgentId,
      requestUri,
      requestHash,
    });
    console.log(`✅ Validation requested`);
    console.log(`   Validator: ${feedbackGiverAddress}`);
    console.log(`   Request URI: ${requestUri}`);
    console.log(`   Request Hash: ${requestResult.requestHash}`);
    console.log(`   TX Hash: ${requestResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${requestResult.txHash}`);

    // Validator (feedback giver) provides response
    const responseUri = `ipfs://${generateRandomCIDv0()}`;
    const responseResult = await feedbackClient.validation.validationResponse({
      requestHash,
      response: 100, // 100 = passed
      responseUri,
      tag: 'zkML-proof',
    });
    console.log(`✅ Validation response provided`);
    console.log(`   Response: 100 (passed)`);
    console.log(`   Tag: zkML-proof`);
    console.log(`   Response URI: ${responseUri}`);
    console.log(`   TX Hash: ${responseResult.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${responseResult.txHash}`);

    // Read validation status
    const status = await client.validation.getValidationStatus(requestHash);
    console.log(`✅ Validation status retrieved:`);
    console.log(`   Validator: ${status.validatorAddress}`);
    console.log(`   Agent ID: ${status.agentId}`);
    console.log(`   Response: ${status.response} / 100`);
    console.log(`   Tag: ${status.tag}`);
    console.log(`   Last Update: ${new Date(Number(status.lastUpdate) * 1000).toISOString()}`);

    // Get validation summary for agent
    const validationSummary = await client.validation.getSummary(validationAgentId, [feedbackGiverAddress]);
    console.log(`✅ Validation summary:`);
    console.log(`   Validation Count: ${validationSummary.count}`);
    console.log(`   Average Response: ${validationSummary.avgResponse} / 100`);

    // Get all validation requests for agent
    const agentValidations = await client.validation.getAgentValidations(validationAgentId);
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
