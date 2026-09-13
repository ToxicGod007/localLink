const net = require('net');
const fs = require('fs');
const path = require('path');
const MessageBuffer = require('./MessageBuffer');
const StreamController = require('./StreamController');
const { OPCODES } = require('./constants');

async function runTest() {
  console.log('--- Starting Arnav Protocol Tests ---');

  // Create a dummy 2MB file to test chunking and backpressure
  const testFile = path.join(__dirname, 'test.bin');
  const size2MB = 2 * 1024 * 1024;
  fs.writeFileSync(testFile, Buffer.alloc(size2MB, 0xAA));
  console.log('[+] Dummy 2MB file created.');

  // Set up a mock TCP server to receive the data and test the MessageBuffer
  const server = net.createServer((socket) => {
    console.log('[+] TCP Server: Connection received.');
    
    // Simulate a slow network by artificially pausing/resuming the socket
    // This will trigger StreamController's socket.write() to return false occasionally.
    let totalMessages = 0;
    
    const msgBuffer = new MessageBuffer();
    
    socket.on('data', (data) => {
      msgBuffer.push(data);
      // Simulate reading slowly by pausing the socket temporarily
      socket.pause();
      setTimeout(() => socket.resume(), 10);
    });

    msgBuffer.on('message', (msg) => {
      totalMessages++;
      if (msg.opcode === OPCODES.FILE_COMPLETE) {
        console.log(`[+] SUCCESS: Received FILE_COMPLETE. Total messages parsed: ${totalMessages}`);
        server.close();
        fs.unlinkSync(testFile);
      }
    });
  });

  server.listen(9999, '127.0.0.1', () => {
    console.log('[+] TCP Server listening on 9999');

    // Set up TCP Client
    const client = new net.Socket();
    client.connect(9999, '127.0.0.1', async () => {
      console.log('[+] TCP Client connected. Starting stream...');
      const dummySessionId = Buffer.alloc(32, 0xBB);
      
      try {
        await StreamController.transferFile(testFile, client, dummySessionId);
        console.log('[+] Client: File transfer function resolved successfully.');
        client.end();
      } catch (err) {
        console.error('[-] Client error:', err);
      }
    });
  });
}

runTest();
