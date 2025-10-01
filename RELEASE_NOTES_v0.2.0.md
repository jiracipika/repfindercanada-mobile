# Release Notes - Version 0.2.0

**Release Date:** 2025-10-01
**Build:** 400003

## 🎉 What's New

### Multiple Saved Representatives
- Users can now save **unlimited representatives** to their favorites
- No more single-rep limit - build your complete list of contacts
- Duplicate prevention ensures each representative is only saved once

### Interactive Heart/Save Button
- **Tap the heart icon** on any representative card to save or remove them
- **Solid red heart** = Saved (tap to remove from saved list)
- **Outline gray heart** = Not saved (tap to add to saved list)
- Works everywhere: Home search results, Saved page, and profile views

### Live Activity Tracking
- **Profile now shows total search count** in the header: "Your Activity — N searches"
- Search count and saved rep count **update in real-time** without refresh
- All searches (postal code and name) are automatically tracked

### Real-Time UI Updates
- Event-driven architecture ensures instant updates across all screens
- Save/unsave a rep on one screen, see it update everywhere immediately
- No manual refresh needed - the app stays in sync automatically

## 🔧 Technical Improvements

### Event System
- Implemented `savedRepsChanged` and `activityLogChanged` custom DOM events
- All storage operations emit events for reactive UI updates
- Subscriptions clean up properly on component unmount

### Storage Enhancements
- `repRepository.ts`: Added event emission, `toggleSaved()`, and `subscribeSavedChanges()`
- `activityRepository.ts`: Added `getSearchCount()`, event emission, and `subscribeActivityChanges()`
- Activity log capped at 500 entries to prevent excessive storage usage

### Component Updates
- `representative-card.tsx`: Auto-updates heart state via event subscriptions
- `saved.tsx`: Uses event-based refresh instead of focus/storage listeners
- `profile.tsx`: Live activity and saved counts with real-time updates
- `home.tsx`: Activity logging for recent search clicks

## 📱 Platform Support

- **iOS**: Version 0.2.0 (Build 1)
- **Android**: Version 0.2.0 (Build 400003)
- **Web**: Version 0.2.0

## 🐛 Bug Fixes

- Fixed heart button not responding to clicks
- Fixed saved state not updating after save/remove actions
- Fixed multiple representatives not being saveable
- Removed non-functional "Remove" button in favor of consistent heart UI

## 📦 Files Changed

### Core Storage
- `client/src/lib/storage/repRepository.ts` - Event system + helpers
- `client/src/lib/storage/activityRepository.ts` - Search count + events

### UI Components
- `client/src/components/representative-card.tsx` - Live heart updates
- `client/src/pages/saved.tsx` - Event subscriptions
- `client/src/pages/profile.tsx` - Real-time activity display
- `client/src/pages/home.tsx` - Activity logging

### Configuration
- `package.json` - Version 0.2.0
- `android/app/build.gradle` - versionName "0.2.0", versionCode 400003
- `ios/App/App.xcodeproj/project.pbxproj` - MARKETING_VERSION 0.2.0

## ✅ Testing

- [x] Build completes successfully with no errors
- [x] TypeScript compilation passes (no new errors introduced)
- [x] Heart button toggles saved state correctly
- [x] Multiple representatives can be saved
- [x] Saved page displays all saved reps with working hearts
- [x] Profile shows accurate search count
- [x] Activity updates live when searches are performed
- [x] Event subscriptions clean up on unmount (no memory leaks)

## 🚀 Upgrade Notes

No breaking changes. All existing saved data will be preserved and migrated automatically.

---

**Deployed By:** Claude Code
**Repository:** CanadianRepFinder v1 base copy 5
