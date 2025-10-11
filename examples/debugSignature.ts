/**
 * Debug script to verify signature encoding
 */

import { ethers } from 'ethers';

async function main() {
  console.log('🔍 Debug Signature Encoding\n');

  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const signer = await provider.getSigner(0);
  const signerAddress = await signer.getAddress();

  console.log(`Signer: ${signerAddress}\n`);

  // Test data
  const auth = {
    agentId: BigInt(1),
    clientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    indexLimit: BigInt(1),
    expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
    chainId: BigInt(31337),
    identityRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    signerAddress: signerAddress,
  };

  console.log('Auth structure:', auth);

  // Encode the tuple
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'address', 'uint64', 'uint256', 'uint256', 'address', 'address'],
    [
      auth.agentId,
      auth.clientAddress,
      auth.indexLimit,
      auth.expiry,
      auth.chainId,
      auth.identityRegistry,
      auth.signerAddress,
    ]
  );

  console.log(`\nEncoded (${encoded.length} chars = ${(encoded.length - 2) / 2} bytes):`);
  console.log(encoded);

  // Hash the encoded data
  const messageHash = ethers.keccak256(encoded);
  console.log(`\nMessage hash:`);
  console.log(messageHash);

  // Sign with personal_sign (adds EIP-191 prefix)
  const signature = await signer.signMessage(ethers.getBytes(messageHash));
  console.log(`\nSignature:`);
  console.log(signature);

  // Concatenate encoded + signature
  const feedbackAuth = ethers.concat([encoded, signature]);
  console.log(`\nFeedbackAuth (${feedbackAuth.length} chars = ${(feedbackAuth.length - 2) / 2} bytes):`);
  console.log(feedbackAuth);

  // Verify the signature locally
  const ethSignedMessageHash = ethers.hashMessage(ethers.getBytes(messageHash));
  console.log(`\nEth signed message hash (what contract computes):`);
  console.log(ethSignedMessageHash);

  const recovered = ethers.recoverAddress(ethSignedMessageHash, signature);
  console.log(`\nRecovered signer: ${recovered}`);
  console.log(`Expected signer: ${signerAddress}`);
  console.log(`Match: ${recovered.toLowerCase() === signerAddress.toLowerCase()}`);
}

main().catch(console.error);
