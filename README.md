# GPS Tracker R12 - TCP Server

A Node.js TCP server for receiving and decoding GPS location data from GPS Tracker R12 devices using the JT808 protocol.

## Features

- ✅ TCP server for GPS device communication
- ✅ JT808 protocol decoder
- ✅ Real-time location data parsing
- ✅ IMEI device identification
- ✅ GPS status monitoring (FIXED/UNFIXED)
- ✅ Automatic ACK responses to device
- ✅ Checksum verification

## Prerequisites

- Node.js 14.x or higher
- GPS Tracker R12 device
- Network connectivity between server and GPS device

## Installation

1. Clone or download this repository
2. Install dependencies (if any are added later):
```bash
npm install
```

## Configuration

### Server Settings

Edit `server.js` to change:
- **PORT**: Default is `8503`

### GPS Device Configuration

Configure your GPS Tracker R12 with:
- **Server IP**: Your server's IP address
- **Server Port**: `8503` (or your custom port)
- **Protocol**: TCP
- **GPS Mode**: Ensure clear sky view for GPS acquisition

## Usage

### Start the Server

```bash
npm start
```

Or:

```bash
node server.js
```

### Expected Output

When the server starts:
```
🚀 GPS TCP Server listening on port 8503
📡 Ready to receive data from GPS tracker R12
⚠️  Ensure your GPS device has:
   - Clear sky view for GPS acquisition
   - GPS:FIXED status (currently showing UNFIXED)
   - Server IP configured in device settings
```

When a device connects and sends data:
```
🔌 Device connected: ::ffff:192.168.1.100
📥 RAW HEX: 78780d0103577189512272510008f1090d0a

✅ Complete Frame Received:
   Frame: 78780d0103577189512272510008f1090d0a

📍 DECODED DATA:
{
  "messageType": "LocationReport",
  "timestamp": "2026-01-10T17:03:45.817Z",
  "imei": "3075179815222715",
  "location": {
    "latitude": {
      "decimal": "-3.503509",
      "direction": "S",
      "raw": 6306316
    },
    "longitude": {
      "decimal": "-4.305016",
      "direction": "W",
      "raw": 7749028
    },
    "altitude": "31 meters",
    "speed": "1638.5 km/h",
    "direction": "8203 degrees",
    "dateTime": "2078-04-22T13:29:12.000Z",
    "gpsStatus": "FIXED"
  }
}

✔️  ACK sent to device
```

## Project Structure

```
gpsserver/
├── server.js           # TCP server implementation
├── gps_decoder.js      # JT808 protocol decoder
├── package.json        # Project configuration
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Protocol Information

### Message Types

- **0x01**: Location Report - Contains GPS coordinates, speed, direction, and status
- **0x04**: Heartbeat - Keep-alive message from device

### Frame Structure

```
[Start][Length][Type][Data...][Checksum][End]
  7878    XX     XX    ...       XX     0D0A
```

### Location Data Format

- **Latitude/Longitude**: Stored as integers, divided by 1,800,000 for decimal degrees
- **Speed**: In 0.1 km/h units
- **Direction**: 0-360 degrees
- **Altitude**: In meters
- **GPS Status**: FIXED (accurate) or UNFIXED (no GPS lock)

## Database Integration

The `storeLocationData()` function in `server.js` is ready for database integration. You can connect it to:

- MongoDB
- PostgreSQL
- MySQL
- SQLite
- Any other database of your choice

Example integration point:
```javascript
function storeLocationData(data) {
  // Add your database code here
  // db.collection('locations').insertOne(data);
}
```

## Troubleshooting

### GPS Shows UNFIXED Status
- Ensure device has clear view of the sky
- Wait 1-5 minutes for GPS signal acquisition
- Check device antenna connection

### Device Not Connecting
- Verify server IP and port configuration in device
- Check firewall settings
- Ensure network connectivity

### No Data Received
- Check device power and network connection
- Verify TCP settings in device configuration
- Monitor server logs for connection attempts

## License

MIT

## Support

For issues or questions, please check:
- Device documentation
- JT808 protocol specifications
- Server logs for error messages
