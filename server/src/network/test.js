const TransportManager = require('./TransportManager');
const PeerDiscovery = require('./PeerDiscovery');

async function runTest(username, tcpPort, udpPort) {
  console.log(`\n--- Starting Aritra's Network Tests [${username}] ---`);

  const transport = new TransportManager(tcpPort);
  const discovery = new PeerDiscovery(username, tcpPort, udpPort);

  try {
    const boundPort = await transport.startServer();
    console.log(`[+] [${username}] TCP Server listening on 0.0.0.0:${boundPort}`);
  } catch (err) {
    console.error(`[-] [${username}] Failed to start TCP server:`, err.message);
    process.exit(1);
  }

  transport.on('connection', ({ ip, socket }) => {
    console.log(`[+] [${username}] TCP Connection established with ${ip}`);
    
    socket.on('data', (data) => {
      console.log(`[+] [${username}] Received TCP data: ${data.toString()}`);
      if (data.toString() === 'PING') {
        socket.write('PONG');
      }
    });
  });

  discovery.on('peerFound', (peerInfo) => {
    console.log(`[+] [${username}] UDP Discovered Peer: ${peerInfo.username} at ${peerInfo.ip}:${peerInfo.tcpPort}`);
    
    // Automatically attempt TCP connection when peer is found via UDP
    console.log(`[+] [${username}] Attempting TCP connection to ${peerInfo.ip}:${peerInfo.tcpPort}...`);
    const socket = transport.connectToPeer(peerInfo.ip, peerInfo.tcpPort);
    
    // Once connected, send a ping to test the line
    socket.once('connect', () => {
      socket.write('PING');
    });
  });

  discovery.start();
  console.log(`[+] [${username}] UDP Broadcasting on port ${udpPort}`);

  // Auto-close after 5 seconds to prevent hanging the test runner
  setTimeout(() => {
    discovery.stop();
    transport.stopServer();
    console.log(`[+] [${username}] Test complete, shutting down.`);
  }, 5000);
}

const args = process.argv.slice(2);
if (args.length === 3) {
  runTest(args[0], parseInt(args[1]), parseInt(args[2]));
} else {
  console.error("Usage: node test.js <username> <tcpPort> <udpPort>");
}
