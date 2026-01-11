const net = require("net");
const GPSDecoder = require("./gps_decoder");

const PORT = 8503;
const decoder = new GPSDecoder();

// CRC-ITU (X25) as required by GT06
function crc16X25(buffer) {
  let crc = 0xffff;
  for (const b of buffer) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 1) ? (crc >> 1) ^ 0x8408 : crc >> 1;
    }
  }
  crc = (~crc) & 0xffff;
  return Buffer.from([(crc >> 8) & 0xff, crc & 0xff]);
}

const server = net.createServer(socket => {
  console.log("🔌 Device connected:", socket.remoteAddress);

  socket.on("data", data => {
    const hex = data.toString("hex");
    console.log("\n📥 RAW HEX:", hex);
    
    // Identify protocol and message type
    const decoded = decoder.decode(hex);
    
    if (decoded.protocol) {
      console.log("🔍 PROTOCOL:", decoded.protocol.name);
      console.log("📋 MESSAGE TYPE:", decoded.protocol.messageType, `(0x${decoded.protocol.messageTypeHex || '??'})`);
    }
    
    if (decoded.dataFields) {
      console.log("📊 DATA:");
      decoded.dataFields.forEach(field => {
        console.log(`   • ${field.name}: ${field.value}${field.unit ? ' ' + field.unit : ''}`);
      });
    }

    // LOGIN packet (0x01) - Send proper ACK with CRC
    if (data[0] === 0x78 && data[1] === 0x78 && data[3] === 0x01) {
      const serial = data.slice(12, 14); // Information Serial Number
      
      // Build ACK body: Length + Protocol + Serial
      const ackBody = Buffer.concat([
        Buffer.from([0x05, 0x01]),
        serial
      ]);
      
      const crc = crc16X25(ackBody);
      
      const ackPacket = Buffer.concat([
        Buffer.from([0x78, 0x78]),
        ackBody,
        crc,
        Buffer.from([0x0d, 0x0a])
      ]);
      
      socket.write(ackPacket);
      console.log("📤 LOGIN ACK SENT:", ackPacket.toString("hex"));
    }
    // LOCATION or HEARTBEAT - Send simple ACK
    else if (data[0] === 0x78 && data[1] === 0x78) {
      const serial = data.slice(data.length - 6, data.length - 4);
      const ackBody = Buffer.concat([
        Buffer.from([0x05, data[3]]), // echo protocol number
        serial
      ]);
      const crc = crc16X25(ackBody);
      const ackPacket = Buffer.concat([
        Buffer.from([0x78, 0x78]),
        ackBody,
        crc,
        Buffer.from([0x0d, 0x0a])
      ]);
      socket.write(ackPacket);
      console.log("📤 ACK SENT:", ackPacket.toString("hex"));
    }
  });

  socket.on("end", () => console.log("❌ Device disconnected\n"));
  socket.on("error", (err) => console.log("⚠️ Error:", err.message));
});

server.listen(PORT, () => {
  console.log(`🚀 GPS TCP Server listening on port ${PORT}`);
});
