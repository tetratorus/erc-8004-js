/**
 * Example script to test ERC-8004 Validation functionality
 *
 * Prerequisites:
 * 1. Run hardhat node: npx hardhat node
 * 2. Deploy contracts with the ignition script
 *
 * This example demonstrates:
 * - Registering an agent
 * - Requesting validation from a validator
 * - Validator providing response
 * - Reading validation status and summaries
 */

import { ERC8004Client, EthersAdapter } from '../src';
import { ethers } from 'ethers';

// Contract addresses from your deployment
const IDENTITY_REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const REPUTATION_REGISTRY = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const VALIDATION_REGISTRY = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

async function main() {
  console.log('🚀 ERC-8004 Validation Test\n');

  // Connect to local Hardhat
  console.log('Connecting to local Hardhat...');
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  // Use first account as agent owner
  const agentOwner = await provider.getSigner(0);
  // Use second account as validator
  const validator = await provider.getSigner(1);

  const agentOwnerAddress = await agentOwner.getAddress();
  const validatorAddress = await validator.getAddress();

  console.log(`Agent Owner: ${agentOwnerAddress}`);
  console.log(`Validator: ${validatorAddress}\n`);

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

  // Create SDK instance for validator
  const validatorAdapter = new EthersAdapter(provider, validator);
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
  console.log('📋 Step 1: Registering an agent...');
  const registerResult = await agentSDK.identity.registerWithURI(
    'https://example.com/agent.json'
  );
  const agentId = registerResult.agentId;
  console.log(`✅ Agent registered with ID: ${agentId}`);
  console.log(`   TX Hash: ${registerResult.txHash}\n`);

  // Step 2: Agent requests validation
  console.log('📋 Step 2: Agent requesting validation...');
  const requestResult = await agentSDK.validation.validationRequest({
    validatorAddress,
    agentId,
    requestUri: 'ipfs://QmValidationRequest123',
    // requestHash is OPTIONAL for IPFS URIs
  });
  console.log(`✅ Validation requested`);
  console.log(`   Validator: ${validatorAddress}`);
  console.log(`   Request URI: ipfs://QmValidationRequest123`);
  console.log(`   Request Hash: ${requestResult.requestHash}`);
  console.log(`   TX Hash: ${requestResult.txHash}\n`);

  const requestHash = requestResult.requestHash;

  // Step 3: Validator provides response (passed)
  console.log('📋 Step 3: Validator providing response (passed)...');
  const responseResult = await validatorSDK.validation.validationResponse({
    requestHash,
    response: 100, // 100 = passed, 0 = failed
    responseUri: 'ipfs://QmValidationResponse123',
    tag: 'zkML-proof',
  });
  console.log(`✅ Validation response provided`);
  console.log(`   Response: 100 (passed)`);
  console.log(`   Tag: zkML-proof`);
  console.log(`   TX Hash: ${responseResult.txHash}\n`);

  // Step 4: Read validation status
  console.log('📋 Step 4: Reading validation status...');
  const status = await agentSDK.validation.getValidationStatus(requestHash);
  console.log(`✅ Validation status retrieved:`);
  console.log(`   Validator: ${status.validatorAddress}`);
  console.log(`   Agent ID: ${status.agentId}`);
  console.log(`   Response: ${status.response} / 100`);
  console.log(`   Tag: ${status.tag}`);
  console.log(`   Last Update: ${new Date(Number(status.lastUpdate) * 1000).toISOString()}\n`);

  // Step 5: Get validation summary for agent
  console.log('📋 Step 5: Getting validation summary for agent...');
  const summary = await agentSDK.validation.getSummary(agentId, [validatorAddress]);
  console.log(`✅ Validation summary:`);
  console.log(`   Validation Count: ${summary.count}`);
  console.log(`   Average Response: ${summary.avgResponse} / 100\n`);

  // Step 6: Get all validation requests for agent
  console.log('📋 Step 6: Getting all validations for agent...');
  const agentValidations = await agentSDK.validation.getAgentValidations(agentId);
  console.log(`✅ Agent validations retrieved:`);
  console.log(`   Total validations: ${agentValidations.length}`);
  for (let i = 0; i < agentValidations.length; i++) {
    console.log(`   [${i}] Request Hash: ${agentValidations[i]}`);
  }
  console.log();

  // Step 7: Get all requests handled by validator
  console.log('📋 Step 7: Getting all requests for validator...');
  const validatorRequests = await validatorSDK.validation.getValidatorRequests(validatorAddress);
  console.log(`✅ Validator requests retrieved:`);
  console.log(`   Total requests: ${validatorRequests.length}`);
  for (let i = 0; i < validatorRequests.length; i++) {
    console.log(`   [${i}] Request Hash: ${validatorRequests[i]}`);
  }
  console.log();

  // Step 8: Submit second validation request and provide different response
  console.log('📋 Step 8: Submitting second validation request...');
  const request2 = await agentSDK.validation.validationRequest({
    validatorAddress,
    agentId,
    requestUri: 'ipfs://QmValidationRequest456',
  });
  console.log(`✅ Second validation requested`);
  console.log(`   Request Hash: ${request2.requestHash}\n`);

  // Validator provides partial success response
  console.log('📋 Step 9: Validator providing partial response...');
  await validatorSDK.validation.validationResponse({
    requestHash: request2.requestHash,
    response: 75, // Partial success
    tag: 'tee-attestation',
  });
  console.log(`✅ Response provided (75 - partial success)\n`);

  // Step 10: Get updated summary
  console.log('📋 Step 10: Getting updated validation summary...');
  const updatedSummary = await agentSDK.validation.getSummary(agentId);
  console.log(`✅ Updated validation summary:`);
  console.log(`   Validation Count: ${updatedSummary.count}`);
  console.log(`   Average Response: ${updatedSummary.avgResponse} / 100\n`);

  // Step 11: Validator updates first validation (progressive validation)
  console.log('📋 Step 11: Validator updating first validation (hard finality)...');
  await validatorSDK.validation.validationResponse({
    requestHash,
    response: 100,
    tag: 'hard-finality',
    responseUri: 'ipfs://QmUpdatedResponse',
  });
  console.log(`✅ Validation updated with hard finality tag\n`);

  const updatedStatus = await agentSDK.validation.getValidationStatus(requestHash);
  console.log(`   Updated tag: ${updatedStatus.tag}`);

  console.log('\n🎉 All tests completed successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
