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

// Contract addresses from your deployment (vanity addresses via CREATE2)
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const VALIDATION_REGISTRY = '0x8004Cb1BF31DAf7788923b405b754f57acEB4272';

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

  // Step 2: Client submits feedback (no auth required)
  console.log('📋 Step 2: Client submitting feedback...');
  const feedbackResult = await clientSDK.reputation.giveFeedback({
    agentId,
    score: 95,
    tag1: 'excellent',
    tag2: 'fast',
  });
  console.log(`✅ Feedback submitted!`);
  console.log(`   Score: 95 / 100`);
  console.log(`   Tags: excellent, fast`);
  console.log(`   TX Hash: ${feedbackResult.txHash}\n`);

  // Step 3: Read the feedback back
  console.log('📋 Step 3: Reading feedback...');
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

  // Step 4: Get reputation summary
  console.log('📋 Step 4: Getting reputation summary...');
  const summary = await clientSDK.reputation.getSummary(agentId, [clientAddress]);
  console.log(`✅ Reputation summary:`);
  console.log(`   Feedback Count: ${summary.count}`);
  console.log(`   Average Score: ${summary.averageScore} / 100\n`);

  // Step 5: Get all clients who gave feedback
  console.log('📋 Step 5: Getting all clients...');
  const clients = await clientSDK.reputation.getClients(agentId);
  console.log(`✅ Clients who gave feedback: ${clients.length}`);
  console.log(`   ${clients.join(', ')}\n`);

  // Step 6: Submit another feedback with higher score
  console.log('📋 Step 6: Submitting second feedback...');
  await clientSDK.reputation.giveFeedback({
    agentId,
    score: 98,
  });
  console.log(`✅ Second feedback submitted (score: 98)\n`);

  // Step 7: Get updated summary
  console.log('📋 Step 7: Getting updated reputation summary...');
  const updatedSummary = await clientSDK.reputation.getSummary(agentId);
  console.log(`✅ Updated reputation summary:`);
  console.log(`   Feedback Count: ${updatedSummary.count}`);
  console.log(`   Average Score: ${updatedSummary.averageScore} / 100\n`);

  // Step 8: Read all feedback
  console.log('📋 Step 8: Reading all feedback...');
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
