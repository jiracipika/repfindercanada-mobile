# Fix iOS Icon - Remove White Border

## Problem
The current iOS app icon has rounded corners with transparency, which shows as white space on iOS devices. iOS automatically applies rounded corners, so the icon should be a **perfect square** with the blue background extending to all edges.

## Current Icon Issues
- Has pre-applied rounded corners (should be square)
- Has alpha transparency in corners (causes white space)
- Dimensions: 516x483 (not perfectly square 1024x1024)

## Solution Options

### Option 1: Quick Fix (Recommended)
Use an online tool to create a square version:

1. Go to https://www.figma.com or https://www.photopea.com
2. Create a new 1024x1024 canvas
3. Fill entire canvas with blue background: `#2C5F8D`
4. Place the Canada map with person icon centered
5. Export as PNG (no transparency)
6. Replace: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`

### Option 2: Use Capacitor Assets Generator
```bash
# Install capacitor assets tool
npm install -g @capacitor/assets

# Create a square source icon (1024x1024 PNG, no rounded corners)
# Save as: resources/icon-square.png

# Generate all sizes
npx @capacitor/assets generate --iconBackgroundColor '#2C5F8D' --iconBackgroundColorDark '#2C5F8D'
```

### Option 3: Manual Edit with Preview (macOS)
1. Open `resources/icon.png` in Preview
2. Tools → Adjust Size → 1024x1024 (uncheck "Scale proportionally")
3. Tools → Annotate → Rectangle
4. Fill corners with blue (#2C5F8D) to make perfect square
5. Export as PNG
6. Save as `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`

## Key Requirements for iOS Icons
- ✅ Must be **exactly 1024x1024 pixels**
- ✅ Must be **perfectly square** (no rounded corners)
- ✅ Should **NOT have transparency**
- ✅ Background should extend to all edges
- ✅ iOS will apply its own rounded corners automatically

## After Fixing
1. Clean and rebuild the iOS project:
```bash
cd ios/App
rm -rf DerivedData
```

2. Rebuild in Xcode or via Capacitor:
```bash
npx cap sync ios
npx cap open ios
```

3. Clean build in Xcode: Product → Clean Build Folder (⌘⇧K)
4. Build and run on device

## Current File Location
- iOS Icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
- Backup: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x-backup.png`
