/**
 * GPS Tracker R12 - JT808 Protocol Decoder
 * Decodes hex data from GPS tracker to extract location, speed, and status
 */

class GPSDecoder {
  constructor() {
    this.FRAME_START = 0x7878;
    this.FRAME_END = 0x0d0a;
  }

  /**
   * Main decoder function
   * @param {string} hexString - Raw hex string from GPS device
   * @returns {object} Decoded location data
   */
  decode(hexString) {
    try {
      // Remove spaces and convert to uppercase
      const cleanHex = hexString.toUpperCase().replace(/\s/g, '');
      const bytes = this.hexStringToBytes(cleanHex);

      // Validate frame
      if (bytes[0] !== 0x78 || bytes[1] !== 0x78) {
        return { 
          error: 'Invalid frame start marker',
          protocol: {
            name: 'Unknown',
            standard: 'Unable to identify',
            detected: false
          }
        };
      }

      const frameLength = bytes[2];
      const messageType = bytes[3];

      // Add protocol identification
      const protocolInfo = {
        name: 'JT808/GT06 Protocol',
        standard: 'Chinese GB/T 30428-2013',
        vendor: 'Concox (GT06N/GPS Tracker R12)',
        frameStart: '0x7878',
        frameEnd: '0x0D0A',
        detected: true,
        messageType: this.getMessageTypeName(messageType),
        messageTypeHex: messageType.toString(16).padStart(2, '0').toUpperCase()
      };

      // Type 01 = Location Report
      if (messageType === 0x01) {
        return this.decodeLocationReport(bytes, protocolInfo);
      }
      // Type 04 = Heartbeat
      else if (messageType === 0x04) {
        return this.decodeHeartbeat(bytes, protocolInfo);
      }

      return {
        error: `Unknown message type: 0x${messageType.toString(16)}`,
        protocol: protocolInfo,
        messageType: messageType
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get human-readable message type name
   */
  getMessageTypeName(messageType) {
    const types = {
      0x01: 'Location Report',
      0x04: 'Heartbeat/Status',
      0x10: 'Login Message',
      0x13: 'Status Information',
      0x15: 'Command Response',
      0x16: 'Alarm Data',
      0x80: 'LBS Data'
    };
    return types[messageType] || `Unknown (0x${messageType.toString(16)})`;
  }

  /**
   * Decode location report (message type 01)
   */
  decodeLocationReport(bytes, protocolInfo) {
    const result = {
      protocol: protocolInfo,
      messageType: 'LocationReport',
      timestamp: new Date().toISOString(),
      dataFields: []
    };

    try {
      // Extract IMEI (bytes 4-11, 8 bytes)
      const imeiBytes = bytes.slice(4, 12);
      result.imei = this.bytesToString(imeiBytes);
      result.dataFields.push({
        name: 'IMEI',
        value: result.imei,
        description: 'Device identifier'
      });

      // Extract sequence number (2 bytes after IMEI)
      if (bytes.length >= 14) {
        result.sequenceNumber = this.readUInt16BE(bytes, 12);
        result.dataFields.push({
          name: 'Sequence Number',
          value: result.sequenceNumber,
          description: 'Message sequence counter'
        });
      }

      // Add raw frame info
      result.dataFields.push({
        name: 'Frame Length',
        value: bytes.length,
        unit: 'bytes',
        description: 'Total frame size'
      });

      // Check minimum length for location data
      // Full location message should be at least 28 bytes
      if (bytes.length < 28) {
        result.status = 'GPS_NOT_READY';
        result.message = 'Device connected but GPS has no satellite lock yet';
        result.advice = 'Wait for GPS to acquire satellites (GPS:FIXED). Ensure device has clear sky view.';
        result.messageLength = bytes.length;
        result.expectedLength = '28+ bytes for full GPS data';
        return result;
      }

      // Parse location data (starts at byte 12 after sequence number)
      let offset = 14; // After IMEI (8 bytes) + sequence (2 bytes) + header (4 bytes)

      // Latitude (4 bytes, big-endian)
      const latRaw = this.readUInt32BE(bytes, offset);
      offset += 4;

      // Longitude (4 bytes, big-endian)
      const lonRaw = this.readUInt32BE(bytes, offset);
      offset += 4;

      // Altitude (2 bytes, big-endian)
      const altitude = this.readUInt16BE(bytes, offset);
      offset += 2;

      // Speed (2 bytes, big-endian) - in 0.1 km/h units
      const speedRaw = this.readUInt16BE(bytes, offset);
      const speed = speedRaw * 0.1;
      offset += 2;

      // Direction (2 bytes, big-endian) - 0-360 degrees
      const direction = this.readUInt16BE(bytes, offset);
      offset += 2;

      // DateTime (6 bytes: YY MM DD HH MM SS)
      const dateTime = this.readDateTime(bytes, offset);
      offset += 6;

      // Status byte
      const status = bytes[offset];

      // Extract direction info from status bit 0
      const isNorth = (status & 0x01) === 0;
      const isEast = (status & 0x02) === 0;

      // Convert coordinates
      // Formula: value / 1800000 = decimal degrees
      const lat = this.formatCoordinate(latRaw, isNorth, 'latitude');
      const lon = this.formatCoordinate(lonRaw, isEast, 'longitude');
      const gpsStatus = (status & 0x04) ? 'UNFIXED' : 'FIXED';
      
      result.location = {
        latitude: lat,
        longitude: lon,
        altitude: altitude + ' meters',
        speed: speed + ' km/h',
        direction: direction + ' degrees',
        dateTime: dateTime,
        gpsStatus: gpsStatus
      };

      // Add all location fields to dataFields array
      result.dataFields.push(
        {
          name: 'Latitude',
          value: `${lat.decimal}° ${lat.direction}`,
          description: 'GPS latitude coordinate'
        },
        {
          name: 'Longitude',
          value: `${lon.decimal}° ${lon.direction}`,
          description: 'GPS longitude coordinate'
        },
        {
          name: 'Altitude',
          value: altitude,
          unit: 'meters',
          description: 'Height above sea level'
        },
        {
          name: 'Speed',
          value: speed.toFixed(1),
          unit: 'km/h',
          description: 'Ground speed'
        },
        {
          name: 'Direction',
          value: direction,
          unit: 'degrees',
          description: 'Course over ground (0-360°)'
        },
        {
          name: 'GPS Date/Time',
          value: dateTime,
          description: 'GPS timestamp'
        },
        {
          name: 'GPS Status',
          value: gpsStatus,
          description: 'Satellite lock status'
        },
        {
          name: 'Satellites',
          value: (status >> 4) & 0x0F,
          description: 'Number of satellites in view'
        }
      );

      return result;
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Decode heartbeat message (message type 04)
   */
  decodeHeartbeat(bytes, protocolInfo) {
    const imei = this.bytesToString(bytes.slice(4, 12));
    return {
      protocol: protocolInfo,
      messageType: 'Heartbeat',
      imei: imei,
      timestamp: new Date().toISOString(),
      dataFields: [
        {
          name: 'IMEI',
          value: imei,
          description: 'Device identifier'
        },
        {
          name: 'Frame Length',
          value: bytes.length,
          unit: 'bytes',
          description: 'Total frame size'
        },
        {
          name: 'Status',
          value: 'Device is alive and connected',
          description: 'Heartbeat indicates active connection'
        }
      ]
    };
  }

  /**
   * Convert hex string to byte array
   */
  hexStringToBytes(hex) {
    const result = [];
    for (let i = 0; i < hex.length; i += 2) {
      result.push(parseInt(hex.substr(i, 2), 16));
    }
    return result;
  }

  /**
   * Convert bytes to IMEI string
   */
  bytesToString(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      // Swap nibbles for IMEI format
      const low = (byte & 0x0F).toString();
      const high = ((byte >> 4) & 0x0F).toString();
      result += low + high;
    }
    return result;
  }

  /**
   * Read 32-bit big-endian unsigned integer
   */
  readUInt32BE(bytes, offset) {
    return (
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]
    );
  }

  /**
   * Read 16-bit big-endian unsigned integer
   */
  readUInt16BE(bytes, offset) {
    return (bytes[offset] << 8) | bytes[offset + 1];
  }

  /**
   * Parse datetime (6 bytes: YY MM DD HH MM SS)
   */
  readDateTime(bytes, offset) {
    const year = 2000 + bytes[offset];
    const month = bytes[offset + 1];
    const day = bytes[offset + 2];
    const hour = bytes[offset + 3];
    const minute = bytes[offset + 4];
    const second = bytes[offset + 5];

    return new Date(year, month - 1, day, hour, minute, second).toISOString();
  }

  /**
   * Format coordinate to decimal degrees
   */
  formatCoordinate(value, isPositive, type) {
    // Divide by 1800000 to get decimal degrees
    const degrees = value / 1800000;

    // Apply direction
    const finalDegrees = isPositive ? degrees : -degrees;

    const direction =
      type === 'latitude'
        ? isPositive ? 'N' : 'S'
        : isPositive ? 'E' : 'W';

    return {
      decimal: finalDegrees.toFixed(6),
      direction: direction,
      raw: value
    };
  }

  /**
   * Verify checksum (XOR of all bytes between frame markers)
   */
  verifyChecksum(hexString) {
    const bytes = this.hexStringToBytes(hexString);
    // Checksum is second-to-last byte
    const checksumByte = bytes[bytes.length - 2];

    // Calculate XOR of message body
    let calculated = 0;
    for (let i = 3; i < bytes.length - 3; i++) {
      calculated ^= bytes[i];
    }

    return {
      received: checksumByte,
      calculated: calculated,
      valid: checksumByte === calculated
    };
  }
}

module.exports = GPSDecoder;
