/**
 * Example script to test ERC-8004 Reputation/Feedback functionality
 *
 * Prerequisites:
 * 1. Run hardhat node: npx hardhat node
 * 2. Deploy contracts with the ignition script
 *
 * This example demonstrates:
 * - Registering an agent
 * - Creating and signing feedbackAuth
 * - Submitting feedback
 * - Reading feedback and reputation summaries
 */

import { ERC8004Client, EthersAdapter } from '../src';
import { ethers } from 'ethers';

// Contract addresses from your deployment
const IDENTITY_REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const REPUTATION_REGISTRY = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const VALIDATION_REGISTRY = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

async function main() {
  console.log('🚀 ERC-8004 Reputation/Feedback Test\n');

  // Connect to local Hardhat
  console.log('Connecting to local Hardhat...');
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  // Use first account as agent owner
  const agentOwner = await provider.getSigner(0);
  // Use second account as client (feedback giver)
  const client = await provider.getSigner(1);

  const agentOwnerAddress = await agentOwner.getAddress();
  const clientAddress = await client.getAddress();

  console.log(`Agent Owner: ${agentOwnerAddress}`);
  console.log(`Client: ${clientAddress}\n`);

  // Create SDK instance for agent owner
  const agentAdapter = new EthersAdapter(provider, agentOwner);
  const agentSDK = new ERC8004Client({
    adapter: agentAdapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 31337,
    },
  });

  // Create SDK instance for client
  const clientAdapter = new EthersAdapter(provider, client);
  const clientSDK = new ERC8004Client({
    adapter: clientAdapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: 31337,
    },
  });

  // Step 1: Register an agent
  console.log('📋 Step 1: Registering an agent...');
  const registerResult = await agentSDK.identity.registerWithURI(
    'https://example.com/agent.json'
  );
  const agentId = registerResult.agentId;
  console.log(`✅ Agent registered with ID: ${agentId}`);
  console.log(`   TX Hash: ${registerResult.txHash}\n`);

  // Step 2: Get chain ID and create feedbackAuth
  console.log('📋 Step 2: Creating feedbackAuth...');
  const chainId = await agentSDK.getChainId();

  // Get the last feedback index for this client
  // For a new client, this should return 0. Since feedback indices are 1-indexed,
  // the first feedback will be at index 1
  let lastIndex: bigint;
  lastIndex = await agentSDK.reputation.getLastIndex(agentId, clientAddress);

  console.log(`   Last feedback index: ${lastIndex}`);

  // Create feedbackAuth
  // Agent owner authorizes the client to give feedback
  // Since indices are 1-indexed, first feedback is index 1
  const feedbackAuth = agentSDK.reputation.createFeedbackAuth(
    agentId,
    clientAddress,
    lastIndex + BigInt(1), // Allow next feedback (1 for first feedback, 2 for second, etc.)
    BigInt(Math.floor(Date.now() / 1000) + 3600), // Valid for 1 hour
    BigInt(chainId),
    agentOwnerAddress // Signer is the agent owner
  );
  console.log(`✅ FeedbackAuth created`);
  console.log(`   indexLimit: ${feedbackAuth.indexLimit}`);
  console.log(`   expiry: ${feedbackAuth.expiry}\n`);

  // Step 3: Agent owner signs the feedbackAuth
  console.log('📋 Step 3: Signing feedbackAuth...');
  const signedAuth = await agentSDK.reputation.signFeedbackAuth(feedbackAuth);
  console.log(`✅ FeedbackAuth signed`);
  console.log(`   Signature length: ${signedAuth.length}`);
  console.log(`   Signature: ${signedAuth.slice(0, 20)}...\n`);
  console.log(`   FeedbackAuth details:`);
  console.log(`   - agentId: ${feedbackAuth.agentId}`);
  console.log(`   - clientAddress: ${feedbackAuth.clientAddress}`);
  console.log(`   - indexLimit: ${feedbackAuth.indexLimit}`);
  console.log(`   - expiry: ${feedbackAuth.expiry}`);
  console.log(`   - chainId: ${feedbackAuth.chainId}`);
  console.log(`   - identityRegistry: ${feedbackAuth.identityRegistry}`);
  console.log(`   - signerAddress: ${feedbackAuth.signerAddress}\n`);

  // Step 4: Client submits feedback
  console.log('📋 Step 4: Client submitting feedback...');
  const feedbackResult = await clientSDK.reputation.giveFeedback({
    agentId,
    score: 95,
    tag1: 'excellent',
    tag2: 'fast',
    feedbackAuth: signedAuth,
  });
  console.log(`✅ Feedback submitted!`);
  console.log(`   Score: 95 / 100`);
  console.log(`   Tags: excellent, fast`);
  console.log(`   TX Hash: ${feedbackResult.txHash}\n`);

  // Step 5: Read the feedback back
  console.log('📋 Step 5: Reading feedback...');
  // Read the feedback we just submitted (at index 1 for first feedback)
  const feedback = await clientSDK.reputation.readFeedback(
    agentId,
    clientAddress,
    BigInt(1) // First feedback is at index 1 (1-indexed)
  );
  console.log(`✅ Feedback retrieved:`);
  console.log(`   Score: ${feedback.score} / 100`);
  console.log(`   Tag1: ${feedback.tag1}`);
  console.log(`   Tag2: ${feedback.tag2}`);
  console.log(`   Revoked: ${feedback.isRevoked}\n`);

  // Step 6: Get reputation summary
  console.log('📋 Step 6: Getting reputation summary...');
  const summary = await clientSDK.reputation.getSummary(agentId, [clientAddress]);
  console.log(`✅ Reputation summary:`);
  console.log(`   Feedback Count: ${summary.count}`);
  console.log(`   Average Score: ${summary.averageScore} / 100\n`);

  // Step 7: Get all clients who gave feedback
  console.log('📋 Step 7: Getting all clients...');
  const clients = await clientSDK.reputation.getClients(agentId);
  console.log(`✅ Clients who gave feedback: ${clients.length}`);
  console.log(`   ${clients.join(', ')}\n`);

  // Step 8: Submit another feedback with higher score
  console.log('📋 Step 8: Submitting second feedback...');
  const newLastIndex = await agentSDK.reputation.getLastIndex(agentId, clientAddress);
  const feedbackAuth2 = agentSDK.reputation.createFeedbackAuth(
    agentId,
    clientAddress,
    newLastIndex + BigInt(1),
    BigInt(Math.floor(Date.now() / 1000) + 3600),
    BigInt(chainId),
    agentOwnerAddress
  );
  const signedAuth2 = await agentSDK.reputation.signFeedbackAuth(feedbackAuth2);

  await clientSDK.reputation.giveFeedback({
    agentId,
    score: 98,
    feedbackAuth: signedAuth2,
  });
  console.log(`✅ Second feedback submitted (score: 98)\n`);

  // Step 9: Get updated summary
  console.log('📋 Step 9: Getting updated reputation summary...');
  const updatedSummary = await clientSDK.reputation.getSummary(agentId);
  console.log(`✅ Updated reputation summary:`);
  console.log(`   Feedback Count: ${updatedSummary.count}`);
  console.log(`   Average Score: ${updatedSummary.averageScore} / 100\n`);

  // Step 10: Read all feedback
  console.log('📋 Step 10: Reading all feedback...');
  const allFeedback = await clientSDK.reputation.readAllFeedback(agentId);
  console.log(`✅ All feedback retrieved:`);
  console.log(`   Total: ${allFeedback.scores.length} feedback entries`);
  for (let i = 0; i < allFeedback.scores.length; i++) {
    console.log(`   [${i}] Client: ${allFeedback.clientAddresses[i].slice(0, 10)}... Score: ${allFeedback.scores[i]}`);
  }

  // Step 11: Revoke the first feedback
  console.log('\n📋 Step 11: Revoking first feedback...');
  const revokeResult = await clientSDK.reputation.revokeFeedback(
    agentId,
    BigInt(1) // Revoke the first feedback at index 1
  );
  console.log(`✅ Feedback revoked!`);
  console.log(`   TX Hash: ${revokeResult.txHash}\n`);

  // Step 12: Verify feedback is revoked
  console.log('📋 Step 12: Verifying feedback revocation...');
  const revokedFeedback = await clientSDK.reputation.readFeedback(
    agentId,
    clientAddress,
    BigInt(1)
  );
  console.log(`✅ Feedback status:`);
  console.log(`   Score: ${revokedFeedback.score} / 100`);
  console.log(`   Revoked: ${revokedFeedback.isRevoked}`);
  if (revokedFeedback.isRevoked) {
    console.log(`   ✓ Feedback successfully marked as revoked\n`);
  } else {
    console.log(`   ✗ WARNING: Feedback should be revoked but isRevoked is false\n`);
  }

  // Step 13: Check updated summary (revoked feedback should not count)
  console.log('📋 Step 13: Getting summary after revocation...');
  const summaryAfterRevoke = await clientSDK.reputation.getSummary(agentId);
  console.log(`✅ Reputation summary after revocation:`);
  console.log(`   Feedback Count: ${summaryAfterRevoke.count}`);
  console.log(`   Average Score: ${summaryAfterRevoke.averageScore} / 100`);
  console.log(`   (Should only count the non-revoked feedback)\n`);

  // Step 14: Read all feedback including revoked
  console.log('📋 Step 14: Reading all feedback including revoked...');
  const allFeedbackWithRevoked = await clientSDK.reputation.readAllFeedback(
    agentId,
    undefined,
    undefined,
    undefined,
    true // includeRevoked = true
  );
  console.log(`✅ All feedback (including revoked):`);
  console.log(`   Total: ${allFeedbackWithRevoked.scores.length} feedback entries`);
  for (let i = 0; i < allFeedbackWithRevoked.scores.length; i++) {
    const revokedStatus = allFeedbackWithRevoked.revokedStatuses[i] ? '[REVOKED]' : '';
    console.log(`   [${i}] Score: ${allFeedbackWithRevoked.scores[i]} ${revokedStatus}`);
  }

  console.log('\n🎉 All tests completed successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
