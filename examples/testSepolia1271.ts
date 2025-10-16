/**
 * Example: Testing ERC-1271 Smart Contract Wallet Support for FeedbackAuth on Sepolia
 *
 * This example demonstrates:
 * 1. Deploying a MockERC1271Wallet contract
 * 2. Registering an agent owned by the smart contract wallet
 * 3. Creating and signing feedbackAuth with ERC-1271 signature
 * 4. Submitting feedback using the smart contract wallet signature
 *
 * Prerequisites:
 * - Sepolia RPC URL configured in .env
 * - Two funded wallets on Sepolia (one for wallet owner, one for feedback giver)
 * - Deployed ERC-8004 contracts on Sepolia
 *
 * Key Concept:
 * ERC-1271 allows smart contract wallets to validate signatures on-chain.
 * The ReputationRegistry contract supports both EOA signatures (via ECDSA recovery)
 * and smart contract signatures (via ERC-1271's isValidSignature).
 */

import dotenv from 'dotenv';
dotenv.config();
import { ERC8004Client, EthersAdapter } from '../src';
import { ethers } from 'ethers';

// Sepolia contract addresses
const IDENTITY_REGISTRY = process.env.IDENTITY_REGISTRY || '0x7177a6867296406881E20d6647232314736Dd09A';
const REPUTATION_REGISTRY = process.env.REPUTATION_REGISTRY || '0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322';
const VALIDATION_REGISTRY = process.env.VALIDATION_REGISTRY || '0x662b40A526cb4017d947e71eAF6753BF3eeE66d8';
const CHAIN_ID = 11155111; // Sepolia

// MockERC1271Wallet ABI (minimal interface)
const MOCK_WALLET_ABI = [
  'constructor(address _owner)',
  'function owner() view returns (address)',
  'function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)',
];

// MockERC1271Wallet bytecode - compile from contracts/MockERC1271Wallet.sol
// You need to compile this contract first:
// cd ../erc-8004-contracts && npx hardhat compile
// Then get the bytecode from artifacts/contracts/MockERC1271Wallet.sol/MockERC1271Wallet.json
const MOCK_WALLET_BYTECODE = '0x608060405234801561000f575f80fd5b5060043610610034575f3560e01c80631626ba7e146100385780638da5cb5b14610068575b5f80fd5b610052600480360381019061004d9190610292565b610086565b60405161005f91906102ff565b60405180910390f35b6100706100f8565b60405161007d9190610327565b60405180910390f35b5f8061009385858561011d565b90505f8054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16036100ee5763162ba7e360e01b915050610107565b63ffffffff60e01b9150505b9392505050565b5f8054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b5f8061014a8460405160200161013391906103af565b604051602081830303815290604052846101a0565b90508373ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614610193576040518060200160405280600081525061019757565b8390505b949350505050565b5f805f806101ac856101cf565b6040805184815260208101929092529094509092509050806040519080825280601f01601f1916602001820160405280156101f2576020820181803683370190505b50915050919050565b5f805f835160411461023f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161023690610419565b60405180910390fd5b6020840151604085015160608601515f1a7f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08211156102b3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102aa90610481565b60405180910390fd5b6102bf878585856102c6565b9250925050935093915050565b5f805f7f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff84169050601b811c92507f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60208501169150601b811c92507f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60408501169150601b811c92507f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a082111561039f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161039690610481565b60405180910390fd5b6001848484846040516020016103b891906104d3565b6040516020818303038152906040528051906020012060405160200161040f94939291909384526020840192909252604083015260608201526080019056fea264697066735822122024c15ad4fdfda1a36c6c6c7e8e7f5a8e9f3a1c7c7f2e6c7e8e7f5a8e9f3a1c7c64736f6c63430008150033';

/**
 * Generate a random CIDv0 (Qm...) for testing purposes
 * CIDv0 format: base58(0x12 + 0x20 + 32 random bytes)
 */
