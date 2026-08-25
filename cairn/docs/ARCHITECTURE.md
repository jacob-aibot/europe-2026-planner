# Cairn — Architecture

Stage 1 output. Inputs: `cairn/docs/BRIEF.md`, Jacob's answers to the open questions (2026-08-24 and
2026-08-25), the root `CLAUDE.md`, and `europe-2026-itinerary.html` — the working proof of the format.

**Revision 2, 2026-08-25.** The Phase 1 review (`REVIEW.md`) sent five design defects back here. What
changed, and where: `Stop.travelRole` and the schedule rules that read it (§2.12); one geography
mechanism replacing two implementations (§2.13); the import and stop-copy contract, replacing
`forkTrip` (§2.14); sample-data redaction (§6.6); and, in `ROADMAP.md`, how an acceptance criterion is
allowed to be written. Every number in the new sections was measured against the live planner, not
reasoned about; the measurements are in the sections themselves.

**Phase 1 is §2 and §4.** Everything else is the shape those two must not foreclose. See `ROADMAP.md`.

## Read only your sections

This document is ~15k tokens. Nothing needs all of it, and a fresh agent that reads it whole starts a third
of the way into its context before writing a line. Pull what you need:

```bash
cairn/tools/doc-section ARCHITECTURE 2 4     # prints §2 and §4 only
cairn/tools/doc-section ARCHITECTURE         # lists the sections and their sizes
```

| § | Contents | ≈ cost | Who needs it |
|---|---|---|---|
| 0 | Five positions, stated up front | <1k | everyone — read it, it is 20 lines |
| 1 | Stack decision and the capability checks behind it | 3k | architect. Settled; do not re-litigate |
| 2 | **Domain model — the builder's contract.** §2.12 `travelRole`, §2.13 geography and §2.14 import/copy are new in revision 2 and are where the Phase 1 rework lives | 12k | builder, breaker |
| 3 | Module boundaries | <1k | builder |
| 4 | **The Phase 1 client** | 2k | builder |
| 5 | The four hard subsystems | 1k | breaker; builder from Phase 3 on |
| 6 | Privacy, authorization, deletion cascade | 2k | breaker, manager; builder for §6.2 |
| 7 | Explicitly deferred | <1k | anyone about to build something not in the roadmap |

Read the whole document when you are the manager, when you are changing the design, or when a change
crosses a section boundary. Otherwise this table is the contract.

---

## 0. Five positions, stated up front

1. **The brief's two hard constraints hold, and one is worse than the brief says.** They force a native
   shell for pillars 4 and 5 — not a native-first architecture. Jacob has confirmed the end state:
   Expo/React Native on the phone, a web companion for desktop planning and share links friends can open
   without installing. §1.
2. **Days are stored. Stops belong to days by an explicit edge, not by timestamp.** §2.3.
3. **Location traces and photo metadata never leave the device** unless the user explicitly shares one day's
   simplified path. Raw fixes, EXIF and library enumeration have no server counterpart in any phase. §6.1.
4. **Public-grade on what is expensive to retrofit, friends-grade on everything else.** Concretely, four
   things are designed now and nothing else is: authorization on every read path, ownership on every row,
   deletion and export as a designed cascade, and minimum-scope parse-then-discard mail handling. §6.
5. **A blocker is a thing Jacob must act on, and a rule that cannot catch its own bug does not ship.**
   Added after Phase 1 shipped 12 blockers of which 3 were real and a coordinate rule that could not see
   the coordinate typo it was written for. Two consequences run through §2.7, §2.12 and §2.13: a rule that
   cannot distinguish "the data says something impossible" from "the data is shaped oddly" degrades to a
   warning rather than asserting a defect, and every rule ships with an **injected-fault criterion** —
   the exact fault it exists to catch, and the exact output it must produce. `ROADMAP.md` "How a criterion
   is written".

---

## 1. Stack decision, driven by constraints

### 1.1 What I actually verified

Checked 2026-08-24. **Caveat on method:** this session's egress proxy blocked direct `WebFetch` to
`developer.mozilla.org`, `caniuse.com`, `bugs.webkit.org`, `docs.expo.dev`, `webkit.org` and several others,
so most rows below are search-result summaries of those sources rather than pages read end to end. Rows
marked **⚠ NEEDS DEVICE CHECK** are ones I would not bet a schedule on without a physical iPhone.

