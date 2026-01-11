class GPSDecoder {

  decode(hexString) {
    const bytes = this.hexToBytes(hexString);
    const messageType = bytes[3];
    
    const messageTypes = {
      0x01: 'Login',
      0x12: 'Location',
      0x13: 'Heartbeat',
      0x15: 'Command Response',
      0x16: 'Alarm'
    };

    const result = {
      protocol: {
        name: 'GT06',
        messageType: messageTypes[messageType] || 'Unknown',
        messageTypeHex: messageType.toString(16).padStart(2, '0')
      },
      dataFields: []
    };

    // Extract IMEI
    const imei = this.bytesToIMEI(bytes.slice(4, 12));
    result.dataFields.push({ name: 'IMEI', value: imei });

    // LOGIN (0x01)
    if (messageType === 0x01) {
      const serial = (bytes[12] << 8) | bytes[13];
      result.dataFields.push({ name: 'Serial Number', value: serial });
      return result;
    }

    // LOCATION (0x12)
    if (messageType === 0x12) {
      const lat = this.readInt32BE(bytes, 11) / 1800000;
      const lon = this.readInt32BE(bytes, 15) / 1800000;
      const speed = bytes[19];
      const course = ((bytes[20] << 8) | bytes[21]) & 0x3FF;
      
      result.dataFields.push(
        { name: 'Latitude', value: lat.toFixed(6), unit: '°' },
        { name: 'Longitude', value: lon.toFixed(6), unit: '°' },
        { name: 'Speed', value: speed, unit: 'km/h' },
        { name: 'Course', value: course, unit: '°' }
      );
      return result;
    }

    // HEARTBEAT (0x13)
    if (messageType === 0x13) {
      result.dataFields.push({ name: 'Status', value: 'Device online' });
      return result;
    }

    return result;
  }

  bytesToIMEI(bytes) {
    let imei = '';
    for (let i = 0; i < bytes.length; i++) {
      imei += (bytes[i] & 0x0F).toString() + ((bytes[i] >> 4) & 0x0F).toString();
    }
    return imei;
  }

  readInt32BE(bytes, offset) {
    return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | 
           (bytes[offset + 2] << 8) | bytes[offset + 3];
  }

  hexToBytes(hex) {
    const clean = hex.replace(/\s/g, '');
    const result = [];
    for (let i = 0; i < clean.length; i += 2) {
      result.push(parseInt(clean.substr(i, 2), 16));
    }
    return result;
  }
}

module.exports = GPSDecoder;