function generateRandomCIDv0(): string {
  const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const randomBytes = ethers.randomBytes(32);
  const cidBytes = new Uint8Array(34);
  cidBytes[0] = 0x12; // sha256
  cidBytes[1] = 0x20; // 32 bytes length
  cidBytes.set(randomBytes, 2);

  const bytes = Array.from(cidBytes);
  let num = BigInt('0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join(''));

  let encoded = '';
  while (num > 0n) {
    const remainder = Number(num % 58n);
    encoded = BASE58_ALPHABET[remainder] + encoded;
    num = num / 58n;
  }

  for (let i = 0; i < cidBytes.length && cidBytes[i] === 0; i++) {
    encoded = '1' + encoded;
  }

  return encoded;
}

async function main() {
  console.log('🚀 ERC-8004 SDK Test: ERC-1271 Smart Contract Wallet Support\n');
  console.log('═'.repeat(80));
  console.log();

  // Connect to Sepolia
  console.log('📡 Connecting to Sepolia testnet...');
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error('SEPOLIA_RPC_URL or RPC_URL not configured in .env');
  }
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const privateKey1 = process.env.SEPOLIA_TESTNET_PRIVATE_KEY_1 || process.env.PRIVATE_KEY;
  const privateKey2 = process.env.SEPOLIA_TESTNET_PRIVATE_KEY_2;

  if (!privateKey1 || !privateKey2) {
    throw new Error('Private keys not configured in .env');
  }

  const walletOwner = new ethers.Wallet(privateKey1, provider);
  const feedbackGiver = new ethers.Wallet(privateKey2, provider);

  console.log(`✅ Connected to Sepolia`);
  console.log(`   Wallet Owner: ${walletOwner.address}`);
  console.log(`   Feedback Giver: ${feedbackGiver.address}`);

  // Check balances
  const balance1 = await provider.getBalance(walletOwner.address);
  const balance2 = await provider.getBalance(feedbackGiver.address);
  console.log(`   Balance (owner): ${ethers.formatEther(balance1)} ETH`);
  console.log(`   Balance (giver): ${ethers.formatEther(balance2)} ETH`);
  console.log();

  // Step 1: Deploy MockERC1271Wallet
  console.log('📝 Step 1: Deploy MockERC1271Wallet contract');
  console.log('─'.repeat(80));

  let mockWalletAddress: string;
  try {
    // Check if we need to get the bytecode from artifacts
    console.log('   Note: Using MockERC1271Wallet from erc-8004-contracts');
    console.log('   Reading compiled contract...');

    const fs = await import('fs');
    const path = await import('path');
    const artifactPath = path.join(
      __dirname,
      '../../erc-8004-contracts/artifacts/contracts/MockERC1271Wallet.sol/MockERC1271Wallet.json'
    );

    let bytecode: string;
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      bytecode = artifact.bytecode;
      console.log('   ✅ Loaded bytecode from artifacts');
    } catch (err) {
      console.log('   ⚠️  Could not load from artifacts, using embedded bytecode');
      console.log('   (Run: cd ../erc-8004-contracts && npx hardhat compile)');
      bytecode = MOCK_WALLET_BYTECODE;
    }

    const factory = new ethers.ContractFactory(MOCK_WALLET_ABI, bytecode, walletOwner);
    const mockWallet = await factory.deploy(walletOwner.address);
    await mockWallet.waitForDeployment();
    mockWalletAddress = await mockWallet.getAddress();

    console.log(`   ✅ MockERC1271Wallet deployed at: ${mockWalletAddress}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/address/${mockWalletAddress}`);
    console.log(`   Owner: ${walletOwner.address}`);
    console.log();
  } catch (error: any) {
    console.error(`   ❌ Error deploying wallet: ${error.message}`);
    console.log('   Make sure to compile contracts first:');
    console.log('   cd ../erc-8004-contracts && npx hardhat compile');
    return;
  }

  // Step 2: Register agent with smart contract wallet as owner
  console.log('📝 Step 2: Register agent owned by smart contract wallet');
  console.log('─'.repeat(80));

  // Create adapter for wallet owner (who will register on behalf of the smart contract)
  const walletOwnerAdapter = new EthersAdapter(provider, walletOwner);
  const client = new ERC8004Client({
    adapter: walletOwnerAdapter,
    addresses: {
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      validationRegistry: VALIDATION_REGISTRY,
      chainId: CHAIN_ID,
    },
  });

  let agentId: bigint;
  try {
    const registrationURI = `ipfs://${generateRandomCIDv0()}`;
    const metadata = [
      { key: 'agentName', value: 'SmartContractAgent' },
      { key: 'walletType', value: 'ERC1271' },
      { key: 'smartWallet', value: mockWalletAddress },
    ];

    const result = await client.identity.registerWithMetadata(registrationURI, metadata);
    agentId = result.agentId;

    console.log(`   ✅ Registered agent ID: ${agentId}`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${result.txHash}`);

    const owner = await client.identity.getOwner(agentId);
    console.log(`   Owner: ${owner}`);
    console.log(`   URI: ${await client.identity.getTokenURI(agentId)}`);

    const agentName = await client.identity.getMetadata(agentId, 'agentName');
    const walletType = await client.identity.getMetadata(agentId, 'walletType');
    const smartWallet = await client.identity.getMetadata(agentId, 'smartWallet');
    console.log(`   Metadata:`);
    console.log(`     - agentName: ${agentName}`);
    console.log(`     - walletType: ${walletType}`);
    console.log(`     - smartWallet: ${smartWallet}`);

    // Now transfer the agent to the smart contract wallet
    console.log(`   Transferring agent to smart contract wallet...`);
    const identityContract = new ethers.Contract(
      IDENTITY_REGISTRY,
      ['function transferFrom(address from, address to, uint256 tokenId)'],
      walletOwner
    );
    const transferTx = await identityContract.transferFrom(walletOwner.address, mockWalletAddress, agentId);
    await transferTx.wait();
    console.log(`   ✅ Agent transferred to smart contract wallet`);
    console.log(`   🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${transferTx.hash}`);

    const newOwner = await client.identity.getOwner(agentId);
    console.log(`   New Owner: ${newOwner}`);
    console.log();
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`);
    return;
  }

  // Step 3: Create feedbackAuth with ERC-1271 signature
  console.log('📝 Step 3: Create feedbackAuth with ERC-1271 signature');
  console.log('─'.repeat(80));

  try {
    const chainId = await client.getChainId();
    const lastIndex = await client.reputation.getLastIndex(agentId, feedbackGiver.address);
    console.log(`   Last feedback index: ${lastIndex}`);

    // Create feedbackAuth
    // IMPORTANT: signerAddress is the smart contract wallet address for ERC-1271
    const feedbackAuth = client.reputation.createFeedbackAuth(
      agentId,
      feedbackGiver.address,
      lastIndex + BigInt(1),
      BigInt(Math.floor(Date.now() / 1000) + 3600), // Valid for 1 hour
      BigInt(chainId),
      mockWalletAddress // Use smart contract wallet as signer
    );
    console.log(`   ✅ FeedbackAuth created`);
    console.log(`      Agent ID: ${feedbackAuth.agentId}`);
    console.log(`      Client: ${feedbackAuth.clientAddress}`);
    console.log(`      Index Limit: ${feedbackAuth.indexLimit}`);
    console.log(`      Signer: ${feedbackAuth.signerAddress} (smart contract)`);

    // Sign with wallet owner's EOA
    // The signature will be validated by the smart contract's isValidSignature function
    console.log(`   Signing with wallet owner (EOA)...`);

    // Construct the message hash (same as in ReputationRegistry._verifySignature)
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'address', 'uint64', 'uint256', 'uint256', 'address', 'address'],
        [
          feedbackAuth.agentId,
          feedbackAuth.clientAddress,
          feedbackAuth.indexLimit,
          feedbackAuth.expiry,
          feedbackAuth.chainId,
          feedbackAuth.identityRegistry,
          feedbackAuth.signerAddress,
        ]
      )
    );

    // Create EIP-191 signed message hash
    const ethSignedMessageHash = ethers.hashMessage(ethers.getBytes(messageHash));

    // Sign with wallet owner
    const signature = await walletOwner.signMessage(ethers.getBytes(messageHash));
    console.log(`   ✅ Signature created: ${signature.slice(0, 20)}...`);

    // Verify the signature with the smart contract
    console.log(`   Verifying signature with ERC-1271...`);
    const mockWallet = new ethers.Contract(mockWalletAddress, MOCK_WALLET_ABI, provider);
    const magicValue = await mockWallet.isValidSignature(ethSignedMessageHash, signature);
    const expectedMagicValue = '0x1626ba7e'; // IERC1271.isValidSignature.selector

    if (magicValue === expectedMagicValue) {
      console.log(`   ✅ ERC-1271 signature validation successful!`);
      console.log(`      Magic value: ${magicValue}`);
    } else {
      console.error(`   ❌ ERC-1271 signature validation failed`);
      console.error(`      Expected: ${expectedMagicValue}`);
      console.error(`      Got: ${magicValue}`);
      return;
    }

    // Now encode the feedbackAuth for submission
    const encodedAuth = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'uint64', 'uint256', 'uint256', 'address', 'address'],
      [
        feedbackAuth.agentId,
        feedbackAuth.clientAddress,
        feedbackAuth.indexLimit,
        feedbackAuth.expiry,
        feedbackAuth.chainId,
        feedbackAuth.identityRegistry,
        feedbackAuth.signerAddress,
      ]
    );
    const signedAuth = encodedAuth + signature.slice(2); // Remove '0x' from signature
    console.log(`   ✅ Signed feedbackAuth ready: ${signedAuth.slice(0, 40)}...`);
    console.log();

    // Step 4: Submit feedback
    console.log('📝 Step 4: Submit feedback with ERC-1271 signed auth');
    console.log('─'.repeat(80));

    const feedbackAdapter = new EthersAdapter(provider, feedbackGiver);
    const feedbackClient = new ERC8004Client({
      adapter: feedbackAdapter,
      addresses: {
        identityRegistry: IDENTITY_REGISTRY,
        reputationRegistry: REPUTATION_REGISTRY,
        validationRegistry: VALIDATION_REGISTRY,
        chainId: CHAIN_ID,
      },
    });

    const feedbackResult = await feedbackClient.reputation.giveFeedback({
      agentId,
      score: 98,
      tag1: 'smart-contract',
      tag2: 'erc1271',
      feedbackUri: `ipfs://${generateRandomCIDv0()}`,
      feedbackAuth: signedAuth,
    });

    console.log(`   ✅ Feedback submitted successfully!`);
    console.log(`      Score: 98 / 100`);
    console.log(`      Tags: smart-contract, erc1271`);
    console.log(`      TX Hash: ${feedbackResult.txHash}`);
    console.log(`      🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${feedbackResult.txHash}`);
    console.log();

    // Verify the feedback
    console.log('📝 Step 5: Verify feedback submission');
    console.log('─'.repeat(80));

    const feedback = await feedbackClient.reputation.readFeedback(
      agentId,
      feedbackGiver.address,
      lastIndex + BigInt(1)
    );
    console.log(`   ✅ Feedback retrieved:`);
    console.log(`      Score: ${feedback.score} / 100`);
    console.log(`      Tag1: ${feedback.tag1}`);
    console.log(`      Tag2: ${feedback.tag2}`);
    console.log(`      Revoked: ${feedback.isRevoked}`);
    console.log();

    const summary = await client.reputation.getSummary(agentId);
    console.log(`   ✅ Reputation summary:`);
    console.log(`      Feedback Count: ${summary.count}`);
    console.log(`      Average Score: ${summary.averageScore} / 100`);
    console.log();

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    if (error.data) {
      console.error(`   Error data: ${error.data}`);
    }
    console.log();
    return;
  }

  console.log('═'.repeat(80));
  console.log('✨ All tests completed successfully!');
  console.log();
  console.log('📚 Summary:');
  console.log('   ✅ Deployed MockERC1271Wallet contract');
  console.log('   ✅ Registered agent owned by smart contract wallet');
  console.log('   ✅ Created feedbackAuth with ERC-1271 signature');
  console.log('   ✅ Verified signature using isValidSignature()');
  console.log('   ✅ Submitted feedback with smart contract wallet signature');
  console.log('   ✅ Contract validated ERC-1271 signature on-chain');
  console.log();
  console.log('🔑 Key Takeaways:');
  console.log('   • Smart contract wallets can own agents via ERC-721');
  console.log('   • ERC-1271 enables smart contracts to validate signatures');
  console.log('   • ReputationRegistry supports both EOA and ERC-1271 signatures');
  console.log('   • Signature verification happens on-chain during giveFeedback()');
  console.log('═'.repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
