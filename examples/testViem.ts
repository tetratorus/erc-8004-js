/**
 * Example script to test ERC-8004 with Viem adapter
 *
 * Prerequisites:
 * 1. Run hardhat node: npx hardhat node
 * 2. Deploy contracts with the ignition script
 *
 * This example demonstrates:
 * - Using the ViemAdapter instead of EthersAdapter
 * - Registering an agent with viem
 * - Requesting and responding to validation
 */

import { ERC8004Client, ViemAdapter } from '../src';
import { createPublicClient, createWalletClient, http } from 'viem';
import { hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Contract addresses from your deployment
const IDENTITY_REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const REPUTATION_REGISTRY = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const VALIDATION_REGISTRY = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

// Hardhat default test accounts
const AGENT_OWNER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const VALIDATOR_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

async function main() {
  console.log('🚀 ERC-8004 Viem Adapter Test\n');

  // Create viem clients
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http('http://127.0.0.1:8545'),
  });

  // Create accounts from private keys
  const agentOwnerAccount = privateKeyToAccount(AGENT_OWNER_KEY as `0x${string}`);
  const validatorAccount = privateKeyToAccount(VALIDATOR_KEY as `0x${string}`);

  console.log(`Agent Owner: ${agentOwnerAccount.address}`);
  console.log(`Validator: ${validatorAccount.address}\n`);

  // Create wallet clients for each account
  const agentWalletClient = createWalletClient({
    account: agentOwnerAccount,
    chain: hardhat,
    transport: http('http://127.0.0.1:8545'),
  });

  const validatorWalletClient = createWalletClient({
    account: validatorAccount,
    chain: hardhat,
    transport: http('http://127.0.0.1:8545'),
  });

  // Create SDK instances with ViemAdapter
  const agentAdapter = new ViemAdapter(publicClient, agentWalletClient, agentOwnerAccount);
  const agentSDK = new ERC8004Client({
    adapter: agentAdapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 31337,
    },
  });

  const validatorAdapter = new ViemAdapter(publicClient, validatorWalletClient, validatorAccount);
  const validatorSDK = new ERC8004Client({
    adapter: validatorAdapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 31337,
    },
  });

  // Step 1: Register an agent
  console.log('📋 Step 1: Registering an agent with Viem...');
  const registerResult = await agentSDK.identity.registerWithURI(
    'https://example.com/viem-agent.json'
  );
  const agentId = BigInt(registerResult.agentId);
  console.log(`✅ Agent registered with ID: ${agentId}`);
  console.log(`   TX Hash: ${registerResult.txHash}\n`);

  // Step 2: Create and submit feedback with feedbackAuth
  console.log('📋 Step 2: Creating feedbackAuth for feedback...');

  // Get chain ID
  const chainId = await agentSDK.getChainId();

  // Get last feedback index
  const lastIndex = await agentSDK.reputation.getLastIndex(agentId, validatorAccount.address);
  console.log(`   Last feedback index: ${lastIndex}`);

  // Create feedbackAuth - agent owner authorizes validator to give feedback
  const feedbackAuth = agentSDK.reputation.createFeedbackAuth(
    agentId,
    validatorAccount.address,
    lastIndex + BigInt(1),
    BigInt(Math.floor(Date.now() / 1000) + 3600), // Valid for 1 hour
    BigInt(chainId),
    agentOwnerAccount.address
  );

  // Sign the feedbackAuth
  const signedAuth = await agentSDK.reputation.signFeedbackAuth(feedbackAuth);
  console.log(`✅ FeedbackAuth created and signed\n`);

  // Step 3: Validator submits feedback
  console.log('📋 Step 3: Submitting feedback with Viem...');
  const feedbackResult = await validatorSDK.reputation.giveFeedback({
    agentId,
    score: 95,
    tag1: 'excellent-service',
    tag2: 'viem-test',
    feedbackUri: 'ipfs://QmViemFeedback123',
    feedbackAuth: signedAuth,
  });
  console.log(`✅ Feedback submitted`);
  console.log(`   Score: 95 / 100`);
  console.log(`   TX Hash: ${feedbackResult.txHash}\n`);

  // Step 4: Get reputation summary
  console.log('📋 Step 4: Getting reputation summary...');
  const summary = await agentSDK.reputation.getSummary(agentId);
  console.log(`✅ Reputation summary:`);
  console.log(`   Average Score: ${summary.averageScore} / 100`);
  console.log(`   Total Feedback: ${summary.count}\n`);

  // Step 5: Request validation
  console.log('📋 Step 5: Requesting validation...');
  const requestUri = 'ipfs://QmViemValidation123';
  const requestHash = '0x' + Buffer.from('viem-test-' + Date.now()).toString('hex').padEnd(64, '0');

  const validationRequest = await agentSDK.validation.validationRequest({
    validatorAddress: validatorAccount.address,
    agentId,
    requestUri,
    requestHash: requestHash as `0x${string}`,
  });
  console.log(`✅ Validation requested`);
  console.log(`   Validator: ${validatorAccount.address}`);
  console.log(`   Request Hash: ${validationRequest.requestHash}`);
  console.log(`   TX Hash: ${validationRequest.txHash}\n`);

  // Step 6: Validator responds
  console.log('📋 Step 6: Validator providing response...');
  const responseResult = await validatorSDK.validation.validationResponse({
    requestHash: requestHash as `0x${string}`,
    response: 100,
    responseUri: 'ipfs://QmViemResponse123',
    tag: 'viem-adapter-test',
  });
  console.log(`✅ Validation response provided`);
  console.log(`   Response: 100 (passed)`);
  console.log(`   TX Hash: ${responseResult.txHash}\n`);

  // Step 7: Read validation status
  console.log('📋 Step 7: Reading validation status...');
  const status = await agentSDK.validation.getValidationStatus(requestHash as `0x${string}`);
  console.log(`✅ Validation status:`);
  console.log(`   Validator: ${status.validatorAddress}`);
  console.log(`   Agent ID: ${status.agentId}`);
  console.log(`   Response: ${status.response} / 100`);
  console.log(`   Tag: ${status.tag}\n`);

  console.log('🎉 Viem adapter test completed successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
