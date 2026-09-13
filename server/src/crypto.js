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

module.exports = {
  generateKeyPair,
  deriveSharedSecret
};
