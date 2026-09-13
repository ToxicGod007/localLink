const test = require('node:test');
const assert = require('node:assert');
const { generateKeyPair, deriveSharedSecret } = require('../src/crypto');

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
