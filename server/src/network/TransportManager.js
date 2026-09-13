const net = require('net');
const { EventEmitter } = require('events');

class TransportManager extends EventEmitter {
  constructor(port = 9000) {
    super();
    this.port = port;
    this.server = null;
    this.activeSockets = new Map(); // ip -> net.Socket
  }

  startServer() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this._handleNewSocket(socket);
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      // Bind strictly to 0.0.0.0 to listen on the LAN
      this.server.listen(this.port, '0.0.0.0', () => {
        resolve(this.port);
      });
    });
  }

  connectToPeer(ip, port) {
    if (this.activeSockets.has(ip)) return this.activeSockets.get(ip);

    const socket = new net.Socket();
    
    socket.connect(port, ip, () => {
      this._handleNewSocket(socket, ip);
    });

    socket.on('error', (err) => {
      console.error(`TCP connection error to ${ip}:`, err.message);
      this._cleanupSocket(ip, socket);
    });

    return socket;
  }

  _handleNewSocket(socket, knownIp = null) {
    // Disable Nagle's algorithm for real-time responsiveness
    socket.setNoDelay(true);
    
    // Aritra's Fix: TCP Keep-Alives and Timeout
    socket.setKeepAlive(true, 5000);
    socket.setTimeout(15000); // 15 seconds of silence kills the socket

    const ip = knownIp || socket.remoteAddress;
    this.activeSockets.set(ip, socket);

    socket.on('data', (data) => {
      // Pass the raw byte stream up to Arnav's MessageBuffer
      this.emit('data', { ip, data });
    });

    socket.on('error', (err) => {
      console.error(`Socket error from ${ip}:`, err.message);
      this._cleanupSocket(ip, socket);
    });
    
    socket.on('timeout', () => {
      console.error(`Socket timeout from ${ip}`);
      socket.destroy();
    });

    socket.on('close', () => {
      this._cleanupSocket(ip, socket);
    });

    this.emit('connection', { ip, socket });
  }

  _cleanupSocket(ip, closingSocket) {
    if (this.activeSockets.has(ip)) {
      const currentSocket = this.activeSockets.get(ip);
      // Only clean up if the socket closing is actually the active one
      if (closingSocket && currentSocket !== closingSocket) {
        return; // It's an old/duplicate socket closing, ignore
      }
      
      if (!currentSocket.destroyed) {
        currentSocket.destroy();
      }
      this.activeSockets.delete(ip);
      this.emit('disconnected', ip);
    }
  }

  stopServer() {
    if (this.server) {
      this.server.close();
    }
    for (const [ip, socket] of this.activeSockets.entries()) {
      this._cleanupSocket(ip);
    }
  }
}

module.exports = TransportManager;
