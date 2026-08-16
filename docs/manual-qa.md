# Manual QA — Wedding Photo App

Test primarily on a narrow iPhone-sized viewport, then repeat the core flow on Android and desktop.

## Guest and event

- [ ] First visit shows nickname onboarding and creates exactly one database guest.
- [ ] Returning visit restores the event-specific identity without onboarding.
- [ ] Tapping the profile chip shows “Stai pubblicando come …”.
- [ ] Changing nickname updates the header, filter, existing photo attribution, localStorage, and the same database guest row.
- [ ] A disabled gallery shows a friendly unavailable message and no feed.
- [ ] Disabled uploads keep the gallery visible and replace the upload CTA with an explanatory message.

## Uploads

- [ ] One JPEG/PNG/WebP uploads, persists, and appears in the newest feed without reload.
- [ ] Ten selected photos show overall progress and never exceed three simultaneous uploads.
- [ ] Queued photos can be removed before starting.
- [ ] A failed photo shows its reason and retry action without blocking successful photos.
- [ ] If metadata persistence fails after Cloudinary succeeds, retry saves metadata without uploading the binary again.
- [ ] Double-clicking the submit action does not create duplicate rows.
- [ ] Closing the sheet preserves incomplete selections during the current page session.
- [ ] Navigating away with incomplete uploads triggers a browser warning.

## Connectivity

- [ ] Going offline displays a clear banner.
- [ ] New uploads cannot start offline and selected files remain queued.
- [ ] Returning online allows queued work to continue or retry.
- [ ] A feed network failure shows a guest-friendly retry state.

## Feed and images

- [ ] Initial page requests only the first photo page.
- [ ] Approaching the bottom prefetches one next page and stops when `nextCursor` is null.
- [ ] Infinite scroll has no duplicate cards and preserves scroll during normal interactions.
- [ ] All/specific guest and newest/oldest filters show no mixed stale results.
- [ ] Next-page failure keeps existing photos visible and offers retry.
- [ ] Empty gallery offers “Condividi la prima foto” when uploads are enabled.
- [ ] Feed Cloudinary URLs include `w_1000`, `f_auto`, and `q_auto`; originals are never requested.
- [ ] Portrait and landscape cards reserve the correct aspect ratio without layout shift.
- [ ] Tapping a photo opens the 1600px fullscreen variant with nickname, date, and caption.
- [ ] Lightbox closes by close button, Escape key, and overlay interaction.

## Mobile polish

- [ ] Header, filter controls, bottom CTA, and sheets respect iPhone safe areas.
- [ ] Long nickname and caption do not overflow.
- [ ] Interactive controls have comfortable touch targets and visible keyboard focus.
