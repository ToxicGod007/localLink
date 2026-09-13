const crypto = require('crypto');

/**
 * Generates an ephemeral X25519 key pair for a new session.
 * @returns {{ publicKey: Buffer, privateKey: Buffer }}
 */
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' })
  };
}

/**
 * Derives a shared AES-256 session key using ECDH.
 * @param {Buffer} privateKey - The local private key (DER)
 * @param {Buffer} peerPublicKey - The peer's public key (DER)
 * @returns {Buffer} The 32-byte shared secret (AES-256 key)
 */
function deriveSharedSecret(privateKey, peerPublicKey) {
  const privKeyObj = crypto.createPrivateKey({ key: privateKey, type: 'pkcs8', format: 'der' });
  const pubKeyObj = crypto.createPublicKey({ key: peerPublicKey, type: 'spki', format: 'der' });
  
  const ecdh = crypto.diffieHellman({
    privateKey: privKeyObj,
    publicKey: pubKeyObj
  });
  
  return ecdh;
}

/**
 * Encrypts a plaintext message using AES-256-GCM.
 * Prepend 12-byte nonce, append 16-byte auth tag.
 * @param {Buffer} sessionKey - The 32-byte AES key
 * @param {Buffer} plaintext - The message payload
 * @returns {Buffer} The encrypted payload with nonce and auth tag
 */
function encryptMessage(sessionKey, plaintext) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, nonce);
  
  let ciphertext = cipher.update(plaintext);
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  
  const authTag = cipher.getAuthTag(); // 16 bytes
  
  // Format: [Nonce (12B)] + [Ciphertext] + [AuthTag (16B)]
  return Buffer.concat([nonce, ciphertext, authTag]);
}

/**
 * Decrypts a payload encrypted by `encryptMessage`.
 * @param {Buffer} sessionKey - The 32-byte AES key
 * @param {Buffer} encryptedPayload - [Nonce (12B)] + [Ciphertext] + [AuthTag (16B)]
 * @returns {Buffer} The decrypted plaintext
 */
function decryptMessage(sessionKey, encryptedPayload) {
  if (encryptedPayload.length < 28) {
    throw new Error('Payload too short to contain nonce and auth tag');
  }

  const nonce = encryptedPayload.subarray(0, 12);
  const authTag = encryptedPayload.subarray(encryptedPayload.length - 16);
  const ciphertext = encryptedPayload.subarray(12, encryptedPayload.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey, nonce);
  decipher.setAuthTag(authTag);

  try {
    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);
    return plaintext;
  } catch (err) {
    throw new Error('Authentication failed: Invalid auth tag or corrupted data');
  }
}

module.exports = {
  generateKeyPair,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage
};
