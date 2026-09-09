# Admin Rooms - Device Control & Alert Threshold Feature

## Overview
Added interactive device control and alert threshold configuration to the `/admin/rooms` page.

## Features Implemented

### 1. On/Off Toggle Button for Each Device
- **Location**: Each room card now has a toggle button in the top-right corner
- **Functionality**: 
  - Green "Turn ON" button when device is off
  - Red "Turn OFF" button when device is on
  - Shows "Toggling..." state while operation is in progress
  - Automatically refreshes room data after toggle
- **Backend**: `POST /api/v1/rooms/:id/relay` with `{ state: "on" | "off" }`
- **Security**: Requires admin authentication

### 2. Alert Threshold Selector
- **Location**: Below the temperature/status grid in each room card
- **Functionality**:
  - Dropdown selector with preset temperature thresholds
  - Options: No alert, 5°C, 10°C, 15°C, 20°C, 25°C, 30°C
  - Shows "Updating..." state while saving
  - Displays description of what the threshold means
- **Backend**: `PUT /api/v1/rooms/:id/alert-threshold` with `{ alertThreshold: number | null }`
- **Security**: Requires admin authentication

### 3. Enhanced Room Display
- Shows real-time data from backend API instead of hardcoded values
- Displays:
  - Room name (Finnish)
  - Device type and ID
  - Current temperature
  - Target temperature
  - Humidity
  - Device online/offline status
  - Critical room warnings (if applicable)

## Database Changes

### Migration 007: Add alert_threshold to rooms
```sql
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS alert_threshold DECIMAL(5,2);
```

**File**: `backend/src/migrations/007_add_alert_threshold_to_rooms.js`

## Backend Changes

### New Controller Methods
1. **toggleRelay** - Toggle device relay on/off
   - File: `backend/src/controllers/roomController.js`
   - Validates state parameter ("on" or "off")
   - Checks room has Shelly device assigned
   - Calls ShellyService.setRelayState()

2. **updateAlertThreshold** - Update room alert threshold
   - File: `backend/src/controllers/roomController.js`
   - Updates alert_threshold column in rooms table
   - Returns updated room object

### New Routes
```javascript
POST /api/v1/rooms/:id/relay          // Toggle relay on/off
PUT  /api/v1/rooms/:id/alert-threshold // Update alert threshold
```

**File**: `backend/src/routes/roomRoutes.js`

### Model Updates
- Added `updateAlertThreshold()` method to Room model
- Updated `create()` method to accept alertThreshold parameter

**File**: `backend/src/models/Room.js`

## Frontend Changes

### AdminRooms.jsx - Complete Rewrite
- **Before**: Static hardcoded room list
- **After**: Dynamic data-driven component with real-time controls

**Key Features**:
- Fetches rooms from API on mount
- Loading and error states
- Individual toggle buttons per room
- Alert threshold dropdown per room
- Real-time status display (temp, humidity, online status)
- Critical room warnings

**File**: `frontend/src/pages/admin/AdminRooms.jsx`

### Service Updates
Added two new methods to roomService:
```javascript
toggleRelay(id, state)
updateAlertThreshold(id, alertThreshold)
```

**File**: `frontend/src/services/roomService.js`

## Testing

### API Tests
```bash
# Toggle relay on
curl -X POST http://localhost:3000/api/v1/rooms/1/relay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state":"on"}'

# Update alert threshold
curl -X PUT http://localhost:3000/api/v1/rooms/1/alert-threshold \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alertThreshold":15}'
```

### UI Testing
1. Navigate to `https://localhost:5173/admin/rooms`
2. Login with admin credentials
3. Verify rooms load with real data
4. Click "Turn ON" / "Turn OFF" buttons
5. Change alert threshold dropdown
6. Verify changes persist after page refresh

## Migration Status
✅ Migration 007 applied successfully
✅ alert_threshold column added to rooms table
✅ All 7 rooms have the new column (currently NULL except room 7 which has 15.00)

## Future Enhancements
- Add alert triggering logic when temperature crosses threshold
- Add email/SMS notifications for alert threshold breaches
- Add historical chart showing when alerts were triggered
- Add bulk operations (turn all devices on/off)
- Add device scheduling (auto on/off at specific times)
