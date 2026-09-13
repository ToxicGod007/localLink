const test = require('node:test');
const assert = require('node:assert');
const { generateKeyPair, deriveSharedSecret, encryptMessage, decryptMessage } = require('../src/crypto');

test('ECDH Key Exchange', (t) => {
  // Alice generates keys
  const alice = generateKeyPair();
  assert.ok(alice.publicKey instanceof Buffer, 'Alice public key should be a Buffer');
  assert.ok(alice.privateKey instanceof Buffer, 'Alice private key should be a Buffer');

  // Bob generates keys
  const bob = generateKeyPair();

  // Both derive the shared secret using their private key and the other's public key
  const aliceSecret = deriveSharedSecret(alice.privateKey, bob.publicKey);
  const bobSecret = deriveSharedSecret(bob.privateKey, alice.publicKey);

  // Assertions
  assert.strictEqual(aliceSecret.length, 32, 'Shared secret should be exactly 32 bytes (AES-256)');
  assert.strictEqual(bobSecret.length, 32, 'Shared secret should be exactly 32 bytes (AES-256)');
  assert.deepStrictEqual(aliceSecret, bobSecret, 'Derived shared secrets must match exactly');
});

test('AES-256-GCM Encryption and Decryption', (t) => {
  const alice = generateKeyPair();
  const bob = generateKeyPair();
  const sessionKey = deriveSharedSecret(alice.privateKey, bob.publicKey);

  const plaintext = Buffer.from('Hello, World! This is a secret message.');
  
  const encrypted = encryptMessage(sessionKey, plaintext);
  assert.ok(encrypted.length > plaintext.length + 28 - 1, 'Encrypted length should include 12B nonce and 16B auth tag');

  const decrypted = decryptMessage(sessionKey, encrypted);
  assert.deepStrictEqual(decrypted, plaintext, 'Decrypted text must match original plaintext');
});

test('AES-256-GCM Authentication Failure on Tampering', (t) => {
  const alice = generateKeyPair();
  const bob = generateKeyPair();
  const sessionKey = deriveSharedSecret(alice.privateKey, bob.publicKey);

  const plaintext = Buffer.from('Secret payload');
  const encrypted = encryptMessage(sessionKey, plaintext);

  // Tamper with ciphertext (e.g., change 15th byte which is inside the ciphertext/nonce)
  encrypted[15] = encrypted[15] ^ 1;

  assert.throws(() => {
    decryptMessage(sessionKey, encrypted);
  }, /Authentication failed: Invalid auth tag or corrupted data/, 'Should throw authentication error on tampered data');
});
