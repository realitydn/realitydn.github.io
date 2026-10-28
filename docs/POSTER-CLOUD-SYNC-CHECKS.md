# Poster Studio cloud sync: checks that need a real sign-in

These go with the 28.10.26 fixes. The decision rules are covered by
`npm run selftest` (`public/studio/cloud-sync.js` and the token handling in
`public/studio-shared/cloud.js`). Each path was also run in a local Studio
with the hub faked. What's left needs the real hub, a real Google sign-in and
two machines (or two browser profiles: call them **A** and **B**).

Use a throwaway template ("Sync test") and the Studio's own buttons. Nothing
here touches the hub's API.

## 1. The sign-in running out
1. Sign in on A. Open DevTools → Application → Local Storage →
   `reality-hub-token-v1`, and edit `expiresAt` to about 2 minutes from now.
   Then reload.
2. **Expect** the topbar to show `SIGN-IN ENDS IN 2 MIN · RENEW` straight away.
   Clicking it opens the sign-in popup; after you sign in the chip goes.
3. Set `expiresAt` to about 1 minute from now again and wait.
4. **Expect** that at the minute the account name, → Event and Sign out are
   replaced by `SIGNED OUT` and `SIGN IN AGAIN`. Hover for the reason.
5. Edit the poster while signed out. Then click **Sign in again**.
6. **Expect** the edit to reach the cloud: open B, sign in, and B offers it as
   a newer draft.

## 2. A stale draft must not overwrite the cloud's
1. On A, edit the poster on screen (any change), wait 3s and close the tab.
2. On B, open the Studio **signed in** with an older draft on screen.
3. **Expect** "The cloud has a newer Poster Studio draft…".
   - Open DevTools → Network on B, filter `documents`, and press **Cancel**.
     Wait 5s: there is no PUT (B didn't overwrite A's draft).
   - Make an edit on B. Only now does a PUT for `working` go out.
4. Do it again and press **OK**. B shows A's draft, and Ctrl+Z brings B's old
   copy back.

## 3. Edits to an existing template come down
1. Save "Sync test" with a photo on A. Sign in on B and let it load, so B has
   the template.
2. On A, change the title text and save over "Sync test".
3. Reload B (signed in).
4. **Expect**, on B:
   - "Sync test" has A's text;
   - Recently deleted has B's old copy ("replaced by a newer copy from the
     cloud");
   - if the photo was B's own (B made the template), it is still full size;
   - the console says "kept 1 full-size photo".
5. Reload B again. **Expect** no "Syncing n/m" and no second download.
6. Archive "Sync test" on A and reload B. **Expect** it to be archived on B too.

## 4. Failed pushes show up
1. **Too big:** save a template with several large photos, enough to go over
   5M characters after the 860px re-cut (6+ big PNG photos usually does it).
   **Expect** `NOT IN CLOUD: “<name>”` with the size on hover. Nothing is
   uploaded: the Network tab shows no PUT for it.
2. **Offline:** DevTools → Network → Offline, then save a template.
   **Expect** `SYNC FAILED · RETRY`. Go back online and click the chip:
   the chip goes, and the template is on B after B reloads.
3. **Next load retries:** repeat step 2 but don't click Retry. Go online and
   reload. **Expect** the chip to go once the load's sync has run.

## Known limits (unchanged by this work)
- Recently deleted holds 10. A pull that replaces more than that in one go
  pushes out the oldest entries, deleted ones included.
- The first signed-in load of this build may download templates whose hub copy
  arrived well after their save (pushed late, e.g. while the sign-in had run
  out), once each, to check them. After that it only downloads real changes.
- A cloud copy that comes down from someone else's photo (not one B already
  has) arrives at 860px, as before.
