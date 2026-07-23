# WOD View — App Store listing content

Everything below is ready to paste into App Store Connect. Character limits are
noted where Apple enforces them; all copy has been counted against them. Each
field is a fenced code block, plain text, one line per paragraph — copy it
straight out with no quote markers, bold asterisks, or mid-sentence line
breaks to strip, and let App Store Connect's text fields do their own word
wrap.

## Name (30 chars max)

```
WOD View
```

8 chars. No existing App Store app uses this name (checked July 2026); final
confirmation happens when the app record is created in App Store Connect —
Apple checks name uniqueness at that moment.

## Subtitle (30 chars max)

```
Every rep. Every PR. Analyzed.
```

30 chars. Matches the onboarding hero line, which is the brand voice.

## Promotional text (170 chars max, editable without a new build)

```
Your training history, turned into insight. PRs, streaks, lift bests, and your biggest months — surfaced automatically from years of workouts, private on your phone.
```

156 chars. Deliberately trademark-free (see "Trademark decisions" below).

## Play Store short description (80 chars max)

```
Every rep. Every PR. Analyzed. Your workout history, private on your phone.
```

75 chars. Google Play Console's equivalent of the subtitle + promotional text:
leads with the brand line, then the privacy hook. Trademark-free (see
"Trademark decisions" below).

## Description (4000 chars max)

```
WOD View turns your gym app's workout-history export — SugarWOD and Chalk It Pro supported — into a fast, private training archive that lives entirely on your phone. No account. No servers. No subscription. Just your history.

THE LOG
Every workout you ever wrote down, restored line by line. Titles, full descriptions, scores, Rx or scaled, PRs, and your notes — searchable and fast, even across years of history.

BRING YOUR HISTORY HOME
Your training log belongs to you. Request your data export from SugarWOD or Chalk It Pro (it arrives as a CSV), open it on your phone, and import it with one tap. WOD View detects the format and parses the whole file on-device — it even restores the line breaks SugarWOD's export strips out of workout descriptions.

THE STATS
Lifetime numbers from your whole archive: total workouts, PR count, lift bests, the movements you meet most often.

THE CALENDAR
Your attendance in black and red. Streaks, gaps, biggest months — the honest picture of how you actually train.

PRIVATE BY ARCHITECTURE
Everything stays on your device. WOD View has no account system, no backend, no analytics, and no ads. Your data is never uploaded anywhere — the app simply has nowhere to send it. Clear it from Settings or delete the app, and it's gone. Importing never changes anything in your gym app account.

TRY IT FIRST
No export handy? Preview mode loads three years of realistic sample data so you can explore every screen. Your real import is one tap away whenever you're ready.

WOD View is an independent app and is not affiliated with or endorsed by SugarWOD or Chalk It Pro.
```

~1650 chars.

## Keywords (100 chars max)

```
workout,log,archive,training,history,gym,barbell,metcon,pr,lifting,offline,csv,import,strength
```

94 chars. "wod" and "view" are omitted (words in the app name are already
indexed). "sugarwod" and "crossfit" are omitted deliberately — see below.

## Category

- **Primary: Health & Fitness** (the app is a personal training log/archive)
- Secondary: none needed; leave empty rather than stretch for one.

## Age rating

Apple's questionnaire (revamped 2025, now producing 4+/9+/13+/16+/18+ tiers):
answer **None/No to everything** — no violence, no mature themes, no gambling,
no user-generated content or social features, no messaging, no unrestricted
web access (the single help button opens one fixed SugarWOD help page in an
in-app browser view, which is not "unrestricted web access"), no health/medical
treatment claims, no loot boxes/IAP. Expected result: **4+**.

## URLs

- **Privacy policy URL:** https://www.christophermark.me/wodview/privacy
- **Support URL:** https://christophermark.github.io/wod-view/support/
- Marketing URL: optional, leave empty (or reuse the support page).

## Copyright

```
© 2026 Christopher Mark
```

## App Privacy questionnaire

Answer **"No, we do not collect data from this app."** → label shows
**Data Not Collected**.

Why this is honest: Apple defines "collect" as transmitting data off the
device in a way that lets the developer or partners access it beyond
servicing a real-time request. WOD View transmits nothing: no backend, no
accounts, no analytics/crash SDKs (verified against `package.json` — the full
dependency tree is Expo/React Native runtime only), and the imported CSV is
parsed and stored purely on-device. The one network touch is the user-tapped
help button opening SugarWOD's public help page in a browser view, which is
not data collection. If a crash reporter, Expo updates, or any telemetry is
ever added, this answer must be redone.

## Trademark decisions (guideline 2.3.7)

- **"SugarWOD" appears in the description** as a factual compatibility
  statement ("turns the workout-history export from SugarWOD into…") plus an
  explicit non-affiliation line, and — per Chris's call, 2026-07-12 — as one
  compatibility line on the import preview slide ("SugarWOD and Chalk It Pro
  supported"). It stays **out** of the name, subtitle, keywords, and
  promotional text. Nominative compatibility references are standard
  practice; trademarks in name/subtitle/keywords are the classic 2.3.7
  rejection.
- **"CrossFit" appears nowhere** in the app or metadata. CrossFit, LLC
  enforces its mark aggressively; the copy uses "WOD", "training", "metcon",
  "box"-free phrasing instead. "WOD" itself is generic in the App Store
  (many third-party apps use it in names).

## Export compliance

`ITSAppUsesNonExemptEncryption: false` is set in `app.json`
(`ios.infoPlist`). Correct because the app ships no proprietary cryptography
and makes no encrypted connections of its own; only OS-provided mechanisms
(file storage, the SFSafariViewController help page) are used. With the key
set, App Store Connect skips the per-build compliance prompt.
