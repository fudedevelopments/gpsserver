# GPS Tracker R12 - Troubleshooting Guide

## Current Status: GPS FIXED ✓

According to your SMS response, GPS is now FIXED with 9 satellites. You should start receiving full location data soon!

## Understanding the Messages

### Short Messages (13 bytes) - Status/Heartbeat
```
78780d0103577189512272510008f1090d0a
```
- **Length**: 13 bytes (0x0d)
- **Type**: Status message - GPS not ready yet
- **Contains**: IMEI + sequence number only
- **Reason**: GPS hasn't acquired satellite lock (GPS:UNFIXED)

### Full Messages (28+ bytes) - Location Data
```
7878
1d                      # Length: 29 bytes
01                      # Type: Location Report
03577189512272510      # IMEI
0603a0c0               # Latitude
0763da40               # Longitude
01f4                   # Altitude
0012                   # Speed
00b4                   # Direction
1a010a0b0c             # DateTime
00                     # Status (GPS FIXED)
7c                     # Checksum
0d0a                   # End marker
```

## What's Happening Now?

### Stage 1: Initial Connection (COMPLETED ✓)
- Device connects to server
- Sends short status messages (13 bytes)
- GPS shows UNFIXED in SMS
- **This is normal** - waiting for GPS lock

### Stage 2: GPS Lock Acquired (CURRENT STATE)
- SMS shows: `GPS:FIXED,SVS Used in fix:9`
- 9 satellites locked ✓
- Signal strength: Good (30s range)
- **Device should now send full location data**

### Stage 3: Full Location Data (WAITING)
- Device will send 28+ byte messages
- Contains: Latitude, Longitude, Speed, Direction, Altitude
- Server will decode and display full GPS coordinates

## Next Steps

### 1. Wait for Full GPS Data (5-10 minutes)
After GPS is FIXED, the device needs time to:
- Stabilize satellite connections
- Calculate accurate position
- Send first full location report

### 2. Monitor Server Logs
Watch for messages like:
```
✅ Complete Frame Received from ::ffff:106.195.xx.xx
📍 DECODED DATA:
{
  "messageType": "LocationReport",
  "imei": "357718951227251",
  "location": {
    "latitude": {...},
    "longitude": {...},
    "gpsStatus": "FIXED"  ← Look for this!
  }
}
```

### 3. Check GPS Settings on Device

#### Send SMS Command to Check Settings:
```
STATUS#
```

#### Important Settings:
- **TIMER**: Should be set (e.g., 10,10 for 10 second intervals)
- **SENDS**: Number 3 means 3 attempts per upload
- **HBT**: Heartbeat interval
- **CENTER**: Server IP should be configured

#### Configure Upload Interval (if needed):
```
TIMER,10,10#
```
This sets GPS to upload every 10 seconds

#### Set Server Address (if not set):
```
SERVER,1,YOUR_SERVER_IP,8503,0#
```
Replace YOUR_SERVER_IP with your actual server IP

## Current Device Configuration

From your SMS data:
```
IMEI: 357718951227251
IMSI: 404940932841695
TIMER: 10,10         ← Uploads every 10 seconds
SENDS: 3             ← 3 retry attempts
HBT: 3,3             ← Heartbeat every 3 minutes
SOS: Not configured
GPS: FIXED ✓         ← Ready to send location
Satellites: 9        ← Good signal
```

## Expected Timeline

| Time | Status | Message Type |
|------|--------|--------------|
| 0-5 min | GPS acquiring | Short messages (13 bytes) |
| 5-10 min | GPS FIXED ✓ | Still short messages |
| 10-15 min | First location | **Full message (28+ bytes)** |
| 15+ min | Regular updates | Location every 10 seconds |

## Troubleshooting

### If Still Receiving Short Messages After 15 Minutes:

1. **Check Device Timer Setting**
   ```
   Send SMS: TIMER,30,30#
   ```
   This forces upload every 30 seconds

2. **Restart GPS Module**
   ```
   Send SMS: RESET#
   ```

3. **Check GPRS Connection**
   - Your SMS shows: `GPRS:Link Down`
   - This might be blocking uploads!
   - Device needs GPRS connection to send TCP data

### IMPORTANT: Fix GPRS Connection!

Your device shows `GPRS:Link Down` - this is the issue!

#### Configure APN Settings:
```
APN,your_apn_name,apn_username,apn_password#
```

For common Indian carriers:
- **Airtel**: `APN,airtelgprs.com,,#`
- **Vodafone**: `APN,www,,#`
- **Jio**: `APN,jionet,,#`
- **BSNL**: `APN,bsnlnet,,#`

#### After Setting APN:
```
RESET#
```

Then check status:
```
STATUS#
```

Look for: `GPRS:Link Up` or `PPP_STATE:3`

## Monitoring Commands

### Real-time Server Monitoring:
```bash
# On your Ubuntu server
cd ~/gpsserver
npm start

# Watch for full location messages
# Press CTRL+C to stop
```

### Check Server Logs:
```bash
tail -f logs/combined.log
```

## Success Indicators

You'll know it's working when you see:

1. ✅ Message length: 28+ bytes (not 13)
2. ✅ GPS Status: "FIXED" in decoded data
3. ✅ Latitude/Longitude values present
4. ✅ Speed, direction, altitude shown
5. ✅ GPRS: Link Up in SMS status

## Support

If issues persist after fixing GPRS:
1. Check device has clear sky view
2. Ensure battery is charged (3.85V is good)
3. Verify server firewall allows TCP port 8503
4. Check device manual for specific commands

---

**Current Issue**: GPRS is down - Device can't send data over internet
**Solution**: Configure APN settings for your SIM card
**Status**: GPS is FIXED and ready, just needs internet connection
