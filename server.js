/**
 * GPS Tracker R12 - TCP Server with Protocol Decoder
 * Receives GPS data via TCP and decodes location information
 */

require('dotenv').config();
const net = require('net');
const GPSDecoder = require('./gps_decoder');

const PORT = process.env.PORT || 8503;
const decoder = new GPSDecoder();

// Track connected devices
const connectedDevices = new Map();

// Simple logging utility
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.log(`[WARN] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  debug: (msg) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`);
    }
  }
};

const server = net.createServer((socket) => {
  const clientIP = socket.remoteAddress;
  const clientPort = socket.remotePort;
  const clientId = `${clientIP}:${clientPort}`;
  
  // Store connection info
  connectedDevices.set(clientId, {
    ip: clientIP,
    port: clientPort,
    connectedAt: new Date(),
    lastActivity: new Date(),
    messagesReceived: 0
  });

  log.info(`🔌 Device connected: ${clientIP}:${clientPort}`);
  log.info(`   Active connections: ${connectedDevices.size}`);

  let buffer = '';

  socket.setTimeout(300000); // 5 minutes timeout

  socket.on('data', (data) => {
    // Update last activity
    const deviceInfo = connectedDevices.get(clientId);
    if (deviceInfo) {
      deviceInfo.lastActivity = new Date();
      deviceInfo.messagesReceived++;
    }

    // Convert buffer to hex string
    const hexData = data.toString('hex');
    log.debug(`📥 RAW HEX from ${clientIP}: ${hexData}`);

    // Add to buffer (in case messages are split)
    buffer += hexData;

    // Try to parse complete frames
    while (buffer.length >= 4) {
      // Look for frame markers: 7878 (start) and 0d0a (end)
      const startIndex = buffer.indexOf('7878');
      
      if (startIndex === -1) {
        buffer = ''; // No valid frame start found
        break;
      }

      // Skip if start marker is not at beginning
      if (startIndex > 0) {
        buffer = buffer.substring(startIndex);
      }

      // Look for end marker
      const endIndex = buffer.indexOf('0d0a', startIndex + 4);
      
      if (endIndex === -1) {
        // Incomplete frame, wait for more data
        break;
      }

      // Extract complete frame (including end marker)
      const frameLength = endIndex + 4;
      const frame = buffer.substring(0, frameLength);

      log.info(`\n✅ Complete Frame Received from ${clientIP}`);
      log.info(`📦 RAW DATA: ${frame}`);
      log.info(`📏 Length: ${frame.length / 2} bytes\n`);

      // Send ACK to device
      const ack = Buffer.from([0x78, 0x78, 0x05, 0x01, 0x00, 0x00, 0x00, 0x00, 0x7d, 0x0d, 0x0a]);
      socket.write(ack);
      log.debug(`✔️  ACK sent to ${clientIP}\n`);

      // Remove processed frame from buffer
      buffer = buffer.substring(frameLength);
    }
  });

  socket.on('timeout', () => {
    log.warn(`⏱️  Socket timeout for ${clientIP}:${clientPort}`);
    socket.end();
  });

  socket.on('end', () => {
    connectedDevices.delete(clientId);
    log.info(`❌ Device disconnected: ${clientIP}:${clientPort}`);
    log.info(`   Active connections: ${connectedDevices.size}\n`);
  });

  socket.on('error', (error) => {
    log.error(`⚠️  Socket error from ${clientIP}:${clientPort}: ${error.message}`);
    connectedDevices.delete(clientId);
  });
});

/**
 * Store location data (implement with your database)
 */
function storeLocationData(data) {
  // Example: Store to database
  // You can integrate with MongoDB, PostgreSQL, etc.
  
  log.info(`💾 Storing location data:`);
  log.info(`   IMEI: ${data.imei}`);
  
  if (data.location && data.location.latitude) {
    log.info(`   Latitude: ${data.location.latitude.decimal}° ${data.location.latitude.direction}`);
    log.info(`   Longitude: ${data.location.longitude.decimal}° ${data.location.longitude.direction}`);
    log.info(`   Altitude: ${data.location.altitude}`);
    log.info(`   Speed: ${data.location.speed}`);
    log.info(`   Direction: ${data.location.direction}`);
    log.info(`   DateTime: ${data.location.dateTime}`);
    const gpsStatus = data.location.gpsStatus === 'FIXED' ? 'FIXED ✓' : 'UNFIXED';
    log.info(`   GPS Status: ${gpsStatus}`);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log.info('\n🛑 Shutting down server gracefully...');
  
  // Close all connections
  connectedDevices.forEach((device, clientId) => {
    log.info(`   Closing connection: ${clientId}`);
  });
  
  server.close(() => {
    log.info('✅ Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    log.error('⚠️  Forcing shutdown');
    process.exit(1);
  }, 10000);
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('  🚀 GPS TCP Server Started');
  console.log('='.repeat(60));
  log.info(`📡 Listening on port: ${PORT}`);
  log.info(`⏰ Server time: ${new Date().toISOString()}`);
  log.info(`🔧 Node version: ${process.version}`);
  console.log('-'.repeat(60));
  log.warn('⚠️  GPS Device Requirements:');
  log.info(`   • Clear sky view for GPS acquisition`);
  log.info(`   • Wait for GPS:FIXED status`);
  log.info(`   • Configure server IP: YOUR_SERVER_IP`);
  log.info(`   • Configure server port: ${PORT}`);
  console.log('='.repeat(60) + '\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    log.error(`❌ Port ${PORT} is already in use`);
  } else {
    log.error(`❌ Server error: ${error.message}`);
  }
  process.exit(1);
});
