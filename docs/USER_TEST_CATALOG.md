# User Testing Guide: Catalog Integration

## Prerequisites
- Have the MCP Configuration Manager running (`npm run electron:dev`)
- Have at least one AI client installed (Claude Desktop, VS Code, etc.)

---

## Test 1: Install Server from Discovery → Appears in Catalog

### Steps:
1. **Open the app**
2. **Click the rocket icon** (🚀) in the left sidebar to open Discovery page
3. **Look at any server card** - note if it has an "Installed" badge or not
4. **Click on a server card that does NOT have "Installed" badge**
5. **In the popup modal, click the blue "Install Server" button**
6. **Wait for installation** (you'll see "Installing..." status)
7. **Once complete, click the X or outside the modal to close it**
8. **Click the home icon** (🏠) in the left sidebar to go back to main page
9. **Select "Claude Desktop" from the Client dropdown** (or any installed client)
10. **Click the "Add Server" button** (should now have a small number badge)

### Expected Results:
✅ The "Add Server" button shows a badge with a number (e.g., "1" or higher)
✅ The Add Server modal opens
✅ You see a blue info box titled "Quick Add from Catalog"
✅ The dropdown in the blue box contains the server you just installed

---

## Test 2: Use Catalog to Add Server to Configuration

### Steps:
1. **In the Add Server modal** (from Test 1 Step 10)
2. **Click the dropdown that says "Select a server from catalog..."**
3. **Select the server you installed** (it will show name, type, and description)
4. **Watch the form fields below** - they should auto-fill with:
   - Server Name
   - Command (e.g., "npx")
   - Arguments (if any)
   - Environment variables (if any)
5. **Click the blue "Add Server" button** at bottom of modal
6. **Look at the server list table**

### Expected Results:
✅ All form fields auto-populate when you select from dropdown
✅ The modal closes after clicking Add Server
✅ The new server appears in the servers table
✅ The dirty indicator appears (showing unsaved changes)

---

## Test 3: Catalog Badge Count

### Steps:
1. **Note the current badge number** on the "Add Server" button
2. **Click the rocket icon** (🚀) to go back to Discovery
3. **Find another server that's NOT installed**
4. **Click on it and install it** (click card → click Install Server → wait)
5. **Go back to main page** (click home icon 🏠)
6. **Look at the "Add Server" button badge**

### Expected Results:
✅ The badge number increased by 1
✅ If you had "2" before, it now shows "3"

---

## Test 4: Uninstall Server → Removed from Catalog

### Steps:
1. **Go to Discovery page** (rocket icon 🚀)
2. **Find a server with "Installed" badge** (green badge in top-right of card)
3. **Click on that server card**
4. **In the modal, click the red "Uninstall Server" button**
5. **Wait for uninstallation to complete**
6. **Close the modal**
7. **Go back to main page** (home icon 🏠)
8. **Click "Add Server" button**
9. **Check the catalog dropdown**

### Expected Results:
✅ The uninstalled server is NO LONGER in the dropdown
✅ The badge count decreased by 1

---

## Test 5: Catalog Persists After Refresh

### Steps:
1. **Note how many servers are in catalog** (badge number on Add Server button)
2. **Refresh the entire app** (Cmd+R on Mac, Ctrl+R on Windows)
3. **Wait for app to reload**
4. **Select a client from dropdown** (e.g., Claude Desktop)
5. **Check the "Add Server" button**

### Expected Results:
✅ The badge still shows the same number
✅ Clicking Add Server still shows all catalog servers in dropdown

---

## Test 6: Multiple Clients Can Use Same Catalog

### Steps:
1. **Select "Claude Desktop" from Client dropdown**
2. **Click "Add Server"**
3. **Select any server from catalog dropdown**
4. **Click blue "Add Server" button**
5. **Click "Save" to save configuration**
6. **Now switch to different client** (e.g., select "VS Code" from dropdown)
7. **Click "Add Server"**
8. **Check the catalog dropdown**

### Expected Results:
✅ The same catalog servers are available for ALL clients
✅ You can add the same server to multiple clients

---

## Test 7: Visual Feedback

### Check these visual elements:
1. **Badge on Add Server button**
   - ✅ Shows number of catalog servers
   - ✅ Updates when servers added/removed

2. **Catalog dropdown in Add Server modal**
   - ✅ Only appears when catalog has servers
   - ✅ Shows server name, type, and description
   - ✅ Has blue info styling

3. **Server cards in Discovery**
   - ✅ Show "Installed" badge for catalog servers
   - ✅ Show "Installing..." during installation
   - ✅ Install button changes to Uninstall for installed servers

---

## Quick Validation Checklist

- [ ] Can install server from Discovery
- [ ] Installed server appears in catalog dropdown
- [ ] Selecting from catalog auto-fills form
- [ ] Badge count is accurate
- [ ] Uninstalling removes from catalog
- [ ] Catalog persists after refresh
- [ ] All clients can access same catalog
- [ ] Visual indicators work correctly

---

## Troubleshooting

### If catalog dropdown doesn't appear:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `localStorage.getItem('mcp-server-catalog')`
4. Press Enter - should show catalog contents

### If server doesn't appear after installation:
1. Check DevTools Console for errors
2. Look for message: `[Discovery Store] Added server to catalog:`
3. Try refreshing the page (Cmd/Ctrl + R)

### To manually check catalog contents:
1. Open DevTools Console (F12)
2. Paste and run:
```javascript
const cat = localStorage.getItem('mcp-server-catalog');
console.table(cat ? JSON.parse(cat) : {});
```

---

## Report Issues

If any test fails, note:
1. Which test number failed
2. What you expected to happen
3. What actually happened
4. Any error messages in console (F12 → Console tab)