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
        return { error: 'Invalid frame start marker' };
      }

      const frameLength = bytes[2];
      const messageType = bytes[3];

      // Type 01 = Location Report
      if (messageType === 0x01) {
        return this.decodeLocationReport(bytes);
      }
      // Type 04 = Heartbeat
      else if (messageType === 0x04) {
        return this.decodeHeartbeat(bytes);
      }

      return {
        error: `Unknown message type: 0x${messageType.toString(16)}`,
        messageType: messageType
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Decode location report (message type 01)
   */
  decodeLocationReport(bytes) {
    const result = {
      messageType: 'LocationReport',
      timestamp: new Date().toISOString()
    };

    try {
      // Extract IMEI (bytes 4-11, 8 bytes)
      const imeiBytes = bytes.slice(4, 12);
      result.imei = this.bytesToString(imeiBytes);

      // Check minimum length for location data
      if (bytes.length < 28) {
        result.warning = 'Message too short for full location data';
        return result;
      }

      // Parse location data (starts at byte 12)
      let offset = 12;

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
      result.location = {
        latitude: this.formatCoordinate(latRaw, isNorth, 'latitude'),
        longitude: this.formatCoordinate(lonRaw, isEast, 'longitude'),
        altitude: altitude + ' meters',
        speed: speed + ' km/h',
        direction: direction + ' degrees',
        dateTime: dateTime,
        gpsStatus: (status & 0x04) ? 'UNFIXED' : 'FIXED'
      };

      return result;
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Decode heartbeat message (message type 04)
   */
  decodeHeartbeat(bytes) {
    return {
      messageType: 'Heartbeat',
      imei: this.bytesToString(bytes.slice(4, 12)),
      timestamp: new Date().toISOString()
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
