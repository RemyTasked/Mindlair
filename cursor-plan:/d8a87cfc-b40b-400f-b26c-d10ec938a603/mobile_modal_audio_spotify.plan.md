Steps:
1) Fix Scene Library modal on mobile (iPhone Chrome) in [src/frontend/src/components/SceneLibrary.tsx](src/frontend/src/components/SceneLibrary.tsx):
   - Ensure the X close button always dismisses (click and touch), add an overlay click-to-close handler, and prevent event propagation issues.
   - Lock background scroll while modal is open; keep content scrollable within the modal with safe-area padding and full-height flex to avoid hidden content.
   - Raise z-index and ensure no parent overflow clipping.

2) Stop audio overlap between Scene Library and Focus Rooms:
   - In [src/frontend/src/components/SceneLibrary.tsx](src/frontend/src/components/SceneLibrary.tsx), dispatch a global `ambient-sound-stop` when closing the modal or switching scenes.
   - In [src/frontend/src/pages/FocusRooms.tsx](src/frontend/src/pages/FocusRooms.tsx), always dispatch `ambient-sound-stop` before starting any room audio (Mind Garden or Spotify) and when switching rooms/tabs.

3) Spotify playback fix:
   - Frontend (FocusRooms.tsx / spotify client): before play, fetch devices; if none active, prompt user and attempt transfer to the first available device; surface specific errors (no device, premium required) with fallback to Mind Garden audio.
   - Backend ([src/backend/routes/spotify.ts](src/backend/routes/spotify.ts)): ensure play endpoint checks for devices, auto-selects/ transfers to an available device if none active, and returns clear error codes/messages.

4) Verify on mobile:
   - Test Scene Library modal open/close, scrolling, and safe-area on iPhone Chrome.
   - Test that ambient stops when entering a Focus Room and that only one audio source plays.
   - Test Spotify flow with the app open on phone; confirm device selection/transfer and fallback messaging.

