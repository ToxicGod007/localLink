const dgram = require('dgram');
const { EventEmitter } = require('events');

class PeerDiscovery extends EventEmitter {
  constructor(username, tcpPort, udpPort = 9001) {
    super();
    this.username = username;
    this.tcpPort = tcpPort;
    this.udpPort = udpPort;
    
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.peers = new Map(); // ip -> peerData
    this.broadcastInterval = null;
  }

  start() {
    this.socket.on('error', (err) => {
      console.error(`UDP Discovery Error:\n${err.stack}`);
      this.socket.close();
    });

    this.socket.on('message', (msg, rinfo) => {
      try {
        const peerInfo = JSON.parse(msg.toString());
        
        // Don't add ourselves
        if (peerInfo.tcpPort === this.tcpPort && peerInfo.username === this.username) return;

        if (!this.peers.has(rinfo.address)) {
          this.peers.set(rinfo.address, { ...peerInfo, lastSeen: Date.now() });
          this.emit('peerFound', { ip: rinfo.address, ...peerInfo });
        } else {
          // Update last seen
          this.peers.get(rinfo.address).lastSeen = Date.now();
        }
      } catch (err) {
        // Ignore invalid broadcast messages
      }
    });

    this.socket.on('listening', () => {
      this.socket.setBroadcast(true);
      
      // Broadcast presence every 3 seconds
      this.broadcastInterval = setInterval(() => {
        const payload = Buffer.from(JSON.stringify({
          username: this.username,
          tcpPort: this.tcpPort
        }));
        // Broadcast to local subnet
        this.socket.send(payload, 0, payload.length, this.udpPort, '255.255.255.255');
      }, 3000);
      
      // Aritra's Fix: Sweep for offline peers every 5 seconds
      this.ttlInterval = setInterval(() => {
        const now = Date.now();
        for (const [ip, peer] of this.peers.entries()) {
          // If haven't seen for 15 seconds, assume they went offline
          if (now - peer.lastSeen > 15000) {
            this.peers.delete(ip);
            this.emit('peerOffline', ip);
          }
        }
      }, 5000);
    });

    this.socket.bind(this.udpPort);
  }

  stop() {
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
    if (this.ttlInterval) clearInterval(this.ttlInterval);
    try {
      this.socket.close();
    } catch(e) {}
  }
}

module.exports = PeerDiscovery;
