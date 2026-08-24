# Waypoint — Architecture

Stage 1 output. Input: `waypoint/docs/BRIEF.md`, the root `CLAUDE.md`, and `europe-2026-itinerary.html`
(the working proof of the format). Written 2026-08-24.

Read §1 for the stack and why, §2 for the domain model the builder implements, §3 for boundaries,
§4 for the four hard subsystems, §5 for the privacy line, §6 for what I am deliberately not designing yet.

**Phase 1 is §2 only.** Everything from §3 onward is the shape Phase 1 must not foreclose, not work
anyone is doing next week. See `ROADMAP.md`.

---

## 0. Three positions, stated up front

Everything below is elaboration on these.

1. **The brief's two hard constraints hold, and one is worse than the brief says** — but they force a
   *native shell for pillars 4 and 5*, not a native-first architecture. The stack that follows is
   Expo/React Native, and the reason is code-sharing economics, not the capability constraint. §1.
2. **Days are stored, not derived. Stops belong to days by an explicit edge, not by timestamp.** §2.3.
3. **Location traces and photo metadata never leave the device unless the user explicitly shares one
   day's simplified path.** Raw fixes, EXIF, and library enumeration results are not server data in any
   phase, including phases nobody has designed yet. §5.

---

## 1. Stack decision, driven by constraints

### 1.1 What I actually verified

The agent brief says not to assert platform behaviour from memory. Everything in this table was checked
on 2026-08-24. **Caveat on method:** this session's egress proxy blocked direct `WebFetch` to
`developer.mozilla.org`, `caniuse.com`, `bugs.webkit.org`, `docs.expo.dev` and `magicbell.com`, so most of
these are search-result summaries of those sources rather than pages I read end to end. Items marked
**⚠ NEEDS DEVICE CHECK** are ones I would not bet the schedule on without a physical iPhone.