| Capability | State as of Aug 2026 | Consequence |
|---|---|---|
| **Background geolocation, web** | Not available. `watchPosition()` stops reporting when the screen is off; backgrounded, iOS may power the GPS down under its own rules. No spec, no vendor roadmap; W3C device-APIs discussion still open as of Jun 2025. | Pillar 4 impossible in a browser. Confirms the brief. |
| **Geolocation in an *installed* iOS web app** | Reports since iOS 26 that geolocation is **denied outright** in home-screen web apps while working in the same page in Safari. iOS 26 also made every "Add to Home Screen" default to web-app mode. ⚠ NEEDS DEVICE CHECK | *Worse than the brief.* Even a foreground "record while open" web fallback is unreliable on iOS. Kills the "PWA now, native later" hedge. |
| **Background Sync API** | Not implemented in WebKit, not on Apple's roadmap. Periodic Background Sync is Chromium-only. | No PWA can flush a queued trace or poll a mailbox while closed, on any iOS browser (all are WebKit). |
| **Did anything move in Safari 26?** | Checked the Safari 26.0 / 26.2 / 26.4 feature posts and 18.4's additions. What landed: Declarative Web Push, Screen Wake Lock (18.4), CSS work. What did **not**: background geolocation, Background Sync, any photo-library API, local-disk file access. | **Nothing has moved that changes the native/web split.** The brief's assumption holds a year on. |
| **Screen Wake Lock** | iOS Safari from **16.4**; broken specifically in installed home-screen web apps until Apple fixed it in **18.4** (WebKit #254545). | A foreground, screen-on web live-path is viable on Android/desktop and current iOS. The web app is a degraded mode for pillar 4, not a dead end. |
| **File System Access API** | Safari supports **only** the Origin Private File System (15.2+). `showOpenFilePicker` / `showSaveFilePicker` / `showDirectoryPicker` are Chromium-only everywhere. | No local trip files or ticket vault in Safari. Web export is a download; web import is `<input type=file>`. §4.4. |
| **Photo library enumeration, web** | No API in any browser, by design. The platform offers a *picker* only. Same restriction Google applied when it removed the broad Photos library scope in Mar 2025. | Pillar 5's auto-suggest impossible in a browser. Confirms the brief. |
| **EXIF on iOS Safari uploads** | iOS strips sensitive EXIF — including GPS — from photos uploaded through a Safari file input (WebKit #207088, long-standing, unresolved). | *A second reason the brief doesn't give.* Even the manual-picker fallback cannot get coordinates on iOS. There is no partial web version of pillar 5. |
| **iOS storage eviction** | Script-created storage deleted after 7 days without interaction — but **home-screen web apps keep their own days-of-use counter** and are not expected to be evicted. | An installed web app can hold a trip offline. A tab cannot. Ship `apps/web` installable. |
| **Expo / React Native** | **SDK 56**, released 2026-05-21: RN 0.85, React 19.2, Hermes v1 default, New Architecture assumed (RN 0.83+ is New-Arch-only). `expo-sqlite` gained session changesets on both platforms. | Native shell is on a current supported line; changesets are a plausible sync primitive later. |
| **Background location, native** | `expo-location.startLocationUpdatesAsync` + `expo-task-manager`; config-plugin flags `isIosBackgroundLocationEnabled` (adds `location` to `UIBackgroundModes`) and `isAndroidBackgroundLocationEnabled` (adds `ACCESS_BACKGROUND_LOCATION`); Android runs a foreground service. | Pillar 4 is first-party in Expo. |
| **Photo library, native** | `expo-media-library.getAssetsAsync` enumerates; `getExifAsync`/`getLocationAsync` return coordinates. Android additionally requires `ACCESS_MEDIA_LOCATION` or coordinates come back **empty with no error**. | Pillar 5 is first-party in Expo. That Android permission is the most likely silent bug in the whole product. |
| **Gmail scope tiers** — *confirmed at the coordinator's request* | `gmail.readonly` is a **restricted** scope. So is `gmail.metadata`. (Google's console has historically mislabeled `readonly` as merely "sensitive"; the policy FAQ corrects it.) An app's classification is its **most restrictive scope**. | **There is no narrow Gmail read scope that escapes the restricted tier.** "Just ask for less" is not an available mitigation. §6.4. |
| **Gmail restricted-scope gate** | Restricted scopes + the ability to access data *through a third-party server* (our ingest worker, by definition) ⇒ a **CASA** security assessment by a Google-empanelled lab, with **annual revalidation**. Tiers are built on OWASP ASVS: T1 self-assessment, T2 third-party DAST (2026 self-serve lab fees ≈ **$540–$1,000**), T3 full manual pentest. Unverified/"Testing" avoids all of it but caps at **100 test users** and **expires every refresh token after 7 days**. | The coordinator's suspicion is correct: **Gmail OAuth is a hard gate on going public.** It shapes the ingestion design and the phase order. §5.1, §6.4. |
| **Microsoft / Outlook equivalent** | Microsoft Graph `Mail.Read`. **Publisher verification is free** and no license is required; it removes the "app is not commonly used" warning and clears risk-based step-up consent, which otherwise blocks unverified multitenant apps registered after 2020-11-08. **No mandatory third-party security assessment.** Microsoft 365 Certification (annual independent audit incl. pentest) exists but is **optional**, aimed at enterprise/marketplace. | **Materially cheaper path to a public launch than Gmail.** Outlook can ship publicly before Gmail does. §6.4. |

Sources: [PWA iOS limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) ·
[WebKit features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) ·
[WebKit features for Safari 26.2](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/) ·
[caniuse: Background Sync](https://caniuse.com/background-sync) ·
[caniuse: Periodic Background Sync](https://caniuse.com/wf-periodic-background-sync) ·
[caniuse: Wake Lock](https://caniuse.com/wake-lock) ·
[WebKit #254545 — wake lock in home-screen web apps](https://bugs.webkit.org/show_bug.cgi?id=254545) ·
[WebKit #207088 — iOS uploads strip EXIF](https://bugs.webkit.org/show_bug.cgi?id=207088) ·
[Apple Developer Forums — iOS 26 PWA geolocation](https://developer.apple.com/forums/thread/804381) ·
[WebKit — updates to storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) ·
[File System Access browser support](https://www.testmuai.com/learning-hub/file-system-access-api-browser-support/) ·
[Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56) ·
[expo-location](https://docs.expo.dev/versions/latest/sdk/location/) ·
[expo-media-library](https://docs.expo.dev/versions/latest/sdk/media-library/) ·
[Google — restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) ·
[Google — restricted scopes list](https://support.google.com/cloud/answer/13464325) ·
[Google — security assessment](https://support.google.com/cloud/answer/13465431) ·
[App Defense Alliance — CASA](https://appdefensealliance.dev/casa) ·
[Google — manage app audience / test users](https://support.google.com/cloud/answer/15549945) ·
[Google OAuth refresh-token expiry in Testing](https://www.unipile.com/google-oauth-refresh-token/) ·
[Microsoft — publisher verification](https://learn.microsoft.com/en-gb/entra/identity-platform/publisher-verification-overview) ·
[Microsoft 365 App Compliance Program](https://learn.microsoft.com/en-us/microsoft-365-app-certification/overview) ·
[Node.js EOL schedule](https://endoflife.date/nodejs) ·
[Node.js TypeScript support](https://nodejs.org/api/typescript.html) ·
[Node.js test runner](https://nodejs.org/api/test.html).

### 1.2 What each option kills

| Option | What it kills |
|---|---|
| **PWA only** (extend the current HTML) | Pillar 4 outright (no background location on any iOS browser; Android suspends too). Pillar 5 outright (no enumeration API anywhere; iOS strips EXIF even from picked files). Offline-reliable mail polling. **Rejected.** |
| **Native Swift + native Kotlin** | Nothing capability-wise — it is the ceiling. Kills the schedule: two platform codebases plus a web app plus a server for an audience of tens, with domain logic in three languages. That is the exact drift the `DAYS` array was invented to prevent. **Rejected.** |
| **Capacitor / web-in-a-shell** | Keeps the existing HTML nearly intact; community background-geolocation plugins exist. Gets thin on photo-library enumeration + EXIF through a plugin bridge, and leaves offline storage on the same WebKit rules that already bit this project. Viable, not chosen. |
| **Expo/RN phone app + TypeScript web companion + TypeScript server** ✅ | Nothing in the brief. Costs a native rebuild of the UI — the existing HTML stays as reference and is not ported. Confirmed by Jacob. |

### 1.3 The decision

- **`packages/core`** — pure TypeScript. Zero runtime dependencies, no DOM, no `fetch`, no `fs`, no clock, no randomness.
- **`packages/client`** — the trip store, ports and selectors. Platform-agnostic, no DOM, no React. Runs in plain Node.
- **`apps/web`** — Vite + React + TypeScript. Desktop planning, public share pages, OAuth callbacks. Installable.
- **`apps/mobile`** — Expo SDK 56 / RN 0.85. Location, photo library, offline travel.
- **`services/api`** — Node 24 + Postgres with row-level security, managed auth and object storage.
- **`services/ingest`** — a worker in the same runtime; **separate deploy unit, separate credentials, no write grant on trip tables**.

Runtime floor everywhere: **Node 24 LTS**. `core` and `client` are written so `node --test` runs their `.ts`
files directly via type stripping — so they may not use enums, parameter properties, namespaces, or anything
else `erasableSyntaxOnly` rejects. That is a hard constraint on the builder and the reason the tester needs
no toolchain, no browser, and no device to attack the model *and* the state machine.

**The constraint that forced the stack** is not background location alone — that only proves "some native
code exists". It is background location **and** photo-library enumeration **and** a server-side mail worker
**and** a browser planning surface, all needing to agree on what a trip is, on a budget of one builder.
Four surfaces, one domain model, one language.

**What does *not* have to wait for the native shell** — worth stating, because it decides the phase order:
multi-trip planning and editing, maps, cost roll-ups, conflict surfacing, mail-derived candidates, friends,
sharing, and public share links friends open without installing anything. Only the live path (pillar 4),
the photo library (pillar 5), and genuinely-offline travel need the phone. That is why Phase 1 ends with a
usable web client and the native app is Phase 4.

**On managed Postgres, which the brief asked me to cost:** take it, and take row-level security specifically.
Jacob's answer makes this non-negotiable — "retrofitting authz is the worst migration in this product" is
correct, and RLS is how you avoid it. But RLS is the *enforcement* layer, not the *definition* layer. The
rules are pure functions in `packages/core/access`; the policies are tested against them by a conformance
matrix (§6.2). Otherwise the tester can only attack policies against a live database and every phase before
Phase 2 loses its plain-Node property.

### 1.4 Where I disagree with the brief

1. **"The end state is a native app, so the design must not paint itself into a browser."** Half right, and
   Jacob's answer settles it: native app *with a web companion*. The design is core-first; the web app is a
   permanent first-class surface, not a stepping stone.
2. **"A PWA cannot do [background location] on iOS at all."** True and understated — since iOS 26 there are
   credible reports geolocation is refused in installed home-screen web apps even in the foreground.
3. **Photo library.** The brief's reason is correct but incomplete: iOS also strips GPS EXIF from picked
   files, so there is no reduced web version of pillar 5 at all.
4. **Email ingestion.** The brief's reasoning is right and the coordinator's suspicion is confirmed — with
   one correction that makes it *worse* than assumed: **every** Gmail read scope is restricted, including
   `gmail.metadata`, so minimising scope does not escape the gate. And one that makes it better: **Microsoft
   Graph has no CASA equivalent and publisher verification is free**, so Outlook is the cheaper first
   provider for a public launch. §6.4.
5. **`LocationPoint` / `LocationSegment` in the brief's entity list** read as server tables. Here they are
   device-local types with no server counterpart. The only location entity that exists server-side is
   `SharedTrace`, which is a coarser, opt-in, per-day thing. §6.1.

---

## 2. Domain model — the core specification

This section is the builder's contract. Where it says MUST, the tester will check it.

### 2.1 Conventions

- Ids are opaque strings. Core never generates them; an `IdFactory` is injected so tests are deterministic.
- Dates are `YYYY-MM-DD`. Times are `HH:MM` 24h **wall-clock at the stop's location**, or `null`. Core stores
  no UTC instants and does no timezone maths — §7.
- All build functions are **pure and immutable**: `(trip, args) => Trip`. Nothing mutates in place.
- Core throws only on programmer error. Domain problems are returned as `Issue[]` or `Conflict[]`, never thrown.
- **Every `*Patch` type is enforced at runtime by an explicit key allowlist, not by TypeScript.**
  `Partial<Omit<Stop,'id'|'placement'>>` is a compile-time comment; `{...s, ...patch}` honours none of it.
  Every patch-taking build function iterates the patch's own keys, throws `TypeError` on a key outside its
  allowlist, and throws on the forbidden keys by name. For `updateStop` the forbidden keys are `id`,
  `placement` and `provenance`: identity is not editable, placement goes through `moveStop`, and provenance
  transitions go through `acceptCandidate` / `rejectCandidate` / `copyStopInto` and nowhere else. *(This
  confirms the invariant F-7 asked about: the acceptance gate is not optional, and Phase 3's ingest worker
  is exactly the caller that must not be able to route around it.)*
- **Every user-facing string core produces carries structured `params` beside it** (`Conflict.summary` +
  `Conflict.params`, `Issue.message` + `Issue.params`). i18n is deferred, but generating English-only strings
  with no structured data behind them is exactly the kind of thing that is expensive to retrofit. §7.

### 2.2 Entities

```ts
type Trip = {
  id: TripId;
  title: string;
  ownerId: UserId;               // present from Phase 1; a local-only sentinel until accounts exist
  startDate: IsoDate;            // inclusive
  endDate: IsoDate;              // inclusive
  homeCurrency: Currency;
  homeBase: { name: string; at: LatLng } | null;   // where the trip starts and ends from — §2.13
  party: { adults: number; children: number };
  cities: City[];                // ordered
  days: Day[];                   // dense over [startDate,endDate]; MUST have no gaps
  pool: Stop[];                  // unscheduled stops — the generalisation of OPTIONAL
  places: Place[];               // the map-pin superset — generalisation of CITY_PLACES
  bookings: Booking[];
  resolutions: ConflictResolution[];
  revision: number;              // monotonic; bumped by every build function
  schemaVersion: 1;
};

type City = { key: CityKey; name: string; countryCode: string; centre: LatLng; order: number;
              meta?: { flagEmoji?: string; color?: string } };

type Day = {
  id: DayId;                     // MUST equal the date: "2026-08-13"
  date: IsoDate;
  primaryCity: CityKey | 'transit';   // editorial, not derivable
  cities: CityKey[];             // MUST include primaryCity
  title: string; subtitle: string;
  stops: Stop[];
  provenance: Provenance;
  legacyFlag?: boolean;          // migration only, §2.11
};

type Stop = {
  id: StopId;
  placement: StopPlacement;
  name: string;
  category: StopCategory;        // 'sight'|'food'|'night'|'trip'|'transit'|'stay'|'suggest'
  place: PlaceLink;
  note: string;
  cost: CostEstimate | null;
  arrival: MoveOverride | null;  // the travel attached to this stop — §2.5 for the maths,
                                 // §2.12 for what it MEANS
  travelRole: TravelRole;        // 'transfer' | 'journey' | 'unknown' — §2.12. Default 'transfer'.
  bookingId: BookingId | null;
  flags: StopFlag[];             // 'free' | 'daytrip' | ... — display badges only
  provenance: Provenance;
  durationMins: number | null;   // null = unknown; never guessed
};

type StopPlacement =
  | { kind: 'scheduled'; dayId: DayId; time: ClockTime | null; order: number }
  | { kind: 'pool'; cityKey: CityKey; hint?: { dayId: DayId; time: ClockTime } };

type PlaceLink =
  | { kind: 'place'; placeId: PlaceId }
  | { kind: 'inline'; at: LatLng }
  | { kind: 'none' };            // MUST be supported end-to-end

type Place = { id: PlaceId; cityKey: CityKey; name: string; at: LatLng;
               category: StopCategory; note?: string; links?: Link[]; hours?: OpeningHours };

type Booking = {
  id: BookingId; tripId: TripId;
  kind: 'flight'|'bus'|'train'|'ferry'|'lodging'|'tour'|'ticket'|'other';
  operator: string; reference: string | null;
  route?: { fromName: string; toName: string };
  startsAt: { date: IsoDate; time: ClockTime | null };
  endsAt?:   { date: IsoDate; time: ClockTime | null };
  price: CostEstimate | null; party: number | null; seat?: string;
  status: 'active' | 'superseded' | 'cancelled';
  supersedesId?: BookingId;      // the YZGDTS reissue — NOT a duplicate
  ticket: Ticket | null;
  provenance: Provenance;
};

type Ticket =
  | { kind: 'bundled'; path: string; label: string }        // a file we host — cannot 404
  | { kind: 'url'; href: string; label: string; verifiedAt: IsoDate | null; verifiedBy: 'fetch'|'user'|null }
  | { kind: 'attachment'; mailMessageId: string; filename: string; label: string };
```

**Ownership and tenancy, from Phase 1.** `Trip.ownerId` exists before accounts do, carrying the sentinel
`local:self` until Phase 2 rewrites it at first sign-in. Nested entities inherit tenancy from their trip in
core; when they become rows in Phase 2 **every table carries a non-null `trip_id` or `user_id`** and RLS keys
off it. There is no table without a tenancy column, and no blob without a tenancy prefix. §6.2.

Server-authoritative vs client-local:

| Entity | Authority | Note |
|---|---|---|
| `User`, `Friendship`, `TripShare`, `TripMember` | **Server only.** | Permissions are not enforceable client-side. Clients cache read-only and MUST revalidate. |
| `Trip`, `Day`, `Stop`, `Place`, `Booking` | Server-authoritative from Phase 2; client-replicated and offline-editable. In Phase 1 the client *is* the authority. | Last-writer-wins per stop with a revision guard. |
| `Ticket` bytes | Server object storage, private bucket, keyed `trip/{tripId}/…` | Bundled tickets are repo files today; that pattern survives as "an asset we host". |
| `Conflict` | **Derived. Never stored.** | Only `ConflictResolution` is stored. §2.7. |
| `Leg`, cost roll-ups, clusters, `CITY_RANGE` | **Derived. Never stored.** | §2.5. |
| `MailAccount`, `IngestCandidate` | Server only. | §5.1. |
| `LocationFix`, `LocationSegment`, `PhotoAsset` | **Device only. No server table exists.** | §6.1. |
| `SharedTrace` | Server, opt-in per day. | The only location data ever transmitted. |

### 2.3 Position: days are stored; stop→day is an explicit edge

**Days are stored.** Deriving them from `[startDate, endDate]` plus stop timestamps loses four things the
Europe 2026 trip actually contains:

1. **Editorial city assignment.** Aug 12 starts in Dubrovnik at 06:50 and ends in Split; the app calls it a
   *Split* day. Five of sixteen days are like this. Nothing derives "which city is this day *about*" — and
   `pickDay()` already depends on it, deliberately, so a Vienna add-on doesn't land on the transit day.
2. **Day-level prose that isn't a function of its stops.** Aug 9's subtitle explains why the day is *empty*.
   `CLAUDE.md` forbids filling it. Derived days have nowhere to put that.
3. **Empty days.** A rest day with zero stops must exist, be titled, and be navigable.
4. **Day-level provenance.** Three days are wholly our draft (`sugDay`).

The dangerous half of "stored" is drift. Core closes it: `days` MUST be dense over `[startDate,endDate]`,
`Day.id === Day.date`, and any build function changing trip dates calls `ensureDays()`. `validateTrip` fails
on a gap. Stored for the editorial content; generated and invariant-checked for the skeleton.

**Stop→day is an explicit edge.** The LAX→Frankfurt flight departs 16:45 Aug 7 and lands 13:00 Aug 8; it
belongs to Aug 7. Deriving membership from an instant puts overnight legs on the wrong card.

### 2.4 Stop ordering

`(timeVal(time), order)` ascending, `timeVal(null) = +∞` — untimed stops last, in insertion order. `order`
exists because Jacob can drag stops into an order that contradicts their times, and that must survive.
`insertStopSorted` inserts before the first stop with a strictly greater time — a port of today's behaviour.

### 2.5 Legs, clusters and cost — all derived

```ts
computeLegs(day: Day, ctx: TripCtx): (Leg | null)[]   // index-aligned with day.stops
type Leg = { mode: TravelMode; mins: number; km: number | null; source: 'override' | 'estimate' };
```

A **byte-exact port** of `legBetween`. The tester will diff against the running page; do not improve it:

- `arrival` override wins; `km` is still the haversine to the previous stop, or `null` if a coordinate is missing.
- Otherwise, if either stop lacks coordinates → `null`. `km < 0.12` → `null`.
- `km <= 1.6` → `{ mode:'walk',    mins: max(2, round(km * 1.35 / 4.8 * 60)) }`
- `km <= 9`   → `{ mode:'transit', mins: max(8, round(km * 1.25 / 17  * 60) + 6) }`
- else        → `{ mode:'taxi',    mins: round(km * 1.2 / 50 * 60) + 5 }`
- Haversine with R = 6371 km.

**For leg arithmetic, `arrival` is read exactly as today's `move`: `legBetween(prev, s)`.** This is the
easiest thing in the model to implement backwards; the migration test asserts Aug 12's FlixBus leg is 245
min *arriving at Split*. **`computeLegs` reads `arrival` and nothing else, and MUST NOT read
`travelRole`** — golden parity against the live page depends on it. What `arrival` *means* — a transfer into
the stop, or the vehicle's own run departing at the stop's time — is `travelRole`, it is additive, and only
the conflict rules and the view layer read it. §2.12.

```ts
clusterStops(stops, thresholdKm = 90): Stop[][]
focusCluster(stops): { focus: Stop[]; groups: Stop[][]; split: boolean; spanKm: number }
fitSpanKm(points): number
MIN_SPAN_KM = 1.2
```

Straight ports, including the heuristic that the cluster containing the *last* stop wins if it is within one
of the largest, and the fallback when the winner has fewer than two points. **The min-span guard moves into
core** — it currently lives inside `applyDayFit()` in the view layer, and `CLAUDE.md` records that both map
bugs came from view-layer map maths. Every map surface takes bounds from core so neither can regress
independently. Core does not know what a map is; it returns points and a span. §4.4.

```ts
rollUpCost(scope, opts?): CostRollUp
type CostRollUp = {
  byCurrency: Record<Currency, { lo: number; hi: number }>;
  converted: { currency: Currency; lo: number; hi: number; rateSetId: string } | null;
  missingRates: Currency[];
  basisWarnings: string[];
};
```

**Core never invents an exchange rate.** With no `RateTable` it reports per-currency subtotals and lists what
it could not convert.

### 2.6 Money

Today a stop carries `cost:"€90–113"` (display) plus `c:[90,113]` (numeric, assumed EUR). Across the 112
stops that produces four real defects:

- `"~450 CZK"` → `c:[18,18]` and `"~100 CZK"` → `c:[4,4]` — hand-converted at an unrecorded rate and date.
- `"$159.98pp"` → `c:[160,160]` — per-person, currency silently wrong.
- `"$573.25 total"` → `c:[573,573]` — a *party* total for 5 adults summed alongside per-person amounts.
- `"Gardens free · palace €15–24"` → `c:[0,24]` — one string encoding two products.

```ts
type Money = { lo: number; hi: number; currency: Currency; basis: 'per_person' | 'per_party' };
type CostEstimate = { amounts: Money[]; display: string | null; note?: string };
```

`amounts` is a list so "gardens free, palace €15–24" is two entries. `display` is preserved verbatim and is
what a UI shows; core computes only from `amounts`. A roll-up spanning both bases emits a `basisWarning`
rather than adding them — it cannot know whether "€25–40 dinner" was already for the group.

### 2.7 Conflicts

*Flag conflicts, don't resolve them by guessing* — as a type.

```ts
detectConflicts(trip, ctx?): Conflict[]

type Conflict = {
  id: ConflictId;         // content-addressed, see below
  kind: ConflictKind; ruleId: RuleId;
  severity: 'blocker' | 'warning' | 'note';
  subjects: Ref[];
  summary: string;        // one line stating BOTH sides
  params: Record<string, string | number>;   // structured; the i18n hook
  detail?: string;
  resolution: ConflictResolution | null;
};

type ConflictResolution = { conflictId: ConflictId;
  state: 'acknowledged' | 'accepted_booking' | 'accepted_plan' | 'dismissed';
  by: UserId; at: IsoDate; note?: string;
  retiredAt: IsoDate | null };     // set when the conflict it answers stops existing — see below
```

Phase 1 rules, one file each. **Severity is a promise about the user's time**: a `blocker` asserts that the
plan cannot happen as written; a `warning` says the data disagrees with itself and the model cannot tell
which side is wrong; a `note` is a nudge.

| `ruleId` | Fires when | Severity | Fixture behaviour on Europe 2026 |
|---|---|---|---|
| `legacy_flag` | A migrated `d.flag:true` day. | blocker | **2 — Aug 18 and Aug 20.** Jacob's own hand-set red days. |
| `overlap` | Two scheduled stops whose `[time, time+durationMins)` intersect. `durationMins: null` never overlaps — no guessing. | warning | 0. Injected-fault case only. |
| `impossible_transfer` | `travelRole === 'transfer'` and `leg.mins` exceeds the gap from the previous stop. **Warning, not blocker, when `travelRole === 'unknown'`. Never fires on `'journey'`.** §2.12 | blocker / warning | **0.** All four of Phase 1's hits were departure-time artifacts, Aug 18 included. |
| `booking_vs_plan` | A linked booking's date/time/route disagrees with its stop. | blocker | 0. Aug 15 Smartwings now agrees, so it MUST NOT fire. |
| `geo_outlier` | A `geoCheck` finding of `confidence:'certain'`. §2.13 | blocker | **0 on clean data; 1 when the Fisherman's Bastion typo is injected.** |
| `unverified_reference` | `confidence === 'asserted'` with no `origin.messageId`. | warning | 2 — IU1TUY, I54C9A. |
| `duplicate_booking` | Two *different* references cover the same route and date. | warning | 0. Injected-fault case only (the ingest case). |
| `missing_lodging` | A night between two same-city days with no `stay` stop and no lodging booking. | warning | 2 — Budapest, London. |
| `superseded_booking` | Two bookings share `operator + reference`, different issue dates. Emits *supersedes*, not *duplicate*. | note | 1 — YZGDTS 16 Jul vs 04 Aug. |
| `unbooked_ticketed` | A stop with a booking link and a cost but no `Booking`, within N days of `now`. | note | Széchenyi, Prague Castle, Windsor. |

**`closed` is dropped from Phase 1.** 0 of 95 places carry `hours`, §2.11 has no `hours` row, and the
fixture case named in the old table — "Naschmarkt flea market ends 14:00, arrival 15:50" — is not a stop in
the trip. A rule with a fictional fixture case reads as coverage and is not. `Place.hours` stays in the type
(opening hours are deferred anyway, §7); the rule returns in the phase that has an hours source.

**The reference trip now carries exactly two blockers, both of them Jacob's own flags.** That is the
outcome the count is allowed to assert; `ROADMAP.md` requires one justifying line per blocker in the golden,
so a third can only appear if somebody can write down why he must act on it.

**No rule may put a coordinate in `params` or `values`.** §6.1's cross-cutting rule is *"no coordinates in
any log line, ever — log `stopId`, never `lat/lng`"*, and `Conflict.params` is the structure that gets
logged, alerted on, committed to a golden and shipped to a server in Phase 2. Geography conflicts carry the
`stopId`/`placeId` in `subjects`, and `km`, `limitKm`, `anchorKind` and `cityKey` in `params`. A test greps
every rule's output on the fixture for float pairs in `[-180,180]` carrying three or more decimals.

**Conflict ids are content-addressed** over `(ruleId, sorted subject ids, the values that made it a conflict)`.
If the value behind a conflict changes, the id changes, so a previous "acknowledged" does **not** silently
carry over. That is `HISTORY.md` Pass 5's lesson, mechanised. Note the limit, precisely: an edit that does
*not* touch a conflict's inputs correctly leaves its acknowledgement standing — that is the mechanism
working, and the criterion that claimed otherwise was wrong, not the code.

**Resolutions are retired, not resurrected.** Content-addressing alone lets a dismissed conflict come back
still dismissed when the data reverts to its old value (`19:30 → 20:30 → 19:30` restores the original id and
the original dismissal). A dismissed *blocker* re-arming with no user action is exactly what this section
exists to prevent. So:

```ts
syncResolutions(trip, conflicts: Conflict[], at: IsoDate): Trip
```

A build function the client calls whenever it recomputes the derived conflict set — the one build function
driven by derived data, and the reason it is a build function and not a side effect. It sets `retiredAt` on
every live resolution whose `conflictId` is absent from `conflicts`, and never un-retires. `detectConflicts`
ignores retired resolutions when attaching `Conflict.resolution`, but reads them for `detail`: *"you
dismissed this on 12 Aug; it has come back."* This also stops `trip.resolutions` growing without bound —
`validateTrip` emits `stale_resolutions` once retired rows exceed 50.

`detectConflicts` is pure. `resolveConflict(trip, resolution) => Trip` appends to `trip.resolutions` and
changes nothing else — a resolved conflict still renders, dimmed. **No code path in core edits a stop in
response to a conflict.**

### 2.8 Provenance

```ts
type Provenance = {
  source: 'user' | 'email' | 'friend' | 'system';
  state: 'candidate' | 'accepted' | 'rejected';
  confidence: 'confirmed' | 'asserted' | 'inferred';
  origin?: { mailAccountId?: string; messageId?: string;
             friendUserId?: UserId; sourceTripId?: TripId; sourceStopId?: StopId;
             ruleId?: string };
  addedAt: IsoDate; acceptedAt: IsoDate | null; actorUserId: UserId | null;
};
```

`source` = who produced it. `confidence` = how well attested: `confirmed` (we hold the document), `asserted`
(a human said so with nothing behind it — IU1TUY), `inferred` (we worked it out — every hand-converted CZK
price). `state` = whether the user has taken it on. **Email-derived data is created `state:'candidate'` and
is never a silent write.**

One function decides how everything renders, so web, native and server cannot drift:

```ts
displayStatus(x): 'own' | 'suggested' | 'candidate' | 'imported' | 'rejected'
// 'own'       iff source==='user' || state==='accepted'
// 'candidate' source==='email',  state==='candidate'  → review queue, badged
// 'imported'  source==='friend'                        → credited to the friend, badged
// 'suggested' source==='system', state==='candidate'   → dimmed, removable (today's sug:true)
```

The invariant the tester should attack: **nothing un-accepted and non-user may ever be presented without a
badge.**

`displayStatus` answers *how is this badged*. A second, separate accessor answers *who is it credited to*:

```ts
attribution(x): { friendUserId: UserId; sourceTripId: TripId; sourceStopId: StopId } | null
```

They are separate because acceptance changes the badge and must never change the credit. A stop copied from
Marta and then accepted is `displayStatus() === 'own'` — Jacob has taken it on, which is what the brief's
*"until the user accepts it"* means — and `attribution()` still names Marta, and every view that renders the
stop renders that. §2.14.

### 2.9 Validation

```ts
validateTrip(trip): Issue[]
type Issue = { level: 'error'|'warn'; code: string; ref: Ref; message: string; params: Record<string, string|number> };
```

Codes: `days_not_dense`, `day_id_mismatch`, `duplicate_id`, `primary_city_not_in_cities`, `unknown_city_key`,
`place_ref_dangling`, `lat_lng_out_of_range`, `pool_stop_has_day`, `scheduled_stop_has_no_day`,
`booking_ref_orphan`, `cost_basis_mixed`, `provenance_missing`, `accepted_without_timestamp`,
`owner_missing`, `origin_stripped`, `stale_resolutions`, `invalid_calendar_date`.

Three changes from revision 1, each with a reason:

- **`stop_far_from_city` is deleted outright.** It was a second implementation of `geo_outlier` with the
  same primaryCity-only defect and twice the noise — 20 of 31 issues, 13 of them explained by another city
  on the same day or a `daytrip` flag. Sequencing rule 1 calls a second implementation a design defect, and
  the fix is not to fold two rules into one file but to notice that a coordinate outlier is a **conflict** —
  a thing to act on, with both sides stated — and not a structural validity problem. There is now one
  implementation (`geoCheck`, §2.13) with one consumer (`geo_outlier`). `validateTrip` keeps
  `lat_lng_out_of_range`, which is a genuine structural check (`|lat| > 90`) and not a distance at all.
- **`accepted_without_timestamp` applies to bookings as well as stops.** `{state:'accepted',
  acceptedAt:null}` on a `Booking` renders `'own'` and is precisely the shape a Phase 3 ingest bug produces.
- **`origin_stripped`** (level `error`): a stop or booking whose `provenance.source === 'friend'` with no
  `origin.sourceTripId`. That is the credit link being lost, and §2.14 makes it unlosable.
- **`invalid_calendar_date`**: `startDate`/`endDate`/`Day.date` must be real calendar dates, not merely
  `YYYY-MM-DD`-shaped. `'2026-13-45'` currently rolls over to 2027-02-14 and validates clean.

This generalises the scripted checks in `CLAUDE.md` — the ones that caught bugs nothing visible was showing.

### 2.10 The public API surface

```
packages/core/src/index.ts re-exports exactly this and nothing else:

  model      Trip, City, Day, Stop, StopPlacement, TravelRole, Place, PlaceLink, Booking, Ticket,
             CostEstimate, Money, Provenance, Conflict, ConflictResolution, Leg, Issue, Ref, …
             LOCAL_OWNER · TripParseError · ForeignDocumentError · sequentialIds
  build      createTrip(init) · ensureDays(trip) · setTripMeta(trip, patch) · setDayMeta(trip, dayId, patch)
             addStop(trip, placement, stop) · updateStop(trip, stopId, patch) · removeStop(trip, stopId)
             moveStop(trip, stopId, placement)          // day↔day, day↔pool, reorder — ONE function
             reorderStop(trip, stopId, order)
             scheduleFromPool(trip, stopId, hint?) · returnToPool(trip, stopId)
             acceptCandidate / rejectCandidate(trip, ref, actorUserId, at)
             copyStopInto(target, source, placement, ctx)          // §2.14 — the social primitive
             upsertBooking · linkBooking · resolveConflict · syncResolutions
  derive     computeLegs · dayMovingMinutes · clusterStops · focusCluster · fitSpanKm · MIN_SPAN_KM
             mapBounds · stopPoints
             rollUpCost · displayStatus · attribution · needsBadge · cityRange · formatRange · tripSummary
             geoCheck                                              // §2.13 — one implementation
  conflict   detectConflicts · RULES
  validate   validateTrip
  access     canView · canEdit · canShare · canDelete   (pure predicates; §6.2)
  serialize  toJSON · fromJSON · SCHEMA_VERSION · migrateDoc
  import     importLegacyDays
```

**"Exactly this" is now mechanical.** Phase 1 exported 102 runtime symbols against a list of 38, which is
not a leak the manager can be expected to notice by eye. The list above is widened to include the eight
things the client genuinely needs and was reaching past the boundary for; the internals it was also getting
— `digest`, `canonical`, `makeConflict`, `blankDay` — stay private. **A test asserts set equality in both
directions** between the runtime exports of `index.ts` and a literal list checked into the test file, and
that list is the one above. A symbol added to the index without being added here fails the build; a symbol
listed here and not exported fails too.

`moveStop` covering day↔day, day↔pool and reorder is deliberate: today those are three functions with three
chances to disagree about what happens to `sug`/`_optId`/`addHint`.

`access` predicates ship in Phase 1 even though nothing enforces them yet — they are the definition the
Phase 2 RLS policies are generated from and tested against. Writing them later is the retrofit Jacob
specifically asked to avoid.

### 2.11 Migration: `DAYS` → core, exactly

Measured against the live file: **16 days, 112 stops** (all with coordinates), 5 multi-city days, 2 `flag`
days, 3 `sugDay` days, 21 `sug` stops, 21 `badge` stops, 7 `ticket` stops, 49 costed stops, 30 booking links,
81 `move` overrides, **31 `OPTIONAL` pool items** (vienna 8, dubrovnik 3, split 3, prague 8, budapest 6,
london 3) and **95 `CITY_PLACES`** (vienna 15, dubrovnik 12, split 15, prague 25, budapest 21, london 7).

| Legacy | Core | Notes |
|---|---|---|
| `CONTENT_VERSION` | — | dropped; `Trip.revision` replaces it |
| `CITY_META[k]` | `City{key,name,meta.*}` | `centre` from `cityStops[]` in the overview map; `countryCode` added by hand |
| `CITY_ORDER` | `City.order` | |
| `CITY_RANGE` | **derived** via `cityRange()` | The importer MUST assert the derived value matches the hardcoded string for all six cities |
| `MODES`,`COLORS`,`CAT_LABEL` | `packages/tokens` | Presentation. Core keeps only the `TravelMode`/`StopCategory` unions |
| `d.id "08-13"` | `Day.id`/`date` = `"2026-08-13"` | year from `opts.year` |
| `d.dow`, `d.d` | — | derived |
| `d.city` / `d.cities` | `primaryCity` / `cities` | `"transit"` stays legal |
| `d.title`, `d.sub` | `title`, `subtitle` | |
| `d.sugDay:true` | `Day.provenance {source:'system', state:'candidate', confidence:'inferred'}` | |
| `d.flag:true` | `Day.legacyFlag` **and** a `Conflict` `ruleId:'legacy_flag'`, blocker, summary = `d.sub` | The migration's real work: the two hand-set red days become first-class conflicts — Aug 18 and Aug 20 |
| `s.t` | `placement.time`; `"—"` → `null` | |
| `s.n`,`s.cat`,`s.note` | `name`,`category`,`note` | |
| `s.lat/s.lng` | `PlaceLink` | Name-match `CITY_PLACES` first → `{kind:'place'}`, else `{kind:'inline'}`. Every unmatched name reported as a `warn` Issue, never silently inlined |
| `s.cost` + `s.c` | `CostEstimate` | `display` = `s.cost` verbatim; `amounts` parsed from the display. Where `c` disagrees with the display currency (10 stops), keep one `Money` in the **display's** currency, mark the stop `confidence:'inferred'`, emit `cost_basis_mixed`. `"total"` → `per_party`; `"pp"` → `per_person`; default `per_person` |
| `s.badge:"free"` | `flags += 'free'`, cost stays `null` | Deliberately **not** synthesised into `Money{0,0}` — `dayCost` ignores badge-only stops and golden parity requires identical roll-ups |
| `s.cat === 'trip'` | `flags += 'daytrip'` | matches today's badge logic |
| `s.move` | `Stop.arrival` | unchanged — `computeLegs` still reads exactly this, byte-for-byte |
| `s.move.mode` + `s.cat` | `Stop.travelRole` | **new.** No `move` → `transfer`. Non-vehicle mode (`walk`/`metro`/`transit`/`bike`) → `transfer`. Vehicle mode (`flight`/`train`/`bus`/`boat`/`speedboat`/`ferry`) with `cat === 'transit'` → `journey`. Vehicle mode with any other category → `unknown`. Measured on the live file: **21 journey · 81 transfer · 10 unknown.** §2.12 |
| — | `Trip.homeBase` | **new**, hand-supplied via `opts.homeBase` exactly as `countryCode` already is. Europe 2026 passes `{name:'Los Angeles (LAX)', at:{lat:33.9425, lng:-118.4081}}`. §2.13 |
| `s.sug:true` | `{source:'system', state:'candidate', confidence:'inferred'}` | → `displayStatus === 'suggested'` |
| `s.book` | `Ticket{kind:'url'}` when `s.ticket`, else stop-level `links` | |
| `s.ticket:true` + repo path | `Ticket{kind:'bundled', path}` | the two FlixBus PDFs, **referenced by path, never copied** |
| `s.ticket:true` + URL | `verifiedBy:'user'` for the GYG short link (Jacob confirmed by hand; the proxy blocked verification), `verifiedBy:'fetch'` for the three actually checked | Verification provenance is data, per `CLAUDE.md` |
| `OPTIONAL[city].stops[i]` | `Stop` with `placement {kind:'pool', cityKey, hint}` | `addHint` → `hint`; pool titles → `Trip.meta.poolNotes[city]` |
| `CITY_PLACES[city][i]` | `Place` | |
| `LOKRUM_PLACES`/`LOKRUM_LOOP` | **not migrated** | §7 |

**Adjacent, not copied.** Per Jacob's answer on the repo, the Europe 2026 data is *referenced*:

- `tools/extract-legacy.mjs` reads `../europe-2026-itinerary.html` **read-only** at test time and evaluates
  the constant block. No copy of `DAYS` is committed. Committed instead: `fixtures/europe2026.sha256`
  (the source file's hash) and `fixtures/golden/*.json` (expected derived outputs). If the live planner
  changes, the tests fail loudly with "source changed — re-baseline", which is desirable: it keeps Cairn
  honest to the real trip instead of quietly diverging from it.
  *Trap, from `HISTORY.md`:* use `lastIndexOf('<script>')`, not `indexOf` — the first match is the Leaflet CDN tag.
- `docs/BOOKINGS.md` is prose and cannot be parsed reliably, so the 8 transport bookings, 4 lodgings and the
  tour/ticket records are transcribed **once** into `fixtures/europe2026.bookings.json`, each carrying
  `sourceDoc: "docs/BOOKINGS.md"`. A test asserts every `reference` string in that fixture still appears
  verbatim in `docs/BOOKINGS.md` — drift detected without parsing prose. Includes **YZGDTS twice**
  (16 Jul → Aug 18, 04 Aug → Aug 15, the second superseding the first) and IU1TUY/I54C9A as `asserted`.
- Ticket PDFs under `tickets/` are referenced by repo-relative path. Never copied into `cairn/`.

**Known fixture warts, which are features for the tester** — `validateTrip` and `detectConflicts` are
expected to report these on the unmodified fixture, and the expected output is a committed golden file:
mixed cost bases (5 adults on the Danube cruise vs per-person everywhere else), 10 non-EUR display
currencies, two unverifiable booking references, no lodging in Budapest or London, and two legacy-flag days.

---

### 2.12 `Stop.travelRole` — what a stop's time actually means

**The defect.** `arrival` was specified as "the leg *into* this stop" and the legacy `move` field was mapped
straight onto it. But `move` carries two different meanings and always has. On Aug 8, *"Condor DE4345 →
Vienna"* sits at 14:30 with `move:{flight, 80}`: 14:30 is when the aircraft **leaves Frankfurt**, and 80
minutes is **the flight**, not the walk to the gate. On Aug 18, *"Airport Express bus → Václav Havel"* sits
at 05:30 with `move:{bus, 40}`: 05:30 is when the bus **departs** and 40 minutes is **the ride**. Every rule
that reasons about time inherited the ambiguity, and `impossible_transfer` — which compares the journey
against the gap between two *departure* times — was semantically wrong on all 31 vehicle stops and quiet on
25 of them by arithmetic coincidence, with margins as low as one minute. An ordinary time edit manufactured
a blocker.

**The field.**

```ts
/** What `Stop.arrival` describes, and therefore what `placement.time` means. */
type TravelRole =
  | 'transfer'   // arrival = the journey INTO this stop; time = when you arrive. The default.
  | 'journey'    // this stop IS a vehicle run: arrival = the vehicle's own journey,
                 // time = when it DEPARTS, and the coordinate is one endpoint of that run
                 // — the model does not claim to know which end.
  | 'unknown';   // travel information is present and its role could not be established.
```

It is **purely additive and no derive function reads it.** `computeLegs` still consumes `arrival` and
nothing else, so `fixtures/golden/legacy-legs.json` — generated by running the live page's own `legBetween`
in a `node:vm` — keeps parity on all 16 days. This was the first of the two recorded constraints on the fix
and it is satisfied by construction: `travelRole` is read only by conflict rules and by the view layer.

**The derivation is total, and where it cannot be sure it says so.** The recorded second constraint was
that the importer must be able to derive the field. It can, for 102 of 112 stops, on two signals already in
the data — the travel mode and the stop's category. The residue is not fudged into a guess; it becomes
`'unknown'`, and `'unknown'` degrades every rule that reads it. The mapping is in §2.11 and the measured
split is 21 journey / 81 transfer / **10 unknown**, all ten of which are genuinely ambiguous on inspection
(Aug 13's `cat:'trip'` speedboat hops, the Dubrovnik cable-car bus, the Lokrum boat, a bus that is half a
transfer and half a check-in).

**Every rule that consumes it, and how.**

| Consumer | Behaviour by `travelRole` |
|---|---|
| `impossible_transfer` | `'transfer'` → today's arithmetic, unchanged, **blocker**. `'unknown'` → same arithmetic, **warning**, with `detail` saying the model cannot tell whether the time is a departure. `'journey'` → **does not run**: comparing a vehicle's own journey against the gap before it departs is not a statement about anything. |
| `overlap` | A `'journey'` stop occupies `[time, time + arrival.mins)` even when `durationMins` is null — a flight does overlap the thing you scheduled during it. `'transfer'` and `'unknown'` keep the no-guessing rule. |
| `geo_outlier` / `geoCheck` | **Does not read it.** Stated because it is the obvious place to reach for and it turned out to be unnecessary — see §2.13, where the anchor set makes an exemption redundant. Two independent defects, two independent fixes; conflating them is how the first round produced a fix that removed three of six false positives. |
| the day view | Renders it. A `'journey'` stop shows *"departs 14:30 · 1 h 20 · arrives 15:50"*; a `'transfer'` stop shows today's *"20 min by metro"*. `'unknown'` renders with a one-tap control to set it, which is the only new editing affordance this field needs. |

**Measured effect on the reference trip: `impossible_transfer` goes from 4 blockers to 0 blockers and 0
warnings.** All four of Phase 1's hits are artifacts, **including the Aug 18 case that the review, the QA
pass and the note to Jacob all called the one real transfer defect**. It is not: the bus departs 05:30, the
ride is 40 minutes, it reaches PRG at 06:10, and the flight is 07:30. What the model actually has to say
about the hotel-to-bus-stop transfer is nothing, because the data does not describe it — and asserting a
blocker from an absence is the same error as guessing. The tightest remaining margin on any genuine
transfer is **7 minutes** (Aug 14, walking from the Skradin bus stop to the ticket office), which is a real
property of the plan rather than of the display.

**What this buys and what it costs.** It buys a conflicts panel whose blockers are all real. It costs the
one thing the departure model would have *newly* found: on Aug 21, BA863 departs Budapest 12:55 and runs
165 minutes, and the next stop is scheduled 15:15 — which reads like a missed connection and is not, because
the flight crosses from CEST to BST and core stores wall-clock with no timezone (§7). A `journey_overrun`
rule is therefore specified and **deferred to Phase 4**, where timezones are resolved. Shipping
time-difference arithmetic on a model that cannot represent a time zone is the `closed`-rule mistake with a
longer fuse.

---

### 2.13 Geography — one mechanism, one consumer

**The defect.** Two implementations of the same idea, both anchored on `day.primaryCity`, both wrong in the
same way and neither able to catch the bug they exist for. `geo_outlier` produced 6 blockers on the
reference trip and all 6 were legitimate stops; `validateTrip.stop_far_from_city` produced 20 of the 31
validation issues with 13 in the same false-positive class. Meanwhile the historical Fisherman's Bastion
typo — one digit of latitude, 111 km north, nothing visibly broken — was reproduced exactly (`place-68`,
`47.5025 → 48.5025`) and **neither check moved: 27 conflicts before and after, 31 issues before and after.**
`geo_outlier` examined 31 of 238 coordinate-bearing records, skipping the 81 stops with an `arrival`, all 31
pool stops and all 95 places, which is the record class the real bug lived in.

**The single mechanism.** One pure function, `packages/core/src/derive/geoCheck.ts`, is the only place in
the system that measures a distance from a coordinate to an anchor. `geo_outlier` is its only consumer;
`stop_far_from_city` is deleted (§2.9).

```ts
geoCheck(trip: Trip): GeoFinding[]

type GeoAnchor =
  | { kind: 'city';      cityKey: CityKey }   // a centre the record's own day or filing claims
  | { kind: 'home_base' }                     // Trip.homeBase
  | { kind: 'same_day';  stopId: StopId }     // another stop on the same day
  | { kind: 'adjacent_day'; stopId: StopId }  // the last coordinate of D-1, the first of D+1
  | { kind: 'city_stop'; stopId: StopId };    // for a Place: a stop on one of that city's days

type GeoFinding = {
  ref: Ref;                       // { kind:'stop'|'place', id }
  km: number;                     // distance to the NEAREST anchor, rounded
  limitKm: number;                // 35
  nearest: GeoAnchor | null;      // null when the record has no anchor at all
  confidence: 'certain' | 'unanchored';
};
```

**The principle, stated once:** *every coordinate is measured to the nearest point in the trip's own
declared geography, and a coordinate far from everything the trip knows about is a coordinate to look at.*
Not "far from its city" — a day trip is supposed to be far from its city, and a flight lands wherever it
lands.

The anchor set, by record class. The limit is a flat **35 km** everywhere; there is no second radius, no
`daytrip` exemption constant and no travel-mode exemption.

| Record | Anchors |
|---|---|
| **Scheduled stop** on day `D` | centres of every city in `D.cities` · `Trip.homeBase` · every *other* coordinate-bearing stop on `D` · the last coordinate-bearing stop of `D−1` · the first of `D+1` |
| **Pool stop** filed under city `c` | centre of `c` · every coordinate-bearing scheduled stop on a day whose `cities` include `c` |
| **Place** filed under city `c` | the same set, minus any stop that resolves its `PlaceLink` **through this place** (or the record would anchor itself) |
| any record with no resolvable coordinate | not checked — `place_ref_dangling` and the `PlaceLink {kind:'none'}` path already cover it |

`geo_outlier` publishes `confidence:'certain'` findings as blockers. `'unanchored'` — a record whose trip
offers it no anchor at all — is not published as a conflict at all in Phase 1; it is a property of an
almost-empty trip, not a defect.

**Measured, on the live planner, before specifying it.** Each element of the anchor set is load-bearing and
was kept only because removing it reintroduced a specific false positive:

| Anchor removed | False positives it lets back in |
|---|---|
| same-day stops + adjacent-day boundary | Frankfurt (FRA) connect, 603 km from Vienna on a Vienna day; and the three Krka stops, 48–54 km from Split |
| `Trip.homeBase` | Arrive LAX, 9,321 km from anything else in the trip |
| the *other*-stop exclusion on places | nothing — but without it a typo'd Place anchors itself and the check is vacuous |

And the results that decide whether it ships:

```
clean reference trip      scheduled stops   0 findings / 112      places   0 findings / 94
+1° latitude injected     scheduled stops   112 caught / 112      places   92 caught / 94
```

Compare the rule being replaced: 6 false blockers, 31 of 238 coordinate-bearing records examined, and **0 of
the 95 places** — the record class the real bug lived in — looked at at all.
**The Fisherman's Bastion typo is caught: 109.5 km from its nearest anchor, one blocker, naming `place-68`.**

Two honest limitations, written down rather than discovered later:

1. **The two misses are `Blue Cave, Biševo` and `Stiniva Cove, Vis`.** Both are Split-filed island places
   ~55–64 km out; displaced 1° north they land within 35 km of the Aug 14 Krka day-trip stops, which are
   legitimate anchors for a Split place. Naming them is cheaper than adding machinery for two records.
2. **A whole day of wrong coordinates is invisible**, because the day's stops anchor each other. The bug
   class this exists for — one digit, one record, `HISTORY.md` and `CLAUDE.md` both — is a single outlier.
   A bulk error is a different problem and it is not this rule's job to pretend otherwise.

`Trip.homeBase` is the one new field the mechanism needs. It is real modelling, not a patch: a trip starts
and ends somewhere, and the Europe trip starts and ends at LAX. It is nullable, the importer takes it from
`opts` exactly as it already takes `countryCode`, and Phase 2's new-trip form asks for it.

---

### 2.14 Import, and the copy that is actually how sharing works

Jacob's answer of 2026-08-25, in his words: *"They wouldn't import their trip — they would build it on this
app. This is a space for them to create their own itinerary — they could even look at mine and just add a
certain activity."* That reweights the model. Whole-trip transfer is not the primitive; **one stop is.**

#### `importDoc` is backup and restore of your own exports

Contract, enforced in `packages/client` and stated in the UI:

1. **A document owned by someone else is refused.** If `doc.ownerId` is present and is neither the local
   user (`LOCAL_OWNER` in Phase 1, the signed-in user id from Phase 2) nor absent, `importDoc` rejects with
   `ForeignDocumentError { ownerId }`. The Library surfaces it as *"This trip belongs to someone else — open
   it from their share instead."* It does **not** adopt ownership, and it does not silently badge 112 rows
   and call that sharing.
2. **An import never overwrites a stored trip.** The check is against `await ports.storage.load(doc.id)`,
   not a boot-time in-memory snapshot. When the id already exists the user is asked, with **"restore as a
   copy"** as the default: a fresh id from `IdPort`, the stored trip untouched. "Replace" is available and
   is a deliberate act.
3. Round-trip parity is unchanged: `toJSON(fromJSON(toJSON(trip)))` stays byte-identical, and export is
   still the whole document.

The Library labels the control **"Restore from a backup"**. It is not called "Import".

#### `copyStopInto` is the social primitive

```ts
copyStopInto(
  target: Trip,
  source: { trip: Trip; stopId: StopId },
  placement: StopPlacement,
  ctx: { ids: IdFactory; today: IsoDate; actorUserId: UserId }
): Trip
```

Pure, in core, and it ships in Phase 1. Seven rules, and rules 2 and 7 are the ones the tester should aim at:

1. **A new id, always.** Ids never cross trips; `ctx.ids` mints one. The source's `id` is not preserved
   anywhere except inside `origin`.
2. **`provenance` is overwritten, never copied.** There is no code path that carries a source stop's
   provenance across a trip boundary.
   ```ts
   { source: 'friend', state: 'candidate',
     confidence: min(source.confidence, 'asserted'),   // you do not hold their document
     origin: { friendUserId: source.trip.ownerId,
               sourceTripId: source.trip.id, sourceStopId: source.stopId },
     addedAt: ctx.today, acceptedAt: null, actorUserId: ctx.actorUserId }
   ```
   `displayStatus()` therefore returns `'imported'` from the instant the stop exists. There is no window in
   which it is unbadged.
3. **`bookingId` is dropped and no `Ticket` travels.** A friend's booking reference is not yours, and their
   ticket URL is an access credential (§6.6). `cost` is copied, with `confidence` demoted to `'inferred'`.
4. **A referenced `Place` is copied with it**, new id, same provenance stamp — otherwise the link dangles.
   An existing place in the target with the same name and coordinates in the same city is reused instead.
5. `flags`, `name`, `note`, `category`, `durationMins`, `arrival` and `travelRole` copy verbatim. They are
   descriptions of a place and a journey, not claims about the user.
6. **Accepting is a separate, explicit act.** `acceptCandidate` sets `state:'accepted'` and `acceptedAt`,
   which by §2.8 makes `displayStatus()` return `'own'` — that is the brief's rule, *"marked as such **until
   the user accepts it**"*. But it **preserves `origin`**, and preserving it is not optional:
   `validateTrip` emits the `error` `origin_stripped` for any `source:'friend'` record with no
   `origin.sourceTripId`.
7. **Credit survives acceptance, and the views must show it.** `displayStatus` governs the *badge*; a new
   export, `attribution(x): { friendUserId, sourceTripId, sourceStopId } | null`, governs the *credit line*.
   The contract: **any view that renders a record with a non-null `attribution` renders the credit.** This
   is the mechanical form of `CLAUDE.md`'s oldest rule — *never present my suggestions as Jacob's plan* —
   applied to the path where it will actually be exercised.

**The invariant to attack:** for every record `r` with `attribution(r) !== null`, `displayStatus(r) !== 'own'`
unless `r.provenance.state === 'accepted'` **and** `r.provenance.acceptedAt !== null` **and**
`r.provenance.actorUserId === trip.ownerId` — and `attribution(r)` is *still* non-null afterwards.

#### Why this ships in Phase 1, with no friends and no server

The copy path is the same code whether the source trip came from your own library or from a friend's share.
In Phase 1 the client gets a read-only **"Browse another trip"** pane over the local library: open trip B
beside trip A, copy a stop across. That is genuinely useful on its own — it is how a second trip reuses the
first one's stops — and it means the provenance rule is exercised by a real user path months before there is
a friend to break it. In Phase 2 the pane's source list gains shared trips and nothing else changes.

**`TripFork` is cut.** It is `copyStopInto` in a loop plus a whole-trip credit edge that Jacob's answer says
nobody wants. `StopImport` is not a table either: it is `Provenance.origin`, which already carries every
field a `stop_imports` row would have. The only thing a table would add is enumerating *"what have people
taken from my trip"*, which nobody has asked for; if it is asked for, it is a query over provenance.

---

## 3. Module boundaries

```
cairn/
  packages/
    core/          pure domain. zero runtime deps. no DOM, no fetch, no fs,
                   no Date.now() and no randomness in logic (injected clock + IdFactory).
    client/        trip store, ports, selectors. Platform-agnostic: no DOM, no React,
                   no network in Phase 1. Runs and is tested in plain Node.
    tokens/        colors, category labels, mode icons. No logic.
  apps/
    web/           Vite + React. Port implementations + views. Installable.
    mobile/        Expo SDK 56. The ONLY place expo-location / expo-media-library may be imported.
  services/
    api/           Node 24 + Postgres/RLS. Auth, trips, social graph, permissions, ticket storage.
    ingest/        Mailbox polling + parsing. Writes IngestCandidate rows and nothing else.
                   Separate deploy unit, separate credentials, no write grant on trip tables.
  db/              SQL migrations + RLS policies + the policy conformance test
  fixtures/        europe2026.sha256, europe2026.bookings.json, golden/
  tools/           extract-legacy.mjs and other one-shot scripts
  docs/            BRIEF, ARCHITECTURE, ROADMAP, BUILD-NOTES, QA-FINDINGS, REVIEW
```

Dependency direction, enforced by **a test that walks imports and does not currently exist** — write it;
four packages is when it is cheap, and the property holds today so it is a guard, not a repair. `core` →
nothing. `tokens` → nothing. `client` → core. `web`/`mobile` → client, core, tokens. `api`/`ingest` → core.
**Nothing imports `web` or `mobile`.** This is the boundary that rots first.

The same test carries one more assertion, which is a privacy boundary rather than a tidiness one:
**nothing under `apps/` may import `tools/extract-legacy.mjs`, directly or transitively.** `apps/web` reads
trip data only from the generated, redacted sample file (§6.6). That is what keeps the live planner's
credentials out of a bundle by construction rather than by remembering.

`services/ingest` having no write grant on trip tables is a security boundary, not tidiness: the component
holding mailbox credentials must not be able to modify an itinerary.

---

## 4. The Phase 1 client — local-first, multi-trip

Jacob's answer widened Phase 1: the engine **plus a working multi-trip UI he can open and use**. No server,
no accounts. This section specifies it tightly enough that the builder does not invent it.

**Which client: web first.** Vite + React + TypeScript. It is the surface Jacob, the builder, the tester and
a friend with a link can all run today with no device, no store review and no account — and per §1.3, desktop
planning is where this half of the product belongs permanently anyway.

### 4.1 Shape

```
packages/client/src/
  store/      TripStore — a reducer over core's build functions, plus history and persistence bookkeeping
  ports/      StoragePort, FilePort, MapPort, ClockPort, IdPort   (SyncPort arrives in Phase 2)
  selectors/  thin memoised wrappers over core's derive functions
apps/web/src/
  ports/      IndexedDB storage · download + <input type=file> · Leaflet map
  views/      React components. No domain logic. No core mutation outside dispatch.
```

### 4.2 State model

```ts
type AppState = {
  library: TripSummaryRow[];   // {id,title,startDate,endDate,cityCount,updatedAt} — cheap, always loaded
  activeTripId: TripId | null;
  doc: Trip | null;            // exactly ONE trip in memory at a time
  derived: DerivedCache;       // legs, roll-ups, clusters, conflicts, issues — keyed by doc.revision
  ui: UiState;                 // activeDay, activeCity, mapScope, selection, panels — NEVER in the doc
  history: { past: Trip[]; future: Trip[]; limit: 50 };
  persistence: { savedRevision: number; status: 'idle'|'saving'|'error'; lastError?: string };
};
```

Five rules, each of which exists because of a specific failure:

1. **Every mutation is `dispatch(action)`, and every action maps 1:1 onto a core build function.** The
   reducer holds no domain logic — it is `doc = core[action.fn](doc, ...args)` plus history and persistence
   bookkeeping. If a feature needs logic the reducer cannot express, the logic goes into core. This is the
   mechanism that keeps web and native from drifting: it is `CLAUDE.md`'s "one data structure drives every
   view", one level up.
2. **`ui` is never persisted into the trip document.** Today the app stores drag order in localStorage keyed
   by `CONTENT_VERSION`, and that conflation is exactly why the cache went stale for a week. Stop order is
   *document* data (`placement.order`); which day is open is *UI* state.
3. **Derived data is never stored, and is invalidated wholesale on `doc.revision`.** No partial invalidation
   — cheap at 112 stops, and it removes a class of stale-view bugs outright.
4. **Autosave** writes the whole document, debounced 400 ms. `savedRevision` drives the dirty indicator.
   A failed write puts `persistence.status = 'error'` and says so on screen; it never fails silently.
   **The write is compare-and-set**, which §2.2's "last-writer-wins per stop with a revision guard" always
   promised and Phase 1 had neither half of: `save()` loads the stored document's `revision` first, and if
   it has moved since `persistence.savedRevision` the write is refused, `status` becomes `'conflict'`, and
   the indicator says so. **A tab whose write was refused MUST NOT display "Saved."** Two tabs on one trip
   is not an exotic case; it is Jacob with a second window open.
5. **Undo/redo is snapshot-based** over the immutable `Trip`, limit 50. Structural sharing makes this cheap.

### 4.3 Ports — the honesty-to-native mechanism

```ts
interface StoragePort { listTrips(): Promise<TripSummaryRow[]>; load(id): Promise<TripDoc|null>;
                        save(doc: TripDoc): Promise<void>; delete(id): Promise<void> }
interface FilePort    { exportDoc(name: string, bytes: Uint8Array): Promise<void>;
                        importDoc(): Promise<{ name: string; bytes: Uint8Array } | null> }
interface MapPort     { mount(el, points, bounds): MapHandle; refit(handle, bounds): void;
                        setVisible(handle, visible: boolean): void }
interface ClockPort   { today(): IsoDate }
interface IdPort      { newId(): string }
```

`apps/web` implements them with IndexedDB, download + file input (the File System Access API is Chromium-only
— §1.1), and Leaflet. `apps/mobile` implements the same interfaces later with `expo-sqlite`,
`expo-file-system` + the share sheet, and MapLibre. **`apps/web` and `apps/mobile` differ only in port
implementations and view components** — the store, the selectors and every rule above are shared from day
one, so Phase 4 does not rewrite state management.

`packages/client` and every reducer test run **in plain Node with in-memory ports**. That extends the
tester's no-browser reach from the model to the state machine, which is the point of putting the store here
rather than in `apps/web`.

### 4.4 The map contract

**The client never computes bounds.** It calls `focusCluster` / `fitSpanKm` and hands `MapPort` a bounds
object. Both live map bugs from `CLAUDE.md` become structurally impossible: the day map's cluster focus and
its min-span guard live in core (§2.5), and `setVisible(handle, true)` triggers a `refit` — a port
implementation MUST no-op while its container has zero size and re-fit when it gains one. Leaflet cannot
compute a zoom against a `display:none` container, and this is the contract that stops that from being
rediscovered on every surface.

### 4.5 What Jacob can do at the end of Phase 1

- **Trip library:** create, duplicate, rename, delete, export JSON, **restore from a backup** (§2.14 — his
  own exports only; a foreign `ownerId` is refused with a message, and a restore never overwrites a stored
  trip), switch between trips. "New trip" takes a title, a date range, a home base and a list of cities and
  produces a dense day skeleton.
- **Browse another trip, and copy a stop out of it** (§2.14). A read-only pane over a second trip in the
  library; one control copies a stop into the open trip, where it appears immediately badged as imported and
  credited to the source trip. This is the pillar-3 path in the shape Jacob described it, and it is a real
  Phase 1 feature: it is how the second trip reuses the first one's work.
- **Day view:** the timeline with legs, times, costs and badges; add / edit / remove / retime / reorder
  stops; move a stop to another day; pool ↔ plan both ways, losslessly.
- **City tabs** grouped from `Day.cities`, exactly today's nesting.
- **Maps:** the day map with cluster focus and the "whole day's journey" toggle; the city map from `places`.
- **Conflicts panel:** every `Conflict` with both sides stated and acknowledge/dismiss writing a
  `ConflictResolution` — never an auto-fix.
- **Validation panel:** `validateTrip` issues, including the geo sanity check.
- **Provenance visible everywhere** via `displayStatus`: suggested, candidate and imported are always badged.
- **Europe 2026 loads as a built-in sample trip**, derived from the adjacent HTML at build time (§2.11).

**The spine, if time runs short.** The builder's own rule is *runnable beats complete*. May be stubbed and
called out: drag-reorder (buttons are fine), the city map (the day map is the one that matters), duplicate
and rename, any new-trip wizard beyond title + dates, and the browse-another-trip pane reduced to a plain
list of the other trip's stops with a "copy" button beside each. **May not be stubbed:** multi-trip
switching, stop editing, the day map, the conflicts panel, JSON export and backup-restore, and the copy
path's provenance badge and credit line — without those the phase has not delivered what Jacob asked for.

---

## 5. The four hard subsystems

### 5.1 Email ingestion

**Flow.** User connects a mailbox → `services/api` stores an encrypted refresh token (KMS; never in the
database in plaintext, never on a device) → `services/ingest` polls incrementally (Gmail `history.list`
after the first sync) → a sender/subject filter narrows to plausible booking mail → parsers (structured
JSON-LD first, then per-operator, then generic) extract fields → each match becomes an **`IngestCandidate`**:
extracted fields, a ≤500-character evidence snippet, the `messageId`, and a proposed target → the user
reviews → accepting writes a `Booking` and/or `Stop` with `{source:'email', state:'accepted',
confidence:'confirmed'}`. Attachments are fetched **only on acceptance**.

**Failure mode that matters most: a confident wrong parse that silently overwrites a correct plan.** The
Smartwings reissue is the live example — same reference, different ticket number, different date. A naive
parser updates the existing booking and Jacob's Aug 15 quietly changes. The answer is structural:
ingestion **can only create candidates** and has no write path to `stops` or `bookings` at all, enforced by
database grants (§3). A candidate matching an existing booking on `operator + reference` is presented as a
*reissue*, both versions side by side, diff highlighted, user picks. `HISTORY.md` Pass 5 is what happens
when software infers this instead.

**Secondary failure: the OAuth wall** — now confirmed as a hard gate on going public. §6.4 has the verified
rules and the resulting provider order.

### 5.2 Social graph and sharing permissions

**Flow.** `Friendship` is a bidirectional accepted edge. `TripShare` grants a principal (a user, or a link
token) `viewer | commenter | editor` on a trip, with `expiresAt` and `revokedAt`. `TripMember` is
co-ownership.

**What crosses between two people is one stop at a time.** Jacob's answer settles this: friends build their
own itineraries in the app and take individual activities from each other's. A share makes a trip
*readable*; `copyStopInto` (§2.14) is the only way anything moves. `forkTrip` is cut, and so is the
`TripFork` entity — a whole trip is the primitive applied N times. The credit link is `Provenance.origin`,
it is written by the copy and never by anything else, and it survives acceptance. Because the copy path is
already built and exercised in Phase 1 against two local trips, Phase 2 adds a source of trips, not a
mechanism.

Enforcement is two-layer: pure predicates in `core/access` that the API calls, **and** Postgres RLS that the
database enforces regardless. A conformance test generates the full (principal × relationship × operation)
matrix and asserts predicate and policy agree on every cell; disagreement fails the build. §6.2.

**Failure mode: revocation is not retroactive.** A revoked friend cannot fetch again, but bytes already on
their device are beyond recall. Two responses. (1) Honest scope: a share sends a **snapshot at share time**,
not a live feed, so exposure is bounded by what was true then. (2) Client contract: cached shared trips carry
`shareId` + server ETag and MUST revalidate on open with a **hard fail — a revoked share renders an error,
never stale content**, even offline. The tester should attack exactly this: pull a share, revoke it, go
offline, reopen. The correct behaviour is a refusal.

### 5.3 Location tracking

**Flow.** Native only. `expo-location.startLocationUpdatesAsync` with a TaskManager task writes fixes to
local encrypted SQLite (balanced accuracy, ~25 m distance filter; iOS `UIBackgroundModes: location`,
Android a foreground service with a persistent notification). On-device, `segmentTrace()` — pure, in core —
turns fixes into dwell and travel segments; dwell segments near a stop within its window become an
`observedAt` annotation. Nothing is uploaded. If the user taps *share today's path*, the device runs
Douglas–Peucker simplification (~50 m), drops fixes inside a configured private radius, and uploads a
**`SharedTrace`**: one polyline, one day, one trip, readable only by that trip's members.

**Failure mode: iOS silently stops the task and the map draws a straight line across the Adriatic.** iOS
kills background tasks under memory pressure and the user may downgrade *Always* to *While Using* mid-trip.
So a trace is **inherently gappy** by design: segments carry `confidence` and explicit `gap` markers, and the
renderer draws gaps as dashed and unclaimed rather than interpolating. A trace that pretends to be continuous
is worse than one that admits holes — the same principle as flagging conflicts instead of guessing. Android's
counterpart is OEM battery managers killing foreground services; detect a long gap on resume and say so.

### 5.4 Photo association

**Flow.** Native only. With library permission, `getAssetsAsync` enumerates assets created inside the trip
window — **identifiers and timestamps only, no bytes**. `getLocationAsync`/`getExifAsync` give coordinates
(Android additionally needs `ACCESS_MEDIA_LOCATION` or they come back empty *with no error* — the single most
likely silent bug in this subsystem). `suggestPhotoStops(assets, day, trace)` scores on-device by time
window, then distance, then the trace, returning suggestions with a confidence and a reason. Suggestions are
`{source:'system', state:'candidate'}` — they show as suggestions until accepted. Accepting a photo *into a
shared trip* uploads that one image with **EXIF GPS stripped before upload** unless the user opts in per photo.

**Failure mode: a photo with no EXIF at all** — screenshots, saved images, anything through a
metadata-stripping app, and on Android *everything* if the permission is missing. The matcher degrades to
time-only with reduced confidence and never asserts a location it does not have. Second failure mode is a
privacy one: iOS 14+ limited-library selection returns a partial library; work with what is granted and say
so, never nag for full access.

---

## 6. Privacy, authorization, and the public-grade line

Jacob's posture: **public-grade on what is expensive to retrofit, friends-grade on everything else.** Four
things qualify. They are §6.1–§6.4. §6.5 lists what is explicitly *not* being built.

### 6.1 What is stored where

| Data | On device | Reaches the server | Never transmitted |
|---|---|---|---|
| **Raw location fixes** | encrypted SQLite, kept until trip end + 30 days, one-button wipe | **nothing** — no batch, no crash report, no analytics event | the fix stream, in every phase |
| **Dwell/visit inference** | computed on device | only the *result* if attached: `{stopId, confidence}` | the coordinates and times behind it |
| **Simplified day trace** | derived on demand | only on an explicit per-day share: one polyline, one trip, members only, deletable | anything outside the shared day |
| **Private-zone fixes** | excluded before simplification, by radius | never, even inside a shared day | — |
| **Photo library index** (ids, timestamps, GPS, thumbnails) | in memory / local index | **nothing**, in every phase | the index |
| **A photo attached to a shared trip** | original stays in the library | that one image + `stopId`, **EXIF GPS stripped by default**, per-photo opt-in to keep it | every photo not explicitly attached |
| **Mailbox refresh token** | never on a device | encrypted under KMS, decryptable only by `services/ingest` | to any client, ever |
| **Message bodies** | — | a scan buffer, encrypted, **deleted within 24 h of parsing** | retained bodies, mailbox-wide search, any body content in logs |
| **What survives a scan** | — | `messageId`, sender, date, extracted fields, and a **≤500-char evidence snippet** so the user can see *why* we proposed something | the rest of the message |
| **Ticket attachments** | — | fetched and stored **only after acceptance**; private bucket, signed URLs ≤15 min | attachments of rejected or unreviewed candidates |
| **Friends' itineraries** | cached only while the share is live; revalidated on open, hard-fail on revoke | — | — |
| **Access credentials inside itinerary prose** — door PINs, booking references, ticket URLs | in the user's own trip, where they belong | only inside that user's own tenancy | **never into a build artifact** — §6.6 |

Cross-cutting rules the tester should treat as assertions:

1. **No coordinates in any log line, ever.** Log `stopId`, never `lat/lng`. Same for mailbox content and
   booking references. Grepping the logging paths for coordinate-shaped floats is a legitimate test.
2. **No third-party analytics or crash reporter in `apps/mobile`** while location or photo code is present,
   unless configured with an explicit field allowlist. Default: none.
3. **Nothing about location or photos is server-authoritative.** A full dump of the production database
   contains zero raw traces and zero library metadata. That is the property being bought.
4. Location and library permission prompts state the on-device-only guarantee at the point of asking.

### 6.2 Authorization on every read path

Designed now because retrofitting it is the worst migration in this product.

1. **Every table carries a tenancy column** — non-null `trip_id`, or `user_id` for user-scoped rows. There
   is no table without one. Object storage keys are prefixed `trip/{tripId}/…` so a blob's owner is
   recoverable from its key alone.
2. **RLS is `ENABLE` + `FORCE` on every table, default-deny, with an explicit policy per operation.** The
   API connects as a role **without** `BYPASSRLS`. There is no service-role key in any client bundle, and no
   "internal" endpoint that skips policy evaluation.
3. **`services/ingest` gets its own role**, with insert on `ingest_candidates` and select on `mail_accounts`
   and nothing else. Created in Phase 2, before there is any ingest code to use it.
4. **`core/access` predicates are the definition; policies are the enforcement.** A conformance test
   enumerates (principal × relationship × operation) — owner, member, viewer, commenter, editor, friend,
   revoked friend, stranger, expired link, anonymous — and asserts predicate and policy agree on every cell.
   Disagreement fails the build.
5. **Read paths are covered, not just writes.** The common authz bug is a list endpoint that filters in
   application code; RLS makes the filter unskippable, and the conformance matrix includes list operations.

### 6.3 Deletion and export, as a designed cascade

The invariant: **no row and no blob without a live tenancy reference.** If data can end up somewhere with no
owner, that is a design bug.

| Deleting | Cascades to | The awkward corner |
|---|---|---|
| a **stop** | its photo attachments, its conflict resolutions, its candidate links | a booking referenced by two stops is *unlinked*, not deleted, and marked `orphanedAt` for review |
| a **trip** | days, stops, places, bookings, ticket blobs, shared traces, shares, and the *links* from forks | **a friend's fork is their data.** Deleting your trip must not delete their copy; the credit link resolves to a tombstone, "original deleted" |
| a **mail connection** | token, scan buffer, and every unaccepted candidate, immediately | *accepted* bookings stay — they are the user's data now. `origin.messageId` becomes a dangling reference, which is fine and must not break rendering |
| a **user account** | all owned trips (cascade above), friendships, shares issued and received, push tokens | a co-owned trip transfers to the earliest remaining `TripMember`; with none, hard delete |
| a **device / session** | its local traces, its photo index, its cached friends' trips | the server cannot reach a device. Server-side deletion writes a **tombstone the device honours on next launch**, and a device wipes local data when its session is revoked. State this limit plainly in the UI rather than implying remote wipe |

A nightly sweeper asserts zero orphans across every table and the object store and **fails loudly** — it
alerts, it does not silently delete. Silent deletion of "orphans" is how you lose real data to a bug.

**Export** is user-initiated and produces a zip: `trips/*.json` (core's `toJSON` — the same format Phase 1
already ships), `tickets/*` blobs, `candidates.json`, `shares.json`, and a plain-text README. It is designed
now precisely because `toJSON` exists in Phase 1: export is not a later feature, it is the serializer with a
zip around it.

### 6.4 Mailbox scopes — verified, and what follows

Confirmed at the coordinator's request; sources in §1.1.

- **`gmail.readonly` is a restricted scope. So is `gmail.metadata`.** Google's Cloud Console has historically
  labelled `readonly` as merely "sensitive"; the policy FAQ corrects it. An app's classification is its
  **most restrictive scope**. **There is therefore no narrow Gmail read scope that escapes the restricted
  tier** — "ask for less" is not an available mitigation, which is the one place the coordinator's framing
  was optimistic.
- Restricted scopes **plus** the ability to access data through a third-party server — which our ingest
  worker is by definition — require a **CASA** assessment by a Google-empanelled lab with **annual
  revalidation**. Tiers follow OWASP ASVS: T1 self-assessment, T2 third-party DAST (2026 self-serve fees
  ≈ $540–$1,000), T3 full manual pentest.
- The unverified path ("Testing") needs none of it but caps at **100 test users** and **expires every refresh
  token after 7 days** — directly hostile to unattended polling.
- **Conclusion: Gmail OAuth is a hard gate on going public**, exactly as suspected.
- **Microsoft/Outlook is materially cheaper.** Graph `Mail.Read`; **publisher verification is free** and no
  license is required; it clears the risk-based step-up consent that otherwise blocks unverified multitenant
  apps registered after 2020-11-08. There is **no mandatory third-party security assessment**; Microsoft 365
  Certification (annual independent audit including pentest) is optional and aimed at enterprise/marketplace.

**What this does to the design** — nothing, and that is the point: minimum scope, parse-then-discard, store
candidates not messages. Those are already the privacy design in §6.1, and they are also the three things a
CASA assessment asks about, so the privacy work and the compliance work are the same work. What it changes
is the **order**: forward-to-an-address first (zero scopes, zero verification), Outlook OAuth second (free
verification), Gmail OAuth third (budget, 4–12 weeks, annual revalidation). `ROADMAP.md` Phase 3.

### 6.5 Explicitly not built now

Per Jacob, with a line each on what keeps the door open:

- **Moderation** — nothing is public-by-default and there is no user-generated content between strangers;
  the share model (§5.2) is the hook if that changes.
- **Rate limiting** — none. Tenancy columns and a single API entry point mean it can be added at the edge
  without touching handlers.
- **Billing** — none. No entitlement checks scattered anywhere to unpick later.
- **Admin tooling** — none. RLS + the export cascade (§6.3) means support questions are answerable with SQL
  under a policy rather than a bypass tool that becomes the biggest security hole in the product.
- **Scaling infrastructure** — one region, one database, no cache tier, no queue beyond the ingest worker.
- **i18n** — English only. Kept cheap by §2.1: every core-generated string ships with structured `params`
  beside it, so extraction later is mechanical rather than archaeological.

### 6.6 The shipped sample, and what may not reach a build

`npm run web:build` embedded Jacob's hotel door PIN (`PIN 0754`), booking confirmation `5814731574`, flight
references `YZGDTS` and `IU1TUY`, and two live unauthenticated ticket URLs — `cityairporttrain.com/en/
account/order/9zusk…` and `ulaznice.hr/…/fcvbimxq` — in `apps/web/dist/assets/index-*.js`. Nothing is
committed and nothing is deployed, so there is no exposure today. §7 puts the public share-page host on
that same build in Phase 2.

**Jacob's answer: Europe 2026 stays the demo trip, and credentials never reach a build.** So this is a rule,
applied by a function, covered by a test — not a scrub of the five strings we happen to have found.

**Where it happens.** In `tools/gen-sample.mjs`, between `importLegacyDays` and the JSON write, via one
exported function `redactForSample(trip): Trip` in `tools/redact.mjs`. It never runs inside
`packages/core`, and `importLegacyDays` output is **unchanged** — the CLI, the tests and every golden keep
reading the real trip, so cost and leg parity are untouched. Redaction is a property of the *build
artifact*, not of the model.

**What it covers**, by class:

| Class | Rule |
|---|---|
| **Booking references** | `Booking.reference` → `null`; `Booking.seat` → `null`. The `superseded_booking` demo survives on `operator` + dates. |
| **Tickets** | every `Ticket` → `null`, for all three kinds. A URL is an access credential; an `attachment` names a mailbox message; a `bundled` path points at `tickets/`, which is not deployed and would 404. The stop keeps `flags += 'ticketed'` so the badge still demonstrates. |
| **Free text** — `Stop.note`, `Day.subtitle`, `Trip.title`, `Place.note`, `meta.poolNotes` | passed through a redactor whose patterns live in **one exported array** in `tools/redact.mjs`: a keyword followed by an alphanumeric token (`PIN`, `code`, `conf`, `ref`, `order`, `booking`, `seat`, case-insensitive), any run of 6+ digits with optional spacing (`338 441 5948`), any 6+ character uppercase-alphanumeric token containing both letters and digits (`YZGDTS`, `IU1TUY`, `D8WQHO`), any `https?://` URL, and any email address. Each replaced with `[redacted]`. |
| **Links** | `Stop.links[].href` and any `book.u` survivor → dropped; the label is kept. |

**What it does not cover, deliberately.** Personal prose — *"Morning with your girlfriend's family"* — is
not a credential and is not redacted. The consequence, stated so nobody is surprised by it: the shipped
sample remains recognisably Jacob's trip. That is fine while the build is his own laptop and the Phase 2
share host serves *his* trips. **The day the build serves a public marketing page, the sample must be an
invented trip, and that is a Phase 2 exit condition, not a Phase 1 one.**

**How it is enforced.** Two tests, both in `npm test`:

1. `redactForSample` output is walked recursively and every string is matched against the pattern array;
   any hit fails. Every pattern is exercised by a fixture string, so a pattern that matches nothing is
   itself a failure — the `closed`-rule lesson applied to redaction.
2. When `apps/web/dist/` exists, every emitted asset is grepped for the same patterns and for a literal
   list of the five known strings above. It fails the build, not a review.

And one structural rule that makes the whole class harder to reintroduce: **`apps/web` may import trip data
only from the generated sample file.** There is no import path from `tools/extract-legacy.mjs` into a
bundle, and the dependency-direction test of §3 asserts it.

---

## 7. Explicitly deferred

- **Timezones and UTC instants.** All times are local wall-clock, as today. Real instants are needed for a
  live "up next" across a border and for photo matching (EXIF timestamps are UTC + offset). Deferring means
  **core carries an optional `Day.tzId` that nothing reads yet**, so adding it later is not a schema
  migration. Resolved in Phase 4.
  - **`journey_overrun` waits for it.** With `travelRole` (§2.12) the model can finally say *"this vehicle
    departs at T and runs N minutes, so it arrives at T+N — and the next stop is scheduled before that."*
    On the reference trip that rule fires exactly once, on Aug 21: BA863 departs Budapest 12:55 + 165 min,
    and Bus 8 to Windsor is scheduled 15:15. The plan is correct; the flight crosses CEST → BST and core
    cannot represent that. Specified, evidence recorded, **shipped in Phase 4 with timezones**. Shipping
    time-difference arithmetic on a timezone-blind model is the `closed`-rule mistake with a longer fuse.
- **`TripFork` and a `stop_imports` table.** Cut, not postponed — §2.14. Sharing is stop-level and the
  credit link is `Provenance.origin`. If "what have people taken from my trip" is ever asked for, it is a
  query over provenance, not a new entity.
- **The `closed` rule.** Dropped from Phase 1 (§2.7): no data path produces `Place.hours`, so it cannot
  fire. It returns in the phase that has an hours source — Phase 3 at the earliest.
- **Real-time collaboration / CRDTs.** Phase 2 is last-writer-wins per stop with a revision guard. Two people
  editing one stop at once is not a problem tens of users have.
- **Sub-maps of a single stop** (`LOKRUM_PLACES`/`LOKRUM_LOOP`). A curated walking loop *inside* one stop is
  a second nesting level in the model; it stays hand-authored in the old app until something else needs it.
- **Opening hours as a general system.** `Place.hours` exists and one rule uses it, but a full grammar
  (seasonal, holiday, "Thu till 21:00, closed Mondays Oct–May") is its own project. Phase 1 supports simple
  weekly ranges; everything else is unknown, and **unknown never produces a conflict**.
- **Currency conversion.** Core reports per-currency subtotals and refuses to invent rates. A rate provider
  is a Phase 2 concern with a stored `rateSetId` so a total is always reproducible.
- **Booking/payments, chat, recommendation ML, offline map tiles, multi-tenant enterprise** — the brief's
  non-goals, restated so nobody re-adds them.
- **Public share pages with SEO/OG rendering** — Phase 2. They are the one surface where a permission bug is
  publicly visible, so they get their own attack pass.
