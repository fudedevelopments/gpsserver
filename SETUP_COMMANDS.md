# GPS R12 - Quick Setup Commands

## ✅ Your Current Settings (CORRECT!)
```
GPRS: ON
APN: airtelgprs.com
Server: 13.126.244.130:8503
GPS: FIXED with 9 satellites
```

## ❌ Problem
Device is sending only STATUS messages (18 bytes), not LOCATION data (28+ bytes)

## 🔧 Solution - Enable Tracking Mode

### Step 1: Enable Continuous Tracking
Send SMS to your GPS device:
```
TRACKER,1#
```
Response: `TRACKER OK`

This enables continuous GPS tracking mode.

### Step 2: Set Upload Interval (30 seconds)
```
TIMER,30,30#
```
Response: `TIMER OK`

This makes device upload location every 30 seconds.

### Step 3: Force Immediate Location Send
```
SEND#
```
Response: Device will immediately send location to server

### Step 4: Verify Settings
```
STATUS#
```

Look for:
- `TRACKER: ON` or `MODE: TRACKER`
- `TIMER: 30,30`
- `GPS: FIXED`
- `GPRS: Link Up`

## Alternative Commands (If Above Don't Work)

### Try Fix Command:
```
FIX,30,S#
```
This sends location every 30 seconds.

### Or Use Track Command:
```
TRACK,30#
```

### Check Mode:
```
PARAM#
```
This shows all parameters.

## Expected Result

After sending these commands, within 1-2 minutes you should see:

**Server Output:**
```
✅ Complete Frame Received from ::ffff:106.195.xx.xx
📦 RAW DATA: 78781d01... (much longer - 58+ characters)
📏 Length: 29 bytes (or more)
📍 DECODED:
{
  "messageType": "LocationReport",
  "imei": "357718951227251",
  "location": {
    "latitude": {
      "decimal": "XX.XXXXXX",
      "direction": "N"
    },
    "longitude": {
      "decimal": "XX.XXXXXX",
      "direction": "E"
    },
    "speed": "X km/h",
    "altitude": "XX meters",
    "gpsStatus": "FIXED"
  }
}
```

## Troubleshooting

### If Still Getting 18 Bytes:

1. **Restart Device:**
   ```
   RESET#
   ```

2. **Wait 2-3 minutes** for GPS to stabilize

3. **Force send location:**
   ```
   SEND#
   ```

4. **Check device manual** for specific tracking command

### If Device Disconnects Immediately:

Some R12 devices only connect when they have data to send. This is normal.
After enabling TRACKER mode, they should connect every 30 seconds.

## Test Location via SMS

To verify GPS is working, request location via SMS:
```
WHERE#
```

You should get SMS response with:
```
http://maps.google.com/maps?q=XX.XXXXXX,XX.XXXXXX
Lat:XX.XXXXXX,N;
Lon:XX.XXXXXX,E;
Speed:XX km/h;
...
```

If SMS location works but server doesn't receive it, the issue is in tracking mode configuration.

## Summary

1. ✅ Server is configured correctly
2. ✅ GPRS is configured correctly  
3. ✅ GPS has satellite lock (FIXED)
4. ❌ **Missing: Tracking mode not enabled**

**Send:** `TRACKER,1#` and `TIMER,30,30#` then `SEND#`

This will make the device start sending full location data!