| Capability | State as of Aug 2026 | Consequence |
|---|---|---|
| **Background geolocation, web** | Not available. `watchPosition()` stops reporting when the screen is off; when the app is backgrounded iOS may power the GPS down entirely under its own power-management rules. No spec, no vendor roadmap; W3C device-APIs discussion still open as of Jun 2025. | Pillar 4 is impossible in a browser. Confirms the brief. |
| **Geolocation in an *installed* iOS web app** | Reports since iOS 26 that geolocation is **denied outright** in home-screen web apps while working in the same page opened in Safari; iOS 26 also made every "Add to Home Screen" default to web-app mode, and multiple 2026 write-ups describe the result as behaving like a WebClip. ⚠ NEEDS DEVICE CHECK | *Worse than the brief.* Even a foreground-only "record while the app is open" fallback is unreliable on iOS web. Kills the "PWA now, native later for background only" hedge. |
| **Background Sync API** | Not implemented in WebKit. Not on Apple's stated roadmap. Periodic Background Sync is Chromium-only. | A PWA cannot flush a queued trace or poll a mailbox while closed, on any iOS browser (all iOS browsers are WebKit). |
| **Screen Wake Lock** | Supported in iOS Safari from **16.4**; broken specifically in installed home-screen web apps until Apple fixed it in **18.4** (WebKit #254545). | A *foreground, screen-on* "live path" web mode is technically viable on Android/desktop and on current iOS — this is why the web app is not a dead end for pillar 4, only a degraded one. |
| **File System Access API** | Safari supports **only** the Origin Private File System (15.2+). `showOpenFilePicker` / `showSaveFilePicker` / `showDirectoryPicker` are Chromium-only on all platforms. | No local-disk trip files or ticket vault in Safari. Web export is a download; web import is `<input type=file>`. |
| **Photo library enumeration, web** | No API exists in any browser. The web platform offers a *picker* only — the user selects, the page receives those files. Deliberate, security-by-design; the same restriction Google applied when it removed the broad Photos library scope in Mar 2025. | Pillar 5's *auto-suggest* is impossible in a browser. Confirms the brief. |
| **EXIF on iOS Safari uploads** | iOS strips sensitive EXIF — including GPS — from photos uploaded through a Safari file input (WebKit #207088, long-standing, unresolved). | *A second reason the brief doesn't give.* Even the manual-picker fallback cannot get coordinates on iOS. There is no partial web version of pillar 5. |
| **iOS storage eviction** | Script-created storage (IndexedDB, localStorage, SW registrations) is deleted after 7 days without user interaction — but **home-screen web apps keep their own days-of-use counter** and are not expected to be evicted (WebKit storage-policy update). | An installed web app *can* hold a trip offline. A tab cannot be trusted to. |
| **Expo / React Native, current** | Expo **SDK 56**, released 2026-05-21: React Native 0.85, React 19.2, Hermes v1 default, New Architecture assumed (RN 0.83+ is New-Arch-only). `expo-sqlite` gained session changesets on both platforms. | The native shell is on a current, supported line; changesets are a plausible sync primitive later. |
| **Background location, native** | `expo-location` `startLocationUpdatesAsync` + `expo-task-manager`; config-plugin flags `isIosBackgroundLocationEnabled` (adds `location` to `UIBackgroundModes`) and `isAndroidBackgroundLocationEnabled` (adds `ACCESS_BACKGROUND_LOCATION`); Android runs it as a foreground service. | Pillar 4 is a solved, first-party problem in Expo. |
| **Photo library, native** | `expo-media-library` enumerates assets with `getAssetsAsync`, and `getExifAsync` / `getLocationAsync` return per-asset coordinates. Android requires `ACCESS_MEDIA_LOCATION` in addition to `READ_MEDIA_IMAGES` or coordinates come back empty. | Pillar 5 is a solved, first-party problem in Expo. The Android permission is a classic silent-empty-result trap — name it in the build. |
| **Gmail restricted scopes** | Apps using Gmail restricted scopes need Google verification **plus** an independent CASA Tier 2 assessment; 2026 self-serve lab fees quoted at roughly **$540–$1,000**, total timeline **4–12+ weeks**. Staying in OAuth publishing status "Testing" avoids all of it but caps at **100 test users** and **expires every refresh token after 7 days**. ⚠ Confirm whether `gmail.readonly` specifically sits in the restricted tier or the sensitive tier before committing — `https://mail.google.com/` certainly is restricted. | A cost and a calendar item the brief does not mention, and a genuine fork Jacob has to pick. See §4.1 and `ROADMAP.md` Phase 4. |

Sources: [PWA iOS limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) ·
[caniuse: Background Sync](https://caniuse.com/background-sync) ·
[caniuse: Periodic Background Sync](https://caniuse.com/wf-periodic-background-sync) ·
[caniuse: Wake Lock](https://caniuse.com/wake-lock) ·
[WebKit #254545 — wake lock in home-screen web apps](https://bugs.webkit.org/show_bug.cgi?id=254545) ·
[WebKit #207088 — iOS uploads strip EXIF](https://bugs.webkit.org/show_bug.cgi?id=207088) ·
[Apple Developer Forums — did iOS 26 break PWA geolocation](https://developer.apple.com/forums/thread/804381) ·
[Apple Support Communities — same](https://discussions.apple.com/thread/256167096) ·
[WebKit — updates to storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) ·
[File System Access browser support](https://www.testmuai.com/learning-hub/file-system-access-api-browser-support/) ·
[Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56) ·
[expo-location](https://docs.expo.dev/versions/latest/sdk/location/) ·
[expo-media-library](https://docs.expo.dev/versions/latest/sdk/media-library/) ·
[Google — manage app audience / test users](https://support.google.com/cloud/answer/15549945) ·
[Google OAuth refresh-token expiry in Testing](https://www.unipile.com/google-oauth-refresh-token/) ·
[Node.js EOL schedule](https://endoflife.date/nodejs) ·
[Node.js TypeScript support](https://nodejs.org/api/typescript.html) ·
[Node.js test runner](https://nodejs.org/api/test.html).

### 1.2 What each option kills

| Option | What it kills |
|---|---|
| **PWA only** (extend the current HTML) | Kills pillar 4 outright (no background location on any iOS browser; Android suspends too). Kills pillar 5 outright (no enumeration API anywhere; iOS strips EXIF even from picked files). Kills offline-reliable email polling. Keeps 1–3 partially, at the cost of a rewrite later. **Rejected.** |
| **Native Swift + native Kotlin** | Kills nothing capability-wise — it is the ceiling. Kills the schedule: two platform codebases plus a web app plus a server, for a product whose audience is "tens of users". Domain logic would live in three languages and drift, which is precisely the failure the `DAYS` array was invented to prevent. **Rejected.** |
| **Capacitor / web-in-a-shell** | Keeps the existing HTML almost intact and there are community background-geolocation plugins. Kills the good version of pillar 5 (photo-library enumeration + EXIF through a plugin bridge is where this shape gets thin), and leaves the entire UI in a WebView with the offline story built on the same WebKit storage rules that already bit us. Viable, not chosen. |
| **Expo / React Native + a TypeScript server** ✅ | Kills nothing in the brief. Costs a native rebuild of the UI (the existing HTML stays as-is and as reference, it is not ported). |

### 1.3 The decision

- **`packages/core`** — pure TypeScript, zero runtime dependencies, no DOM, no `fetch`, no platform APIs.
- **`apps/mobile`** — Expo SDK 56 / RN 0.85. Owns location, the photo library, and offline travel.
- **`apps/web`** — Vite + React + TypeScript. Planning on a keyboard, public share pages, OAuth callbacks.
- **`services/api`** — Node 24, Postgres with row-level security, managed-platform auth and object storage.
- **`services/ingest`** — a worker in the same Node runtime; separate deploy unit, separate credentials.

Runtime floor everywhere: **Node 24 LTS**. Core is written so `node --test` runs the `.ts` files directly
via type stripping — which means core may not use enums, parameter properties, namespaces, or anything else
`erasableSyntaxOnly` rejects. That is a hard constraint on the builder and the reason the tester needs no
toolchain at all.

**The constraint that forced the stack** is not background location on its own — that only proves "some
native code exists". It is background location **and** photo-library enumeration **and** a server-side mail
worker **and** a browser planning surface, all needing to agree on what a trip is, on a budget of one
builder. Four surfaces, one domain model, one language. That is Expo plus a TypeScript server.

**On the managed-Postgres question the brief asked me to cost:** yes, take it. Row-level security turns
"who can see this trip" into declarative policy that the database enforces even when an endpoint forgets to.
But it is the *enforcement* layer, not the *definition* layer. The permission rules are defined as pure
functions in `packages/core/access` and the RLS policies are generated from — or at minimum tested against —
those same rules, with a conformance test asserting the two agree. Otherwise the tester can attack the
policies only against a live database, and Phase 1 loses its "plain Node" property.

### 1.4 Where I disagree with the brief

1. **"The end state is a native app, so the design must not paint itself into a browser."** Half right. The
   part that must be native is *pillars 4 and 5*; pillars 1–3 are better on a keyboard. The design is
   core-first, not native-first, and the web app is a first-class permanent surface, not a stepping stone.
2. **"A PWA cannot do [background location] on iOS at all."** True, and understated — since iOS 26 there are
   credible reports that geolocation is refused in installed home-screen web apps even in the foreground.
   Web live-path is therefore a *screen-on, Android-and-desktop-first* degraded mode, not an iOS fallback.
3. **Photo library.** The brief's reason ("a file picker returns files the user chose") is correct but
   incomplete: on iOS the picker also *strips the GPS EXIF*, so there is no reduced web version of pillar 5
   at all — not even "pick 20 photos and we'll place them".
4. **Email ingestion.** The brief's reasoning is right; the missing item is that Gmail restricted-scope
   access carries a CASA Tier 2 assessment (money and 4–12 weeks), and the no-verification path caps at
   100 users and expires refresh tokens weekly, which is directly hostile to unattended polling. This is a
   decision for Jacob, not a detail for the builder — see §4.1.
5. **`LocationPoint` / `LocationSegment` in the brief's entity list** read as server tables. In this design
   they are device-local types that have no server counterpart. The only location entity that exists
   server-side is `SharedTrace`, which is a different, coarser thing. §5.

---

## 2. Domain model — the Phase 1 specification

This section is the builder's contract. Where it says MUST, the tester will check it.

### 2.1 Conventions

- All ids are opaque strings. Core never generates them; an `IdFactory` is injected
  (`() => string`) so tests are deterministic. Default in app code: UUIDv7.
- Dates are `YYYY-MM-DD` local-to-the-trip. Times are `HH:MM` 24h **wall-clock at the stop's location**, or
  `null` for an unscheduled stop. Core stores no UTC instants and does no timezone maths — see §6.
- All build functions are **pure and immutable**: `(trip, args) => Trip`. Nothing mutates in place. (Today's
  `addOptional` splices arrays and re-renders; that is exactly the coupling being removed.)
- Core throws only on programmer error (unknown id, malformed input). Domain problems are returned as
  `Issue[]` or `Conflict[]`, never thrown.

### 2.2 Entities

```ts
type Trip = {
  id: TripId;
  title: string;
  ownerId: UserId;
  startDate: IsoDate;            // inclusive
  endDate: IsoDate;              // inclusive
  homeCurrency: Currency;        // "EUR" for Europe 2026
  party: { adults: number; children: number };   // cost basis, see §2.6
  cities: City[];                // ordered
  days: Day[];                   // dense, one per date in [startDate, endDate], MUST have no gaps
  pool: Stop[];                  // unscheduled stops — the generalisation of OPTIONAL
  places: Place[];               // the map-pin superset — generalisation of CITY_PLACES
  bookings: Booking[];
  resolutions: ConflictResolution[];
  revision: number;              // monotonic; bumped by every build function
  schemaVersion: 1;
};

type City = {
  key: CityKey;                  // "split"
  name: string;                  // "Split"
  countryCode: string;           // "HR"
  centre: LatLng;                // used by the 35 km sanity check
  order: number;                 // CITY_ORDER
  meta?: { flagEmoji?: string; color?: string };   // display hints, core ignores them
};

type Day = {
  id: DayId;                     // MUST equal the date: "2026-08-13"
  date: IsoDate;
  primaryCity: CityKey | 'transit';   // drives grouping — an editorial choice, not derivable
  cities: CityKey[];             // every city tab this day appears under; MUST include primaryCity
  title: string;
  subtitle: string;
  stops: Stop[];                 // ordered; see 2.4 for the ordering rule
  provenance: Provenance;        // a whole day can be our draft (sugDay)
  legacyFlag?: boolean;          // migration only, see 2.8
};

type Stop = {
  id: StopId;
  placement: StopPlacement;
  name: string;
  category: StopCategory;        // 'sight'|'food'|'night'|'trip'|'transit'|'stay'|'suggest'
  place: PlaceLink;              // resolved place, inline coords, or nothing
  note: string;
  cost: CostEstimate | null;
  arrival: MoveOverride | null;  // describes the leg INTO this stop — see 2.5
  bookingId: BookingId | null;
  flags: StopFlag[];             // 'free' | 'daytrip' | 'closes_early' | ...  (display badges only)
  provenance: Provenance;
  durationMins: number | null;   // null = unknown; used by overlap detection, never guessed
};

type StopPlacement =
  | { kind: 'scheduled'; dayId: DayId; time: ClockTime | null; order: number }
  | { kind: 'pool'; cityKey: CityKey; hint?: { dayId: DayId; time: ClockTime } };

type PlaceLink =
  | { kind: 'place'; placeId: PlaceId }
  | { kind: 'inline'; at: LatLng }
  | { kind: 'none' };            // MUST be supported end-to-end: a stop with no coordinates

type Place = {
  id: PlaceId; cityKey: CityKey; name: string; at: LatLng;
  category: StopCategory; note?: string; links?: Link[];
  hours?: OpeningHours;          // optional; feeds the `closed` conflict rule
};

type Booking = {
  id: BookingId; tripId: TripId;
  kind: 'flight'|'bus'|'train'|'ferry'|'lodging'|'tour'|'ticket'|'other';
  operator: string;              // "Ryanair", "FlixBus"
  reference: string | null;      // "IU1TUY"
  route?: { fromName: string; toName: string };
  startsAt: { date: IsoDate; time: ClockTime | null };
  endsAt?:   { date: IsoDate; time: ClockTime | null };
  price: CostEstimate | null;
  party: number | null;          // 5 adults on the Danube cruise
  seat?: string;
  status: 'active' | 'superseded' | 'cancelled';
  supersedesId?: BookingId;      // the YZGDTS reissue, NOT a duplicate
  ticket: Ticket | null;
  provenance: Provenance;
};

type Ticket =
  | { kind: 'bundled'; path: string; label: string }        // tickets/flixbus-...pdf — cannot 404
  | { kind: 'url'; href: string; label: string; verifiedAt: IsoDate | null; verifiedBy: 'fetch'|'user'|null }
  | { kind: 'attachment'; mailMessageId: string; filename: string; label: string };  // exists, not retrievable
```

Server-authoritative vs client-local:

| Entity | Authority | Note |
|---|---|---|
| `User`, `Friendship`, `TripShare`, `TripMember` | **Server only.** | Permissions are not enforceable client-side. Clients cache them read-only and MUST revalidate. |
| `Trip`, `Day`, `Stop`, `Place`, `Booking` | Server-authoritative, client-replicated, offline-editable. | Last-writer-wins per stop with a `revision` guard in Phase 3; not Phase 1's problem. |
| `Ticket` bytes | Server object storage, private bucket. | Bundled tickets are repo files today; that pattern survives as "an asset we host", per CLAUDE.md. |
| `Conflict` | **Derived. Never stored.** | Only `ConflictResolution` is stored. §2.7. |
| `Leg`, cost roll-ups, clusters, `CITY_RANGE` | **Derived. Never stored.** | §2.5. |
| `MailAccount`, `IngestCandidate` | Server only. | §4.1. |
| `LocationFix`, `LocationSegment`, `PhotoAsset` | **Device only.** | No server table exists. §5. |
| `SharedTrace` | Server, opt-in per day. | The only location data that is ever transmitted. §5. |

### 2.3 Position: days are stored; stop→day is an explicit edge

**Days are stored.** The alternative — derive days from `[startDate, endDate]` plus stop timestamps — loses
four things the Europe 2026 trip actually contains:

1. **Editorial city assignment.** Aug 12 starts in Dubrovnik at 06:50 and ends in Split; the app calls it a
   *Split* day (`city:"split"`, `cities:["dubrovnik","split"]`). Five of sixteen days are like this. No
   derivation recovers "which city is this day *about*" — and `pickDay()` already depends on the distinction,
   deliberately, so a Vienna add-on doesn't land on the Vienna→Dubrovnik transit day.
2. **Day-level prose that isn't a function of its stops.** Aug 9's subtitle explains why the day is *empty*
   ("tomorrow starts at 4:45am"). CLAUDE.md forbids filling it. Derived days have nowhere to put that.
3. **Empty days.** A rest day with zero stops must still exist, be titled, and be navigable.
4. **Day-level provenance.** Three days are wholly our draft (`sugDay`). That is a property of the day.

The dangerous half of "stored" is drift — a day whose date falls outside the trip, or a missing date in the
middle. Core closes that: `days` MUST be dense over `[startDate, endDate]`, `Day.id === Day.date`, and every
build function that changes trip dates calls `ensureDays()` to add/remove edge days. `validateTrip` fails on
a gap. So: stored for the editorial content, generated and invariant-checked for the skeleton.

**Stop→day is an explicit edge, not a timestamp lookup.** The LAX→Frankfurt flight departs 16:45 on Aug 7 and
lands 13:00 on Aug 8; it belongs to Aug 7. A 23:50 departure arriving 07:15 belongs to the *departure* day.
Deriving membership from an instant puts these on the wrong card. `placement.dayId` is stored; a stop may
carry `arrivesNextDay` for display, and the `overnight` conflict rule uses it.

### 2.4 Stop ordering

Ordering is `(timeVal(time), order)` ascending, where `timeVal(null) = +∞` — i.e. untimed stops sort last, in
insertion order. `order` exists because the current app lets Jacob drag stops into an order that contradicts
their times, and that user-chosen order must survive. `insertStopSorted(day, stop)` inserts before the first
stop with a strictly greater time (port of today's behaviour exactly).

### 2.5 Legs, clusters, and cost — all derived

```ts
computeLegs(day: Day, ctx: TripCtx): (Leg | null)[]   // one entry per stop, index-aligned; [0] is null unless stop 0 has an arrival override
type Leg = { mode: TravelMode; mins: number; km: number | null; source: 'override' | 'estimate' };
```

The estimator is a **byte-exact port** of `legBetween` in the live app. The tester will diff these numbers
against the running page, so do not "improve" them:

- If the stop has `arrival` (today's `move`), that wins; `km` is still the haversine to the previous stop, or
  `null` if either coordinate is missing.
- Otherwise, if either stop lacks coordinates → `null` (no leg).
- `km < 0.12` → `null`.
- `km <= 1.6` → `{ mode:'walk',    mins: max(2, round(km * 1.35 / 4.8  * 60)) }`
- `km <= 9`   → `{ mode:'transit', mins: max(8, round(km * 1.25 / 17   * 60) + 6) }`
- else        → `{ mode:'taxi',    mins: round(km * 1.2 / 50 * 60) + 5 }`
- Haversine with R = 6371 km.

**`arrival` describes the leg *into* the stop, not out of it.** Today's `move` is read as `legBetween(prev, s)`
and this is the single easiest thing in the whole model to implement backwards. The migration test asserts
Aug 12's FlixBus leg is 245 min *arriving at Split*, not departing Dubrovnik.

```ts
clusterStops(stops: Stop[], thresholdKm = 90): Stop[][]
focusCluster(stops: Stop[]): { focus: Stop[]; groups: Stop[][]; split: boolean; spanKm: number }
```

Also a straight port, including the heuristic that the cluster containing the *last* stop wins if it is
within one stop of the largest ("where you'll end the day" beats "where most pins are"), and the fallback when
the winning cluster has fewer than two points. **Core additionally exports `MIN_SPAN_KM = 1.2`** and
`fitSpanKm(pts)`, because the min-span guard that stops a one-street day slamming into max zoom currently
lives inside `applyDayFit()` in the view layer — and CLAUDE.md records that both map bugs came from view-layer
map maths. Every map surface (web Leaflet, native MapLibre) MUST take its bounds from core so neither can
regress independently. Core does not know what a map is; it returns points and a span.

```ts
rollUpCost(scope: Trip | Day | Stop[], opts?: { rates?: RateTable }): CostRollUp
type CostRollUp = {
  byCurrency: Record<Currency, { lo: number; hi: number }>;
  converted: { currency: Currency; lo: number; hi: number; rateSetId: string } | null;
  missingRates: Currency[];
  basisWarnings: string[];      // per-person and per-party amounts mixed in one scope
};
```

**Core never invents an exchange rate.** With no `RateTable` it reports per-currency subtotals and lists what
it could not convert. This is the fix for a real defect in the current data (§2.6).

### 2.6 Money

Today a stop carries `cost:"€90–113"` (display) plus `c:[90,113]` (numeric, assumed EUR). Across the 112
stops that produces four bugs the tester should be able to find and Phase 1 should already have fixed:

- `"~450 CZK"` → `c:[18,18]`, `"~100 CZK"` → `c:[4,4]` — hand-converted at an unrecorded rate on an unrecorded date.
- `"$159.98pp"` → `c:[160,160]` — per-person, and the currency is silently wrong.
- `"$573.25 total"` → `c:[573,573]` — a *party* total for 5 adults summed alongside per-person amounts.
- `"Gardens free · palace €15–24"` → `c:[0,24]` — one string encoding two products.

```ts
type Money = { lo: number; hi: number; currency: Currency; basis: 'per_person' | 'per_party' };
type CostEstimate = { amounts: Money[]; display: string | null; note?: string };
```

`amounts` is a list so "gardens free, palace €15–24" is two entries rather than a fudged range. `display` is
preserved verbatim from the source and is what a UI shows; core computes only from `amounts`. A roll-up over
a scope containing both bases emits a `basisWarning` rather than adding them — it does not silently multiply
by party size, because it cannot know whether "€25–40 dinner" was already for the group.

### 2.7 Conflicts

The rule from CLAUDE.md — *flag conflicts, don't resolve them by guessing* — becomes a type.

```ts
detectConflicts(trip: Trip, ctx: { now?: IsoDate; rules?: RuleId[] }): Conflict[]

type Conflict = {
  id: ConflictId;         // content-addressed, see below
  kind: ConflictKind;
  severity: 'blocker' | 'warning' | 'note';
  subjects: Ref[];        // {kind:'day'|'stop'|'booking', id}
  summary: string;        // one line stating BOTH sides
  detail?: string;
  ruleId: RuleId;
  resolution: ConflictResolution | null;   // joined from trip.resolutions
};

type ConflictResolution = {
  conflictId: ConflictId;
  state: 'acknowledged' | 'accepted_booking' | 'accepted_plan' | 'dismissed';
  by: UserId; at: IsoDate; note?: string;
};
```

Rules to implement in Phase 1 (each a separate file, each independently testable):

| `ruleId` | Fires when | Severity | Fixture case |
|---|---|---|---|
| `overlap` | Two scheduled stops on one day whose `[time, time+durationMins)` intervals intersect. Stops with `durationMins: null` never overlap — no guessing. | warning | — (synthetic) |
| `impossible_transfer` | `leg.mins` exceeds the gap to the previous stop. | blocker | Aug 18: 05:30 bus, 40 min, 07:30 flight, 40-min bag-drop cutoff |
| `booking_vs_plan` | A linked `Booking`'s date/time/route disagrees with its `Stop`. | blocker | the Aug 15 Smartwings case (now agreeing — the rule must *not* fire) |
| `unverified_reference` | `Booking.provenance.confidence === 'asserted'` with no `origin.messageId`. | warning | IU1TUY, I54C9A |
| `superseded_booking` | Two bookings share `operator + reference` with different issue dates. Emits `supersedes`, **not** `duplicate`. | note | YZGDTS, 16 Jul vs 04 Aug |
| `duplicate_booking` | Two *different* references cover the same route and date. | warning | (synthetic; the email-ingest case) |
| `missing_lodging` | A night between two days in the same city with no `stay` stop and no lodging booking. | warning | Budapest, London |
| `unbooked_ticketed` | A stop with a booking link and a cost but no `Booking` record, on a day inside N days of `now`. | note | Széchenyi, Prague Castle, Windsor |
| `closed` | A stop scheduled outside its `Place.hours`. | warning | Naschmarkt flea market (ends 14:00, arrival 15:50) |
| `geo_outlier` | A stop more than 35 km from its day's primary city centre with no `arrival` override explaining it. | blocker | the Fisherman's Bastion `48.5025` typo class |

**Conflict ids are content-addressed** over `(ruleId, sorted subject ids, the specific values that made it a
conflict)`. That is deliberate: if the Ryanair time changes from 19:30 to 07:30, the old conflict's id changes,
so a previous "acknowledged" does **not** silently carry over to the new situation. This is the mechanised
version of Pass 5's lesson in `HISTORY.md`.

`detectConflicts` is pure and never mutates the trip. Resolving is `resolveConflict(trip, resolution) => Trip`,
which appends to `trip.resolutions` and changes nothing else — a resolved conflict still renders, dimmed.
There is no code path anywhere in core that edits a stop in response to a conflict.

### 2.8 Provenance

```ts
type Provenance = {
  source: 'user' | 'email' | 'friend' | 'system';
  state: 'candidate' | 'accepted' | 'rejected';
  confidence: 'confirmed' | 'asserted' | 'inferred';
  origin?: {
    mailAccountId?: string; messageId?: string;      // source: 'email'
    friendUserId?: UserId; sourceTripId?: TripId; sourceStopId?: StopId;   // source: 'friend'
    ruleId?: string;                                  // source: 'system'
  };
  addedAt: IsoDate; acceptedAt: IsoDate | null; actorUserId: UserId | null;
};
```

- `source` — who produced it. `confidence` — how well attested it is: `confirmed` = we have the document,
  `asserted` = a human said so with nothing behind it (IU1TUY), `inferred` = we worked it out (every
  hand-converted CZK price).
- `state` — whether the user has taken it on. **Email-derived data is created `state:'candidate'` and is
  never a silent write**, per the brief.

One function decides how everything renders, so web, native and server cannot drift:

```ts
displayStatus(x: { provenance: Provenance }): 'own' | 'suggested' | 'candidate' | 'imported' | 'rejected'
// 'own'       iff source==='user' || state==='accepted'
// 'candidate' for source==='email' with state==='candidate'   → review queue, badged
// 'imported'  for source==='friend'                            → credited to the friend, badged
// 'suggested' for source==='system' with state==='candidate'   → dimmed, removable  (today's sug:true)
```

The invariant the tester should attack: **nothing with `state !== 'accepted'` and `source !== 'user'` may
ever be presented without a badge.** `validateTrip` includes a check that every stop has a provenance and
that no `accepted` record is missing an `acceptedAt`.

### 2.9 Validation

```ts
validateTrip(trip: Trip): Issue[]
type Issue = { level: 'error' | 'warn'; code: string; ref: Ref; message: string };
```

Codes: `days_not_dense`, `day_id_mismatch`, `duplicate_id`, `primary_city_not_in_cities`,
`unknown_city_key`, `place_ref_dangling`, `stop_far_from_city` (>35 km, the Fisherman's Bastion class),
`lat_lng_out_of_range`, `pool_stop_has_day`, `scheduled_stop_has_no_day`, `booking_ref_orphan`,
`cost_basis_mixed`, `provenance_missing`, `accepted_without_timestamp`.

This is the generalisation of the scripted checks in `CLAUDE.md` — the ones that caught bugs nothing visible
was showing. It replaces "extract the inline JS and stub `document`" with a function.

### 2.10 The public API surface, in full

```
packages/core/src/index.ts   re-exports exactly this and nothing else:

  // model      — types only
  Trip, City, Day, Stop, StopPlacement, Place, PlaceLink, Booking, Ticket,
  CostEstimate, Money, Provenance, Conflict, ConflictResolution, Leg, Issue, ...

  // build      — pure, immutable, each returns a new Trip and bumps revision
  createTrip(init): Trip
  ensureDays(trip): Trip
  setDayMeta(trip, dayId, patch): Trip
  addStop(trip, placement, stop): Trip
  updateStop(trip, stopId, patch): Trip
  removeStop(trip, stopId): Trip
  moveStop(trip, stopId, placement): Trip            // day↔day, day↔pool, reorder — one function
  scheduleFromPool(trip, stopId, hintOverride?): Trip // today's addOptional
  returnToPool(trip, stopId): Trip                    // today's removeSuggestion; MUST round-trip losslessly
  acceptCandidate(trip, ref, actorUserId, at): Trip
  rejectCandidate(trip, ref, actorUserId, at): Trip
  upsertBooking(trip, booking): Trip
  linkBooking(trip, stopId, bookingId): Trip
  resolveConflict(trip, resolution): Trip

  // derive     — pure, no Trip mutation
  computeLegs(day, ctx): (Leg|null)[]
  dayMovingMinutes(day, ctx): number
  clusterStops(stops, thresholdKm?): Stop[][]
  focusCluster(stops): FocusResult
  fitSpanKm(points): number
  MIN_SPAN_KM: number
  rollUpCost(scope, opts?): CostRollUp
  displayStatus(x): DisplayStatus
  cityRange(trip, cityKey): { from: IsoDate; to: IsoDate; nights: number }   // replaces hardcoded CITY_RANGE
  tripSummary(trip): { days, stops, nights, cities, byCity }

  // conflict
  detectConflicts(trip, ctx?): Conflict[]
  RULES: Record<RuleId, Rule>

  // validate
  validateTrip(trip): Issue[]

  // serialize
  toJSON(trip): TripDoc            // stable key order — byte-identical for an unchanged trip
  fromJSON(doc): Trip              // throws TripParseError with a path on malformed input
  SCHEMA_VERSION: 1
  migrateDoc(doc): TripDoc

  // import
  importLegacyDays(legacy, opts): { trip: Trip; issues: Issue[] }
```

`moveStop` doing day↔day, day↔pool and reorder in one function is deliberate: today those are three
functions (`moveStopToDay`, `removeSuggestion`, `reorderStopTo`) with three chances to disagree about what
happens to `sug`/`_optId`/`addHint`.

### 2.11 Migration: `DAYS` → core, exactly

The fixture is the whole point, so this mapping is normative. Measured against the live file: **16 days,
112 stops** (every one with coordinates), 5 multi-city days, 2 `flag` days, 3 `sugDay` days, 21 `sug` stops,
21 `badge` stops, 7 `ticket` stops, 49 costed stops, 30 booking links, 81 explicit `move` overrides,
**31 `OPTIONAL` pool items** (vienna 8, dubrovnik 3, split 3, prague 8, budapest 6, london 3), and
**95 `CITY_PLACES`** (vienna 15, dubrovnik 12, split 15, prague 25, budapest 21, london 7).

| Legacy | Core | Notes |
|---|---|---|
| `CONTENT_VERSION` | — | dropped; `Trip.revision` replaces it |
| `CITY_META[k]` | `City{key,name,meta.flagEmoji,meta.color}` | `centre` comes from `cityStops[]` in the overview map; `countryCode` is added by hand in the fixture |
| `CITY_ORDER` | `City.order` | |
| `CITY_RANGE` | **derived** via `cityRange()` | The importer MUST assert the derived value matches the hardcoded string for all six cities. A mismatch is a migration bug. |
| `MODES`, `COLORS`, `CAT_LABEL` | `packages/tokens` | Presentation. Core keeps only the `TravelMode` and `StopCategory` unions. |
| `d.id "08-13"` | `Day.id`/`date` = `"2026-08-13"` | Year comes from `opts.year` |
| `d.dow`, `d.d` | — | derived from `date` |
| `d.city` | `Day.primaryCity` | `"transit"` stays a legal value |
| `d.cities` | `Day.cities` | |
| `d.title`, `d.sub` | `Day.title`, `Day.subtitle` | |
| `d.sugDay: true` | `Day.provenance = {source:'system', state:'candidate', confidence:'inferred'}` | |
| `d.flag: true` | `Day.legacyFlag` **and** a `Conflict` of `ruleId:'legacy_flag'`, severity `blocker`, summary = `d.sub` | This is the migration's real work: the two hand-set red days become first-class conflicts. Aug 18 (corrected flight time, unverifiable ref) and Aug 20 (unconfirmed holiday hours). |
| `s.t` | `placement.time`; `"—"` → `null` | |
| `s.n`, `s.cat`, `s.note` | `Stop.name`, `.category`, `.note` | |
| `s.lat/s.lng` | `PlaceLink` | Name-match against `CITY_PLACES` first → `{kind:'place'}`; otherwise `{kind:'inline'}`. Every unmatched name is reported as a `warn` Issue, not silently inlined. |
| `s.cost` + `s.c` | `CostEstimate` | `display` = `s.cost` verbatim. `amounts` parsed from the display where the currency is explicit; where `c` disagrees with the display currency (the 10 CZK/$/£ stops), emit **two** entries is wrong — instead keep one `Money` in the *display's* currency and mark `confidence:'inferred'` on the stop, plus a `cost_basis_mixed` Issue. `"total"` in the display → `basis:'per_party'`. `"pp"` → `basis:'per_person'`. Default `per_person`. |
| `s.badge:"free"` | `Stop.flags += 'free'`, cost stays `null` | Deliberately **not** synthesised into `Money{0,0}` — today `dayCost` ignores badge-only stops, and the golden-parity test requires identical roll-ups. |
| `s.cat === 'trip'` | `Stop.flags += 'daytrip'` | matches today's badge logic |
| `s.move` | `Stop.arrival` | **inbound leg** |
| `s.sug: true` | `provenance {source:'system', state:'candidate', confidence:'inferred'}` | → `displayStatus === 'suggested'` |
| `s.book` | `Ticket{kind:'url'}` when `s.ticket`, else `Stop`-level `links` | |
| `s.ticket: true` + repo path | `Ticket{kind:'bundled', path}` | the two FlixBus PDFs |
| `s.ticket: true` + URL | `Ticket{kind:'url', verifiedBy:'user'}` for the GYG short link (Jacob confirmed it by hand; the proxy blocked verification), `verifiedBy:'fetch'` for the three that were checked | Provenance of *link verification* is data, per CLAUDE.md |
| `OPTIONAL[city].stops[i]` | `Stop` with `placement {kind:'pool', cityKey, hint}` | `addHint` → `hint`. `OPTIONAL[city].title/note` → `Trip.meta.poolNotes[city]` |
| `CITY_PLACES[city][i]` | `Place` | |
| `LOKRUM_PLACES` / `LOKRUM_LOOP` | **not migrated in Phase 1** | A sub-map of a single stop; §6. |

Two extra fixture inputs, transcribed by hand from `docs/BOOKINGS.md` (read-only) into
`fixtures/europe2026.bookings.json`, because the conflict rules need something to bite on and `DAYS` has no
booking records: the 8 transport bookings, 4 lodging bookings, and the GetYourGuide/CAT/City Walls/cable-car
tickets — including **YZGDTS twice** (16 Jul → Aug 18, 04 Aug → Aug 15, the second `supersedes` the first) and
IU1TUY/I54C9A with `confidence:'asserted'` and no `messageId`.

**Known fixture warts, which are features for the tester** — `validateTrip` and `detectConflicts` are expected
to report these on the unmodified fixture, and the expected output is committed as a golden file:
mixed cost bases (5 adults on the Danube cruise vs per-person everywhere else), 10 stops whose display
currency isn't EUR, two unverifiable booking references, no lodging in Budapest or London, and the two
legacy-flag days.

The extractor (`tools/extract-legacy.mjs`) reads `europe-2026-itinerary.html` **read-only**, evaluates the
constant block, and writes `fixtures/europe2026.legacy.json`. That JSON is committed, so the test suite never
depends on the live app file and nothing in the pipeline can write to it. Note for whoever writes the
extractor: use `lastIndexOf('<script>')`, not `indexOf` — `HISTORY.md` records that trap costing real time.

---

## 3. Module boundaries

```
waypoint/
  packages/
    core/          pure domain. zero runtime deps. no DOM, no fetch, no fs, no Date.now() in logic
                   (an injected clock), no randomness (an injected IdFactory).
    tokens/        colors, category labels, mode icons. Shared by web + native. No logic.
    client/        typed API client + offline cache + sync queue. Shared by web + native.
                   Knows about the network; knows nothing about rendering.
    ui/            cross-platform primitives only if they earn their keep. Default: don't.
  apps/
    web/           Vite + React. Planning, editing, public share pages, OAuth callback landing.
    mobile/        Expo SDK 56. Location, photo library, offline travel. The ONLY place
                   expo-location and expo-media-library may be imported.
  services/
    api/           Node 24 + Postgres/RLS. Auth, trips, social graph, permissions, ticket storage.
    ingest/        Mailbox polling + parsing. Writes IngestCandidate rows and nothing else.
                   Separate deploy unit, separate credentials, no write access to trip tables.
  db/              SQL migrations + RLS policies + the policy conformance test
  fixtures/        europe2026.legacy.json, europe2026.bookings.json, golden outputs
  tools/           extract-legacy.mjs and other one-shot scripts
  docs/            BRIEF, ARCHITECTURE, ROADMAP, BUILD-NOTES, QA-FINDINGS, REVIEW
```

Enforced dependency direction: `core` → nothing. `tokens` → nothing. `client` → core. `web`/`mobile` →
client, core, tokens. `api`/`ingest` → core. **Nothing imports `web` or `mobile`.** A lint rule (or a plain
test that walks imports) enforces it, because this is the boundary that rots first.

`services/ingest` having no write access to trip tables is a security boundary, not tidiness: it is the
component holding mailbox credentials, so it is the component that must not be able to modify an itinerary.

---

## 4. The four hard subsystems

### 4.1 Email ingestion

**Flow.** User connects a mailbox → `services/api` stores an encrypted refresh token (KMS, never in the
database in plaintext, never on a device) → `services/ingest` polls on a schedule (Gmail: `history.list`
incremental after the first sync) → a filter narrows to plausible booking mail by sender and subject →
parsers (structured JSON-LD first, then per-operator, then generic) extract fields → each match becomes an
**`IngestCandidate`**: extracted fields, a ≤500-character evidence snippet, the `messageId`, and a proposed
target `dayId`/`stopId` → the user sees a review queue → accepting writes a `Booking` and/or `Stop` with
`provenance {source:'email', state:'accepted', confidence:'confirmed', origin.messageId}`. Attachments are
fetched **only on acceptance**, then stored in the private bucket.

**Failure mode that matters most: a confident wrong parse that silently overwrites a correct plan.** The
Smartwings reissue is the live example — same reference, different ticket number, different date. A naive
parser sees "a booking for YZGDTS" and updates the existing one, and Jacob's Aug 15 quietly changes. The
design answer is structural, not defensive coding: ingestion **can only create candidates**. It has no write
path to `stops` or `bookings` at all (enforced by database grants, per §3). A candidate that matches an
existing booking by `operator + reference` is presented as a *reissue* with both versions side by side and
the diff highlighted; the user picks. `HISTORY.md` Pass 5 is exactly what happens when software infers this.

Secondary failure: the OAuth wall. Restricted-scope Gmail access needs CASA Tier 2 (≈$540–$1,000, 4–12 weeks);
the no-verification path caps at 100 test users and **expires refresh tokens after 7 days**, which breaks
unattended polling by design. **This is a decision for Jacob**, and the roadmap treats it as a gate:
(a) accept a weekly re-consent tap for a tens-of-users audience, (b) start CASA early and pay, or
(c) ship a forward-to-an-address inbox first and defer OAuth entirely. Option (c) is my recommendation for
the first working version — it has no OAuth surface at all and no refresh tokens to protect.

### 4.2 Social graph and sharing permissions

**Flow.** `Friendship` is a bidirectional accepted edge. `TripShare` grants a principal (a user, or a link
token) one of `viewer | commenter | editor` on a trip, with `expiresAt` and `revokedAt`. `TripMember` is
co-ownership. Importing is explicit and produces provenance: `forkTrip` copies a whole trip with every stop
marked `{source:'friend', state:'candidate', origin.sourceTripId}`; `importStop` does one stop the same way.
An imported stop is badged as the friend's until accepted, and the credit link survives acceptance.

Enforcement is two-layer: pure predicates in `core/access` (`canView(ctx, trip)`, `canEdit(ctx, stop)`, …)
that the API calls, **and** Postgres RLS policies that the database enforces regardless. A conformance test
generates a matrix of (principal × relationship × operation) and asserts the predicate and the policy agree
on every cell. Where they disagree the build fails.

**Failure mode: revocation is not retroactive.** A revoked friend cannot fetch again, but bytes already on
their device are gone from our control. Two responses. (1) Honest scope: sharing sends a **snapshot at share
time**, not a live feed, so the exposure is bounded by what was true when it was shared. (2) Client contract:
cached shared trips carry `shareId` + server ETag and MUST revalidate on open with a **hard fail — a revoked
share renders an error, never stale content**, even offline. The tester should attack precisely this: pull a
share, revoke it, go offline, reopen. The correct behaviour is a refusal.

### 4.3 Location tracking

**Flow.** Native only. The user starts tracking for a trip. `expo-location.startLocationUpdatesAsync` with a
TaskManager task writes fixes to a local SQLite table (`expo-sqlite`), balanced accuracy, distance filter
~25 m, on iOS with `UIBackgroundModes: location` and on Android as a foreground service with a persistent
notification. On-device, `segmentTrace()` (in core, pure) turns fixes into dwell segments and travel
segments; dwell segments near a stop's coordinates within its time window become an `observedAt` annotation.
Nothing is uploaded. If the user taps *share today's path*, the device runs Douglas–Peucker simplification
(~50 m tolerance), drops fixes inside a configurable home/private radius, and uploads a **`SharedTrace`**: one
polyline, one day, one trip, visible only to that trip's members.

**Failure mode: iOS silently stops the task and the map shows a straight line across the Adriatic.** iOS
terminates background tasks under memory pressure, and the user may downgrade *Always* to *While Using* mid-trip.
The design must treat a trace as **inherently gappy**: segments carry `confidence` and explicit `gap` markers,
and the renderer draws gaps as dashed and unclaimed rather than interpolating. A trace that pretends to be
continuous is worse than one that admits holes — the same principle as flagging conflicts instead of guessing.
Android's counterpart: aggressive OEM battery managers kill foreground services; detect a long gap on resume
and tell the user plainly rather than silently losing the day.

### 4.4 Photo association

**Flow.** Native only. With library permission, `expo-media-library.getAssetsAsync` enumerates assets created
inside the trip window (`createdAfter` / `createdBefore`) — **identifiers and timestamps only, no bytes**.
For each, `getLocationAsync`/`getExifAsync` gives coordinates (Android additionally needs
`ACCESS_MEDIA_LOCATION`, or coordinates come back empty with no error — the single most likely silent bug in
this subsystem). Matching runs on-device in core: `suggestPhotoStops(assets, day, trace)` scores each asset
against stops by time window first, then distance, then the location trace where one exists, and returns
suggestions with a confidence and the reason. Suggestions are `provenance {source:'system', state:'candidate'}`
— they show as suggestions until the user accepts. Accepting a photo *into a shared trip* uploads that one
image, with **EXIF GPS stripped before upload** unless the user opts in per photo.

**Failure mode: a photo with no EXIF at all** (screenshots, saved images, anything shared through a
metadata-stripping app — and on Android, everything, if `ACCESS_MEDIA_LOCATION` is missing). The matcher must
degrade to time-only matching with reduced confidence and must never assert a location it does not have. The
second failure mode is a privacy one: iOS 14+ *limited* library selection returns a partial library and the
correct response is to work with what is granted and say so, never to nag for full access.

---

## 5. Privacy and trust — where the line actually sits

Concrete, per data class. "Server" means our Postgres/object storage. "Never" means there is no code path,
in any phase, that transmits it.

| Data | On device | Reaches the server | Never transmitted |
|---|---|---|---|
| **Raw location fixes** (lat/lng/accuracy/speed/heading, every ~25 m) | Encrypted SQLite, retained until trip end + 30 days, wiped by one button in settings | **Nothing.** No batch, no crash report, no analytics event. | the fix stream, in every phase |
| **Dwell/visit inference** ("at Buža Bar 19:31–20:44") | computed on device | only the *result* if the user attaches it: `{stopId, confidence}` — never the coordinates or timestamps behind it | the underlying cluster |
| **Simplified day trace** | derived on demand | only on an explicit per-day "share my path" tap: one simplified polyline, scoped to one trip, readable only by that trip's members, deletable, and re-uploaded never | anything outside the shared day |
| **Home / private-zone fixes** | excluded before simplification by radius | never, even inside a shared day | — |
| **Photo library enumeration** (ids, timestamps, GPS, thumbnails) | in memory / local index only | **Nothing.** | the library index, in every phase |
| **A photo the user attaches to a shared trip** | original stays in the library | the bytes of that one image + `stopId`, **EXIF GPS stripped by default**, per-photo opt-in to keep it | every photo not explicitly attached |
| **Mailbox refresh token** | never on a device | encrypted at rest under KMS, decryptable only by `services/ingest` | to any client, ever |
| **Message bodies** | — | held in a scan buffer, encrypted, **deleted within 24 h** of parsing | retained bodies, full-text search over the mailbox, any body content in logs |
| **What survives a scan** | — | `messageId`, sender, date, the extracted fields, and a **≤500-char evidence snippet** so the user can see why we proposed something | the rest of the message |
| **Ticket attachments** | — | fetched and stored **only after the user accepts the candidate**; private bucket, signed URLs ≤15 min | attachments of rejected/unreviewed candidates |
| **Friends' itineraries** | cached only while the share is live; revalidated on open, hard-fail on revoke | — | — |

Cross-cutting rules the tester should treat as assertions:

1. **No coordinates in any log line, ever.** Log `stopId`, never `lat/lng`. Same for mailbox content and
   booking references. A `grep` for coordinate-shaped floats in the logging paths is a legitimate test.
2. **No third-party analytics or crash reporter in `apps/mobile` while location or photo code is present**
   unless it is configured with an explicit allowlist of event fields. Default: none.
3. **Delete means delete.** Deleting a trip deletes its shared traces and attached photos server-side within
   24 h; deleting a mail connection deletes the token, the scan buffer, and all unaccepted candidates
   immediately.
4. **Nothing about location or photos is server-authoritative.** If the server database were dumped, it would
   contain zero raw traces and zero library metadata. That is the property being bought.
5. Location and library permission prompts must state the on-device-only guarantee at the point of asking.

---

## 6. Explicitly deferred

- **Timezones and UTC instants.** Every time in the model is local wall-clock, exactly as today. The Europe
  2026 trip crosses CEST, CEST, CEST and BST, and the current app handles it by writing local times and never
  computing across midnight. Real instants are needed for a live "up next" across timezones and for photo
  matching (a photo's EXIF timestamp is UTC + an offset). Deferring means: **core carries an optional
  `Day.tzId` that nothing reads yet**, so adding it later is not a schema migration. Revisit in Phase 5.
- **Real-time collaboration / CRDTs.** Phase 3 is last-writer-wins per stop with a revision guard. Two people
  editing one stop simultaneously is not a problem tens of users have.
- **Sub-maps of a single stop** (`LOKRUM_PLACES` / `LOKRUM_LOOP`). A curated walking loop inside one stop is a
  real feature but it is a second nesting level in the model; it stays hand-authored in the old app until
  something else needs it.
- **Opening hours as a general system.** `Place.hours` exists and one rule uses it, but a full hours grammar
  (seasonal, holiday, "Thu till 21:00, closed Mondays Oct–May") is a project of its own. Phase 1 supports
  simple weekly ranges and treats everything else as unknown — and unknown never produces a conflict.
- **Currency conversion.** Core reports per-currency subtotals and refuses to invent rates. A rate provider
  is a Phase 3 concern with a stored `rateSetId` so a total is always reproducible.
- **Booking/payments, chat, recommendation ML, offline map tiles, multi-tenant anything** — the brief's
  non-goals, restated so nobody re-adds them.
- **Public web share pages with SEO/OG rendering.** Phase 3 at the earliest; they are the one surface where a
  permission bug is publicly visible, so they get their own attack pass.
