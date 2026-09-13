const WebSocket = require('ws');
const crypto = require('crypto');
const PeerDiscovery = require('./network/PeerDiscovery');
const TransportManager = require('./network/TransportManager');
const MessageBuffer = require('./protocol/MessageBuffer');
const MessageBuilder = require('./protocol/MessageBuilder');
const { OPCODES } = require('./protocol/constants');
const { generateKeyPair, deriveSharedSecret, encryptMessage, decryptMessage } = require('./crypto');

// Configuration
const TCP_PORT = 9000;
const UDP_PORT = 9001;
const WS_PORT = 5173; // Hardcoded in Abhinav's frontend

// Ask for custom username
const username = process.argv[2] || `User_${Math.floor(Math.random() * 1000)}`;
console.log(`Starting LocalLink Proxy for: ${username}`);

// 1. Initialize Network Layers (Aritra's Module)
const transport = new TransportManager(TCP_PORT);
const discovery = new PeerDiscovery(username, TCP_PORT, UDP_PORT);

// 2. Initialize WebSocket Server (Abhinav's Interface)
const wss = new WebSocket.Server({ port: WS_PORT }, () => {
  console.log(`[Proxy] WebSocket Server listening on ws://localhost:${WS_PORT}`);
});

// State Management
const activePeers = new Map(); // ip -> { socket, sessionKey, msgBuffer }
const localKeyPair = generateKeyPair();

// Connect Aritra's UDP to Abhinav's Frontend
discovery.on('peerFound', (peerInfo) => {
  console.log(`[Proxy] Found peer: ${peerInfo.username} at ${peerInfo.ip}:${peerInfo.tcpPort}`);
  
  // Notify frontend
  broadcastWS({
    type: 'PEER_ANNOUNCE',
    peer: {
      id: peerInfo.ip,
      ip: peerInfo.ip,
      name: peerInfo.username
    }
  });

  // Automatically attempt TCP connection
  if (!activePeers.has(peerInfo.ip)) {
    transport.connectToPeer(peerInfo.ip, peerInfo.tcpPort);
  }
});

// Connect Aritra's TCP to Arnav's Protocol and Shobit's Crypto
transport.on('connection', ({ ip, socket }) => {
  console.log(`[Proxy] TCP Connected to ${ip}`);
  
  const msgBuffer = new MessageBuffer();
  activePeers.set(ip, { socket, sessionKey: null, msgBuffer });

  // Pipe Aritra's raw data into Arnav's buffer
  socket.on('data', (data) => {
    msgBuffer.push(data);
  });

  // Handle Arnav's perfectly parsed messages
  msgBuffer.on('message', (msg) => {
    const peerState = activePeers.get(ip);
    
    // ECDH Handshake Logic (Shobit's crypto)
    if (msg.opcode === OPCODES.HANDSHAKE_INIT) {
      peerState.sessionKey = deriveSharedSecret(localKeyPair.privateKey, msg.payload);
      
      // Send ACK back
      const ackMsg = MessageBuilder.build(
        OPCODES.HANDSHAKE_ACK,
        0,
        Buffer.alloc(32, 0), // Dummy session ID for handshake
        localKeyPair.publicKey
      );
      socket.write(ackMsg);
      console.log(`[Proxy] Handshake completed with ${ip}`);
      return;
    }

    if (msg.opcode === OPCODES.HANDSHAKE_ACK) {
      peerState.sessionKey = deriveSharedSecret(localKeyPair.privateKey, msg.payload);
      console.log(`[Proxy] Handshake ACK received from ${ip}`);
      return;
    }

    // Decrypt standard messages
    if (!peerState.sessionKey) {
      console.warn(`[Proxy] Received encrypted message from ${ip} but no session key established.`);
      return;
    }

    try {
      const plaintext = decryptMessage(peerState.sessionKey, msg.payload);
      
      // Route decrypted message to Abhinav's frontend
      if (msg.opcode === OPCODES.CHAT_MESSAGE) {
        broadcastWS({
          type: 'CHAT_MESSAGE',
          from: ip, // The frontend expects 'from', not 'sender'
          text: plaintext.toString(),
          ts: Date.now() // Frontend uses this for message timestamps
        });
      }
      // Add other opcodes (FILE_CHUNK, etc.) here as needed
    } catch (err) {
      console.error(`[Proxy] Failed to decrypt message from ${ip}:`, err.message);
    }
  });

  // Initiate Handshake if we connected out
  const initMsg = MessageBuilder.build(
    OPCODES.HANDSHAKE_INIT,
    0,
    Buffer.alloc(32, 0),
    localKeyPair.publicKey
  );
  socket.write(initMsg);
});

transport.on('disconnected', (ip) => {
  console.log(`[Proxy] TCP Disconnected from ${ip}`);
  activePeers.delete(ip);
  broadcastWS({ type: 'PEER_OFFLINE', peerId: ip }); // Frontend expects peerId
});

// Connect Abhinav's Frontend to Arnav's Protocol and Aritra's TCP
wss.on('connection', (ws) => {
  console.log('[Proxy] Frontend React UI connected via WebSocket.');
  
  // Immediately send all currently known peers to this new frontend connection
  for (const [ip, peerInfo] of discovery.peers.entries()) {
    ws.send(JSON.stringify({
      type: 'PEER_ANNOUNCE',
      peer: {
        id: peerInfo.ip || ip,
        ip: peerInfo.ip || ip,
        name: peerInfo.username
      }
    }));
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      if (msg.type === 'CHAT_MESSAGE') {
        const { to, text } = msg; // Frontend sends 'to', not 'targetIp'
        const peerState = activePeers.get(to);
        
        if (peerState && peerState.sessionKey) {
          const encryptedPayload = encryptMessage(peerState.sessionKey, Buffer.from(text));
          const packet = MessageBuilder.build(
            OPCODES.CHAT_MESSAGE,
            Math.floor(Date.now() / 1000) % 4294967295, // fit into 32-bit unsigned int
            Buffer.alloc(32, 1), // dummy session ID for now
            encryptedPayload
          );
          peerState.socket.write(packet);
        }
      }
    } catch (err) {
      console.error('[Proxy] Error handling WS message:', err);
    }
  });
});

function broadcastWS(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Start everything
transport.startServer().then(() => {
  console.log(`[Proxy] TCP Server listening on 0.0.0.0:${TCP_PORT}`);
  discovery.start();
  console.log(`[Proxy] UDP Discovery broadcasting on port ${UDP_PORT}`);
}).catch(console.error);
