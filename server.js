/**
 * GPS Tracker R12 - TCP Server with Protocol Decoder
 * Receives GPS data via TCP and decodes location information
 */

require('dotenv').config();
const net = require('net');
const chalk = require('chalk');
const logger = require('./logger');
const GPSDecoder = require('./gps_decoder');

const PORT = process.env.PORT || 8503;
const decoder = new GPSDecoder();

// Track connected devices
const connectedDevices = new Map();

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

  logger.info(chalk.green(`🔌 Device connected: ${clientIP}:${clientPort}`));
  logger.info(chalk.gray(`   Active connections: ${connectedDevices.size}`));

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
    logger.debug(chalk.cyan(`📥 RAW HEX from ${clientIP}: ${hexData}`));

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

      logger.info(chalk.green(`\n✅ Complete Frame Received from ${clientIP}`));
      logger.debug(chalk.gray(`   Frame: ${frame}`));

      // Decode the frame
      const decoded = decoder.decode(frame);
      
      if (decoded.error) {
        logger.error(chalk.red(`❌ Decode Error: ${decoded.error}`));
      } else {
        logger.info(chalk.blue(`📍 DECODED DATA:`));
        console.log(JSON.stringify(decoded, null, 2));

        // Send ACK to device
        const ack = Buffer.from([0x78, 0x78, 0x05, 0x01, 0x00, 0x00, 0x00, 0x00, 0x7d, 0x0d, 0x0a]);
        socket.write(ack);
        logger.debug(chalk.gray(`✔️  ACK sent to ${clientIP}\n`));

        // Store to database (example)
        if (decoded.location) {
          storeLocationData({
            imei: decoded.imei,
            location: decoded.location,
            clientIP: clientIP,
            clientPort: clientPort,
            receivedAt: new Date()
          });
        }
      }

      // Remove processed frame from buffer
      buffer = buffer.substring(frameLength);
    }
  });

  socket.on('timeout', () => {
    logger.warn(chalk.yellow(`⏱️  Socket timeout for ${clientIP}:${clientPort}`));
    socket.end();
  });

  socket.on('end', () => {
    connectedDevices.delete(clientId);
    logger.info(chalk.yellow(`❌ Device disconnected: ${clientIP}:${clientPort}`));
    logger.info(chalk.gray(`   Active connections: ${connectedDevices.size}\n`));
  });

  socket.on('error', (error) => {
    logger.error(chalk.red(`⚠️  Socket error from ${clientIP}:${clientPort}: ${error.message}`));
    connectedDevices.delete(clientId);
  });
});

/**
 * Store location data (implement with your database)
 */
function storeLocationData(data) {
  // Example: Store to database
  // You can integrate with MongoDB, PostgreSQL, etc.
  
  logger.info(chalk.magenta(`💾 Storing location data:`));
  logger.info(chalk.gray(`   IMEI: ${data.imei}`));
  
  if (data.location && data.location.latitude) {
    logger.info(chalk.gray(`   Latitude: ${data.location.latitude.decimal}° ${data.location.latitude.direction}`));
    logger.info(chalk.gray(`   Longitude: ${data.location.longitude.decimal}° ${data.location.longitude.direction}`));
    logger.info(chalk.gray(`   Altitude: ${data.location.altitude}`));
    logger.info(chalk.gray(`   Speed: ${data.location.speed}`));
    logger.info(chalk.gray(`   Direction: ${data.location.direction}`));
    logger.info(chalk.gray(`   DateTime: ${data.location.dateTime}`));
    logger.info(chalk.gray(`   GPS Status: ${data.location.gpsStatus === 'FIXED' ? chalk.green('FIXED') : chalk.yellow('UNFIXED')}`));
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info(chalk.yellow('\n🛑 Shutting down server gracefully...'));
  
  // Close all connections
  connectedDevices.forEach((device, clientId) => {
    logger.info(chalk.gray(`   Closing connection: ${clientId}`));
  });
  
  server.close(() => {
    logger.info(chalk.green('✅ Server closed'));
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error(chalk.red('⚠️  Forcing shutdown'));
    process.exit(1);
  }, 10000);
});

server.listen(PORT, () => {
  console.log('\n' + chalk.bold.green('═'.repeat(60)));
  console.log(chalk.bold.green('  🚀 GPS TCP Server Started'));
  console.log(chalk.bold.green('═'.repeat(60)));
  logger.info(chalk.cyan(`📡 Listening on port: ${chalk.bold(PORT)}`));
  logger.info(chalk.gray(`⏰ Server time: ${new Date().toISOString()}`));
  logger.info(chalk.gray(`🔧 Node version: ${process.version}`));
  console.log(chalk.bold.green('─'.repeat(60)));
  logger.warn(chalk.yellow('⚠️  GPS Device Requirements:'));
  logger.info(chalk.gray(`   • Clear sky view for GPS acquisition`));
  logger.info(chalk.gray(`   • Wait for GPS:FIXED status`));
  logger.info(chalk.gray(`   • Configure server IP: ${chalk.bold('YOUR_SERVER_IP')}`));
  logger.info(chalk.gray(`   • Configure server port: ${chalk.bold(PORT)}`));
  console.log(chalk.bold.green('═'.repeat(60)) + '\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(chalk.red(`❌ Port ${PORT} is already in use`));
  } else {
    logger.error(chalk.red(`❌ Server error: ${error.message}`));
  }
  process.exit(1);
});
