# Cairn — Architecture

Stage 1 output. Inputs: `cairn/docs/BRIEF.md`, Jacob's answers to the open questions (2026-08-24 and
2026-08-25), the root `CLAUDE.md`, and `europe-2026-itinerary.html` — the working proof of the format.

**Revision 2, 2026-08-25.** The Phase 1 review (`REVIEW.md`) sent five design defects back here. What
changed, and where: `Stop.travelRole` and the schedule rules that read it (§2.12); one geography
mechanism replacing two implementations (§2.13); the import and stop-copy contract, replacing
`forkTrip` (§2.14); sample-data redaction (§6.6); and, in `ROADMAP.md`, how an acceptance criterion is
allowed to be written. Every number in the new sections was measured against the live planner, not
reasoned about; the measurements are in the sections themselves.

**Revision 4, 2026-08-26.** QA round 4 found the round-3 fence fix correct but incomplete: two places
*upstream* of the fence still made the category error §2.2a was written to remove (R4-1, R4-2). Rather than
patch them where they surfaced for the third round running, the rule is now stated at the level it lives at
— **§2.2b, the freshness rule**, three clauses with a mechanical check each — and §2.2a, §2.9, §2.10, §2.14,
§4.2 and §4.3 are amended to it. §2.14 also carries the ruling on R2-11's `displayStatus` half, which had
been left to silence for two rounds.

**Revision 5, 2026-08-26.** The Phase 1 gate review (`REVIEW.md`, verdict SEND BACK) routed four rulings
here, none of them a redesign. What changed, and where: the copy path gets its row in the geography anchor
table and copied records stop producing blockers (§2.13, QA R2-9); the serialization chain's subject becomes
every `StoragePort` *mutation* rather than every *write*, so `delete()` goes on the chain too (§4.2 rule 6c,
§4.3, QA R7-3); the flush loop's bound is blessed at 5, named in the design, and its exhausted exit becomes a
refusal that shows on screen and re-arms the debounce (§4.2 rule 6a″, QA R6-1/R6-2); and §2.10's export
surface is settled at **69 runtime symbols**, derived by a stated principle rather than enumerated against
itself (QA R2-12, KD-19). §2.2 and §2.5 pick up three documented-shape drifts in the same pass.

**Phase 1 is §2 and §4.** Everything else is the shape those two must not foreclose. See `ROADMAP.md`.

## Read only your sections

This document is ~39k tokens. Nothing needs all of it, and a fresh agent that reads it whole starts a sixth
of the way into its context before writing a line. Pull what you need:

```bash
cairn/tools/doc-section ARCHITECTURE 2 4     # prints §2 and §4 only
cairn/tools/doc-section ARCHITECTURE         # lists the sections and their sizes
```

| § | Contents | ≈ cost | Who needs it |
|---|---|---|---|
| 0 | Six positions, stated up front | <1k | everyone — read it, it is 20 lines |
| 1 | Stack decision and the capability checks behind it | 3k | architect. Settled; do not re-litigate |
| 2 | **Domain model — the builder's contract.** §2.12 `travelRole`, §2.13 geography and §2.14 import/copy are new in revision 2 and are where the Phase 1 rework lives; **§2.2a (the `StorageVersion` write fence, revision 3) and §2.2b (the freshness rule it turned out to be one instance of, revision 4) are read together with §4.2 and §4.3, never alone**; §2.10 (the export surface) and §2.13's copied-record row are settled in revision 5 | 22k | builder, breaker |
| 3 | Module boundaries | <1k | builder |
| 4 | **The Phase 1 client.** §4.2 rule 6 (a pending write is never outlived by its document) is new in revision 3 — QA R3-2; rule 6a′ and the `savedDoc` predicate are revision 4 — QA R4-1; **rule 6a″ (the flush bound and its exits) and rule 6c's "delete goes on the chain" are revision 5** — QA R6-1/R6-2/R7-3 | 6k | builder |
| 5 | The four hard subsystems | 1k | breaker; builder from Phase 3 on |
| 6 | Privacy, authorization, deletion cascade | 2k | breaker, manager; builder for §6.2 |
| 7 | Explicitly deferred | <1k | anyone about to build something not in the roadmap |

Read the whole document when you are the manager, when you are changing the design, or when a change
crosses a section boundary. Otherwise this table is the contract.

---

## 0. Six positions, stated up front

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
6. **A fact about a resource is only valid at the moment, and in the place, the resource itself stated
   it.** Everything else is a copy, and every copy goes stale. This is one principle with three
   consequences — nothing may fence *or gate* a write to storage with a property of the document; nothing
   may infer "unchanged" from a counter rather than from the thing that was written; and no token storage
   mints may depend on a value cached outside the step that mints it. Separately, a debounced write is
   flushed before the document it belongs to is replaced, and if it cannot land, the switch does not
   happen. Four consecutive QA rounds found the same error at four different levels — R2-1 (compare above
   the port), R3-1/R3-4 (`revision` as the fence), R4-1 (`revision` as the decision to write), R4-2 (a
   port's cached `epoch`) — which is why it is stated once, as a rule with mechanical checks, in **§2.2b**.
   §2.2a is the fence itself; §2.2b is the rule §2.2a turned out to be one instance of; §4.2 rules 3, 4
   and 6 are where the client obeys them.

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
  revision: number;              // CONTENT revision. Bumped by every build function. NOT a write fence — §2.2a
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
  links?: Link[];                // reference links (the legacy `book:` field where it is not a ticket) —
                                 // §2.11. Descriptive, so it copies across trips (§2.14 rule 5).
  ticket?: Ticket | null;        // a ticket attached to the STOP rather than to a Booking — §2.11.
                                 // Absent and null both mean "none". NEVER copies across trips: a ticket
                                 // is an access credential (§2.14 rule 3, §6.6).
};

type StopPlacement =
  | { kind: 'scheduled'; dayId: DayId; time: ClockTime | null; order: number }
  | { kind: 'pool'; cityKey: CityKey; hint?: { dayId: DayId; time: ClockTime } };

type PlaceLink =
  | { kind: 'place'; placeId: PlaceId }
  | { kind: 'inline'; at: LatLng }
  | { kind: 'none' };            // MUST be supported end-to-end

type Place = { id: PlaceId; cityKey: CityKey; name: string; at: LatLng | null;
               category: StopCategory; note?: string; links?: Link[]; hours?: OpeningHours };
// `at: null` means the source had no coordinates. The live planner has exactly one ("Windsor
// Great Park / Long Walk"); importing it honestly and letting `validateTrip` report it is the
// point, and `geoCheck` skips it (§2.13, last row of the anchor table).

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
| `Trip`, `Day`, `Stop`, `Place`, `Booking` | Server-authoritative from Phase 2; client-replicated and offline-editable. In Phase 1 the client *is* the authority. | Last-writer-wins per stop behind the **storage-version guard** — §2.2a, not `Trip.revision`. |
| `Ticket` bytes | Server object storage, private bucket, keyed `trip/{tripId}/…` | Bundled tickets are repo files today; that pattern survives as "an asset we host". |
| `Conflict` | **Derived. Never stored.** | Only `ConflictResolution` is stored. §2.7. |
| `Leg`, cost roll-ups, clusters, `CITY_RANGE` | **Derived. Never stored.** | §2.5. |
| `MailAccount`, `IngestCandidate` | Server only. | §5.1. |
| `LocationFix`, `LocationSegment`, `PhotoAsset` | **Device only. No server table exists.** | §6.1. |
| `SharedTrace` | Server, opt-in per day. | The only location data ever transmitted. |

### 2.2a `Trip.revision` is a content counter. The write fence is a separate opaque `StorageVersion`

Revision 2 used one number for two jobs and they are not the same job. QA R3-1 is the bill: `undo()` restores
a previously captured `Trip` — `revision` and all — that snapshot gets autosaved, the stored revision moves
*backwards*, and a revision the compare-and-set guard had already spent on refusing another tab is re-issued
to different content. The refused tab's next keystroke passes the compare and lands. Both tabs then display
"Saved" over different documents, which is the R2-1 symptom sentence verbatim. R3-4 is the same root defect
seen from the other side: a bare per-document counter cannot distinguish "this document, unchanged" from "a
different document that happens to sit on the same number" after a delete and recreate under the same id.

The mistake was not the counter. It was asking a **property of the document** to fence **writes to a
resource**. Those are split, permanently:

**1. `Trip.revision` — content revision. Semantics unchanged, wording corrected twice.** Bumped by every
build function. Restored verbatim by undo/redo, because a snapshot restore is supposed to reproduce the
document exactly. The invariant that is actually true is one sentence long, and revision 3 got it wrong:

> **`revision` may prove that two documents differ. It may never prove that they are the same.**
> `a.revision !== b.revision` implies `a ≠ b`, because `revision` is itself part of the content.
> `a.revision === b.revision` implies **nothing**, not even within one document in one store.

Revision 3 wrote "within one document in one store, equal `revision` implies identical content" and QA R4-1
falsified it in six lines: `undo()` restores a snapshot verbatim, `revision` included, so a document at
revision *N* can be undone to *N−1* and pushed forward by a **different** edit back to revision *N* — a
different document wearing a number an earlier document already wore. One document, one store, equal
revision, different content. The clause is struck. What survives is
non-decrease along a chain of build-function applications and nothing else; a revision from another store,
another device, an imported file or a hand-edited record carries no meaning at all.

**`Trip.revision` MUST NOT be used as a compare-and-set token, an ETag, a sync cursor, evidence that one
document is newer than another, or — this is the R4-1 addition — as grounds for skipping any work,**
anywhere, in any phase. Using `!==` on it to *trigger* work is sound (difference is provable); using `===`
on it to *suppress* work is the defect, every time. §2.2b F2.

**2. `StorageVersion` — the write fence. Opaque, storage-issued, outside the document.**

```ts
type StorageVersion = string;                              // opaque. Compared for EQUALITY only.
type StoredDoc = { doc: TripDoc; version: StorageVersion }; // what load() returns
```

Four rules define it, and they are the entire contract:

1. **Storage issues it, on every successful write, inside the same atomic step as the write.** Nothing above
   the port ever computes, derives, increments or forges one. The client's only sources are `load()` and a
   successful `saveIfVersion()`.
2. **It never repeats within one storage, ever** — not after a `delete()`, not after the record is recreated
   under the same id, not after the whole database is recreated. This is what closes R3-4's ABA. The rule was
   stated correctly in revision 3 and the implementation drifted from it (R4-2), so it now carries its
   burden of proof: **a port must be able to name which of exactly two uniqueness arguments it relies on** —
   (a) *transactional*: every value the token is computed from is read **and** written inside the same atomic
   step as the write it fences, in the same storage that write goes to; or (b) *probabilistic*: at least 128
   bits of fresh CSPRNG entropy per mint. Anything else — a closure variable, a module variable, a field of
   `AppState`, a value read at open — is neither, and is rule 5.
3. **It is opaque and equality-only.** No ordering, no arithmetic, no parsing, no inference of recency. This
   is the discipline that lets an HTTP `ETag`, a Postgres `xmin` and a SQLite counter all be dropped in
   without touching a line above the port. Corollary, added after R4-2: **no test, golden or fixture may
   contain a `StorageVersion` literal.** A test that pins `'mem.1'` is a test that will be "fixed" by making
   the token predictable again.
4. **It is not part of `Trip`.** It lives in the storage record's envelope beside the serialized document,
   never inside it. `toJSON`/`fromJSON` round-trip is untouched, an exported backup carries no storage state
   (correct — an export is content), and — the point — no in-memory document operation can rewind it. R3-1 is
   structurally unreachable rather than fixed.
5. **Nothing a token is computed from may be cached outside the step that mints it.** Added after R4-2.
   A port may memoize *that* a one-time job has run (a `Promise<void>` carrying no value); it may not
   memoize a *value* that a later token is derived from. §2.2b F3 states the check.

**The Phase 1 construction, revised after R4-2.** `version` is **16 bytes of fresh CSPRNG output per mint**,
base64url-encoded, computed inside the same `readwrite` transaction as the write and derived from nothing
else. Rule 2 argument (b). The `epoch` and the storage-wide counter are **deleted**, along with the `meta`
object store that held them — a single random token per write does both jobs the pair was doing (distinct
within a database; distinct across a database's recreation) and, crucially, leaves nothing that can go stale.

Revision 3's `"${epoch}.${n}"` was not wrong about what had to be true; it put the uniqueness-bearing value
somewhere that had to be *remembered*, and a remembered fact about storage is exactly what a storage wipe
invalidates. R4-2 is that, exactly: a tab alive across a site-data clear (or the 7-day eviction of §1.1)
kept minting `${deadEpoch}.${n}` against a counter genuinely reset to zero, reproducing a token it had
issued before the wipe byte for byte — verified in Chromium against real IndexedDB. The counter half was
always fine (it *was* re-read inside the transaction, argument (a)); the epoch half was the cached one. Under
rule 5 the old construction is illegal and the new one has nothing to make illegal.

`apps/web` mints with **`crypto.getRandomValues(new Uint8Array(16))`, never `crypto.randomUUID()`.**
*Verified:* `randomUUID` is a secure-context-only API and is `undefined` when a page is served over plain
HTTP from a LAN address — which is exactly how `tools/serve.mjs` would be used to open this on a phone —
while `getRandomValues` is available in insecure contexts. The existing `Date.now()`/`Math.random()`
fallback is **forbidden for a fence**: `Math.random()` is not a CSPRNG and its collision behaviour is not the
one rule 2(b) is claiming. If no CSPRNG is present the port throws and the store shows `'error'` — a fence
fails closed. (`browserIds()` has the same `randomUUID`-or-`Math.random` shape for *ids*; ids are content,
not fences, so this is not a defect there, but it should move to the same helper — noted, not required.)

The in-memory port stays deterministic, because `packages/client` may not touch ambient randomness: it mints
`"${instance}.${n}"` where `n` is its own counter and `instance` is drawn from a module-level counter that
never rewinds within one Node process. Deterministic across runs, distinct across every port instance in a
run — so "the database was recreated" (a second `memoryStorage()`) does **not** silently reissue the first
one's tokens, which is what a fixed default `epoch` did. A test that wants to model a collision injects a
mint function explicitly. Nothing above the port can tell the two constructions apart, which is rule 3.

**Records written before this design existed** (they exist in Jacob's IndexedDB) carry no envelope version.
The port stamps every such record with a fresh version in one `readwrite` transaction at open, once, before
serving any read — so `load()` stays `readonly` and no code path above the port ever sees a versionless
record.

**What the fence does not see.** A record edited out of band — devtools, a hand-written IndexedDB entry —
does not advance the version, so a stale writer will overwrite it. Revision 2's scheme would have caught that
by accident, if the hand edit happened to change `revision`. This is a deliberate trade and it is the right
one: the guard's subject is *writes through the port*, and a guard that depends on parsing user-controlled
bytes is a guard whose refusal behaviour is decided by an attacker's JSON.

**The seven cases this has to survive.**

| Case | What happens |
|---|---|
| **Two tabs, concurrent** (R2-1) | Both hold `V0`, both issue `saveIfVersion(id,'V0',…)` before either awaits. Inside one atomic step exactly one finds `V0`, writes, and gets back a fresh `V1`; the other finds `V1 ≠ V0` and gets `{ok:false, storedVersion:'V1'}`. Winner `'idle'`, loser `'conflict'` with its edit in memory and an indicator that does not read "Saved". Unchanged behaviour; the token is simply no longer forgeable. |
| **Undo / redo** (R3-1) | The reducer restores the snapshot verbatim, `revision` and all, and **does not touch `persistence.savedVersion`** — that field is bookkeeping about *storage*, not about the document. The autosave that follows therefore still expects whatever storage last agreed with this store. A tab already refused still expects `V0` and is refused again; a tab in good standing writes its undone content forward and legitimately says "Saved", because that content really is in storage. The narrow client fix R3-1 proposes — making `undo` synthesise `revision + 1` — is **superseded and MUST NOT be built**: it would make the counter look like a version while an imported file could still assert any number it liked. |
| **Merge** (`mergeWithStored`) | `load()` returns `{doc, version}`. The merge is only valid against that exact `remote`, so the merged write carries **that same `version`** as its expectation. A third writer landing in between moves the version, the port refuses, the conflict stands unmerged and the edit stays in memory. On success the merged write mints a new version, which becomes `savedVersion`, and `baseDoc` becomes the merged document. The deleted-trip branch expects `null` — "nothing is stored under this id" — so a newcomer appearing in the gap is refused rather than clobbered. (This reinforces rather than replaces the R3-3 fix: the merged write must go through the store's own save chain, because an expectation computed before an in-flight autosave settles is stale by construction.) |
| **Delete then recreate under one id** (R3-4, ABA) | `delete()` removes the record; the counter does not rewind. The recreated record gets a strictly fresh version, so a writer holding the dead record's version matches nothing and is refused. `importDoc`'s "keep the original id when it is free" path — the export → delete → restore sequence — is therefore safe by construction, and so is the within-lineage recycle R3-1 exploited. One mechanism, both findings. |
| **The whole database is destroyed under a live tab** (R4-2, ABA one level up) | Site data cleared, or §1.1's 7-day eviction of a non-installed tab. Tab A has been open the whole time and holds `V`. Tab B restores the backup into the freshly-created database and gets `V2`. `V2` is 128 fresh random bits, so `V2 ≠ V` — not because anything checked, but because there is no shared derivation for the two to collide through. A's next keystroke offers `V`, matches nothing, is refused, and A reads *"Not saved — edited elsewhere"* rather than "Saved". The old scheme produced `V2 === V` here, verified in Chromium. Note what the fix is *not*: it is not "re-read the epoch more often". Any cadence leaves a window, because the wipe is not an event the port is told about. |
| **Phase 2, server-authoritative** | The token becomes server-issued: an `ETag` on the trip resource, `If-Match` on the write, or a `version` column with `UPDATE … WHERE version = $expected`. Because the client only ever compares for equality and only ever obtains a token from a port result, **nothing above the port changes** — same `persistence.savedVersion`, same refusal → `'conflict'`, same `mergeWithStored`. A synced device's local record carries **two** envelope fields, and they are never conflated: `version` fences local writers (two tabs on one device) and `serverVersion` records the last version the server acknowledged, fencing the sync push. Two fences over two resources. Phase 2 adds a field; it does not redesign this. |
| **Phase 4, `apps/mobile` over SQLite** | Identical contract, no SQLite-specific concept. `UPDATE trips SET doc=?,summary=?,version=? WHERE id=? AND version=?` (or an insert guarded on absence when the expectation is `null`) inside one `BEGIN IMMEDIATE` transaction, with `changes() === 0` meaning refused; re-read and return `storedVersion`. The counter is a one-row `meta` table bumped in the same transaction. `expo-sqlite` exposes `withExclusiveTransactionAsync()` for exactly this, and `BEGIN IMMEDIATE` is the documented way to avoid a mid-transaction `SQLITE_BUSY` — *verified against Expo's SQLite docs and expo/expo#13552, but the isolation actually delivered across two JS contexts must be re-verified on a device before Phase 4 ships.* The token being an opaque **string** rather than a number is what makes all three backings free. |

### 2.2b The freshness rule — three clauses, three mechanical checks

§2.2a fixed the fence and QA round 4 found the same error twice more, one level away from it each time. That
is the third consecutive round on one root cause, so the rule gets stated at the level it actually lives at
rather than being patched where it last surfaced.

**The principle.** *A fact about a resource is only valid at the moment, and in the place, the resource
itself stated it.* Five findings across three rounds are one violation each:

| Finding | The fact | Whose it really was | Where it went stale |
|---|---|---|---|
| R2-1 | "storage still holds *R*" | storage | between the `load()` and the `save()` |
| R3-1 | `Trip.revision` as the fence | the document | undo rewound it |
| R3-4 | `Trip.revision` after delete+recreate | the document | a new record inherited an old number |
| **R4-1** | `revision === savedRevision` ⇒ "nothing to write" | the document | undo made revision non-injective over content |
| **R4-2** | the port's cached `epoch` | storage | the database was destroyed and recreated |

§2.2a's wording — *"a property of the document may never fence writes to a resource"* — is necessary and not
sufficient. It governs the write path and says nothing about the decision *whether to write*, and nothing at
all about a cached fact concerning the storage instance itself. Three clauses, each with a check a future
round can run mechanically:

> **F1 — No property of the document may fence *or gate* a write.** The decision to *skip* a write is the
> same decision as the decision to *refuse* one, taken earlier and with strictly less information; it is
> subject to the same prohibition. Any code that decides whether to call `saveIfVersion` at all is write-path
> code.
>
> *Check:* enumerate every branch that can cause `saveIfVersion` not to be called for a document that differs
> from what storage holds. Each must be justified by F2 or be the one stated exception (§4.2 rule 6c,
> `deleteTrip` of the active trip).

> **F2 — "Unchanged since the last write" is answered by comparing against the thing that was written, never
> by a counter derived from it.** The permitted answers are exactly two: reference identity against the
> document object that was written (`doc === savedDoc`), which is exact because `Trip` is immutable; or
> equality of the serialized bytes. `Trip.revision` is not a permitted answer for **any** purpose that can
> skip a write, reuse a cache, or suppress an effect.
>
> *Check:* grep `packages/client` and `apps/web` for `revision` in a `===` or `!==`, and for `revision` in a
> React dependency array or any other memoisation key. Every hit is a defect unless the comparison can only
> ever cause *more* work to happen. (`!==` triggering work is sound — difference is provable. `===`
> suppressing work is the bug, every time. §2.2a rule 1.)

> **F3 — No token storage mints may depend on a value cached outside the atomic step that mints it.** A port
> may memoise *that* a one-time job has run — a `Promise<void>` carries no value and cannot be wrong about
> one. It may not memoise a *value* a later token is computed from. Uniqueness rests on §2.2a rule 2's
> argument (a) or (b) and the port must be able to say which.
>
> *Check:* read the path from entering `saveIfVersion` to producing the returned `version`. Every identifier
> on it is a parameter, a local, or a value read inside the same transaction. An identifier declared in the
> port factory's closure on that path is a defect. `ensureReady()`'s `ready` promise is legal under this
> check and its `epoch` variable was not — which is the distinction the check exists to draw.

#### F1/F2 applied: what "is there an unwritten edit" means

`dirty()` becomes reference identity against the last document storage agreed with us about, and
`savedRevision` is **deleted from `AppState`** — not corrected, deleted, because it has no remaining job and
a field that exists is a field the next person will compare:

```ts
// packages/client — the whole predicate.
function dirty(): boolean {
  return !!state.doc && state.doc !== state.persistence.savedDoc;
}
```

`savedDoc` is the store's existing `baseDoc` — *"the last document this store and storage agreed about"* —
promoted from a module-level `let` into `persistence`, so exactly one pointer answers both questions that
need it (the merge's common ancestor, and this one), it moves only inside a `set()` so a subscriber can
never read an indicator that disagrees with the state it was handed, and a test can assert it. It is
assigned in exactly the places `savedVersion` is: a successful `saveIfVersion` (to the document written),
`load()`'s result in `openTrip`, and `null` on close/delete. The reducer never touches it — undo and redo
change the document, not what storage holds.

**Why identity and not the alternatives.** The failure profiles are not symmetric, and that is the whole
argument:

| Answer | False "dirty" (harmless: an extra write) | False "clean" (**silent data loss**) |
|---|---|---|
| `doc.revision === savedRevision` | undo back to the saved document | **reachable in six lines** — R4-1 |
| `doc === savedDoc` | any rewrite producing equal content | requires a `Trip` mutated in place |
| `toJSON(doc) === lastBytes` | none | requires the bytes to be wrong |
| `hasUnwrittenChange` flag | undo back to the saved document | **whenever the flag's bookkeeping is wrong** |

- **Serialized-bytes comparison is correct and is rejected as the runtime mechanism.** It is not *more*
  correct than identity: identity gives a false "clean" only if a `Trip` is mutated in place, which is
  already forbidden by §2.1 and already asserted independently ("input immutability after every build
  function"), and which would have corrupted the undo stack and the derived cache long before it reached
  here. It costs a full serialization of a 176 KB document at every flush-decision point — including inside
  `beforeunload`, on the main thread, while the user is trying to leave — plus a retained copy of the bytes.
  Strictly more expensive for a strictly narrower gain. **It keeps a job, though: it is the *test oracle*.**
  The regression criterion asserts `isDirty() === (toJSON(doc) !== the bytes storage holds)` at every step of
  a walk — the expensive exact answer checking the cheap one, which is the only thing that makes the cheap
  one trustworthy.
- **A `hasUnwrittenChange` boolean is rejected**, and it is worth saying why at length, because it is the
  obvious answer and it is the same category error again. A boolean is a *summary of history* standing in for
  a *statement about the present* — precisely what `revision` was. It then has to be reconciled with every
  outcome, and the reconciliation is where it drifts: (i) a **refused** write must not clear it, so the clear
  becomes conditional on `ok:true` — fine; (ii) **two flushes race**: flush 1 (of document A) resolves after
  a new edit has produced document B, and clearing the flag on flush 1's success marks B as written. Storage
  holds A, the flag says clean, the next transition skips the write — R4-1 with a different field. The store
  already detects this case, and it detects it with `state.doc === startedFrom` (`stillOurs`) — document
  identity. So the flag is only safe if the identity pointer exists anyway, at which point the flag is a
  duplicate of `doc !== savedDoc` that can disagree with it. (iii) a **stale confirmation** clearing a flag
  set by a newer edit is case (ii) again. Keeping the fact instead of a summary of the fact is the same move
  §2.2a made one level down.
- **Folding content into the `StorageVersion`** (a hash of the document as, or inside, the token) is
  rejected outright: it re-couples content to the fence, which is the thing §2.2a exists to prevent, and a
  content hash is something the client computes, so storage would no longer be the sole issuer (rule 1).

**The skip stays, and it is now sound.** `flushForTransition` may still avoid rewriting 176 KB on every
navigation, on **all three** of: `persistence.status === 'idle'`, no pending debounce timer, and
`state.doc === state.persistence.savedDoc`. The third is the real condition; the first two are belt and
braces and are stated as such — each can only cause more writing, never less, which is what F2's check
requires of any conjunct. `flush()` itself remains unconditional (QA round 4 confirmed it does not consult
`dirty()`, and it must not start).

#### F2 applied: the derived cache has the identical defect

`derivedFor(cache, trip, today)` keys on `cache.revision === trip.revision && cache.tripId === trip.id`.
That is `===` on a revision suppressing work, so R4-1's sequence makes it serve the pre-undo document's legs,
costs, clusters, conflicts and map bounds for a document that no longer contains them. §4.2 rule 3 and
ROADMAP F both say derived data is *"recomputed on `doc.revision` change and never read stale"*, and the
second half of that sentence does not follow from the first.

**Honest scoping of this one, because it was reasoned to and not measured.** QA round 4 measured R4-1 in
Chromium; it did not measure this. Reaching it requires no `getDerived()` call between the `undo()` and the
next edit, and in `apps/web` the store's subscriber fires synchronously on `undo()`, so React usually renders
and refreshes the cache in that gap — the defect is *narrow* through the React app and **not** narrow through
`packages/client` used headlessly (the CLI, any test, any future non-React consumer, and `syncResolutions`
below, which does not render at all). It is fixed regardless: the key is wrong for the same reason
`dirty()` was, the correct key is cheaper than the wrong one, and "currently hard to reach through one
surface" is not a property this design gets to rely on.

The key becomes identity, and gains the clock it was always missing:

```ts
type DerivedCache = { doc: Trip; today: IsoDate; days: …; conflicts: …; issues: …; tripCost: …; summary: … };
// reuse iff cache.doc === trip && cache.today === today
```

`tripId` is subsumed — two trips cannot be the same object — and `revision` leaves the cache entirely.
Adding `today` closes a smaller pre-existing hole: date-sensitive conflict rules went stale across midnight
because nothing invalidated on the clock.

This is not only a rendering concern. `store.syncResolutions()` reads the derived conflict set and **writes
the document** from it (`core.syncResolutions(doc, derived.conflicts, today)`), so a stale cache there
retires resolutions against conflicts the current document does not have. A display bug and a document
mutation, from one `===`.

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
computeLegs(day: Day, trip: Trip): (Leg | null)[]   // index-aligned with day.stops
type Leg = { mode: TravelMode; mins: number; km: number | null; source: 'override' | 'estimate' };
```

**The second parameter is the `Trip`, not a `TripCtx`** (revision 5, QA R2-21). Revisions 2–4 of this section
wrote `ctx: TripCtx` and the code has always taken `trip: Trip`; the doc was wrong and is corrected here
rather than the code, because the only thing `computeLegs` needs the second argument for is
`trip.places` — resolving a `PlaceLink {kind:'place'}` to a coordinate. `TripCtx` is the *conflict engine's*
per-run context (`{ trip, today? }`, §2.7) and it has no business in a derive function that must not know
what day it is. §2.5 is the section a Phase 4 native port is written from, so the signatures here are the
shipped ones, verbatim: a name that only reads right is the drift this revision exists to remove.

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
`place_ref_dangling`, `lat_lng_out_of_range`, `pool_stop_has_day`, `pool_stop_unknown_city`, `scheduled_stop_has_no_day`,
`booking_ref_orphan`, `cost_basis_mixed`, `provenance_missing`, `accepted_without_timestamp`,
`owner_missing`, `origin_stripped`, `accepted_by_non_member`, `stale_resolutions`, `invalid_calendar_date`.

- **`accepted_by_non_member`** (level `error`, added in revision 4 — QA R2-11): a record with a non-null
  `attribution()` whose `provenance.state === 'accepted'` and whose `provenance.actorUserId` is not a member
  of the trip. In Phase 1 `members(trip) === {trip.ownerId}`; in Phase 2 it is `TripMember`. Scoped to
  attributed records because that is exactly §2.14's subject — the credited copy, where "somebody else
  decided this is yours" is the thing that must not be silent. It is an `Issue` and not a throw because a
  wrong actor arrives *inside a document* (a restored backup, a hand-edited record, a Phase 2 sync), where
  throwing means an unopenable trip; §2.9 is where document-level claims are enforced. The *call* that would
  create one throws instead — §2.14.

Four changes from revision 1, each with a reason:

- **`pool_stop_unknown_city`** (level `error`): a pooled stop whose `cityKey` is neither one of
  `trip.cities` nor the transit pseudo-city. The pool is reached *through* a city, so such a stop is in the
  document, counted in the pool total, and rendered by nothing — the user's stop is gone with no error and
  no way back (QA R2-2). The transit key is deliberately **exempt**: it is a rendered catch-all group, not
  a hole, and a rule that fired on every brand-new trip would be noise. `returnToPool` will not mint an
  unreachable key, so this rule exists to catch a hand-edited document, a deleted city, and the next bug.
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

**Settled in revision 5 (QA R2-12, KD-19).** The list below is the whole contract: **69 runtime symbols**,
one list, asserted as set equality in both directions against the runtime exports of
`packages/core/src/index.ts`. It replaces a two-list arrangement — 50 "in §2.10" plus 60 "beyond §2.10, each
with a justification" — that made the criterion true by construction against 110 exports. A boundary the
Phase 2 server and the Phase 4 native app are written against cannot be "110 against 50, enumerated".

#### How the list was derived — the principle, so the next change does not need a ruling

A symbol is on the surface if **either**:

**(P1) a consumer outside `packages/core` calls it today** — `packages/client`, `apps/web`, `cli.ts`,
`fixtures/`, `tools/`. Measured, not assumed: 50 symbols, counting the reducer's string-keyed
`ACTION_SPECS[…].coreFn` dispatch as a call site, because it is one.

**(P2) a numbered section of this document specifies it by name as a callable or a constant.** 19 symbols —
things Phase 1 has no caller for yet but Phase 2 or Phase 4 is being written against: the access predicates
(§6.2), `geoCheck`/`GEO_LIMIT_KM` (§2.13), `clusterStops`/`MIN_SPAN_KM` (§2.5), `SCHEMA_VERSION`/`migrateDoc`
(serialization), `TripParseError`, `RULES`, and the redaction four (§6.6).

Everything else is internal, whether or not it is currently exported. **Tests do not create surface.**
`packages/core`'s own tests, `cairn/test/` and `cairn/qa/` may import a module path directly
(`packages/core/src/derive/geo.ts`) — attacking internals is their job, and routing that through the index
would make every internal public. The un-export pass therefore rewrites some probe import lines from the
index to the module path; that is the expected shape of the change, not a regression.

```
packages/core/src/index.ts re-exports exactly this and nothing else — 69 runtime symbols:

  model (7)      LOCAL_OWNER · SCHEMA_VERSION · sequentialIds · formatRange · costFromDisplay
                 TripParseError · ForeignDocumentError
  build (17)     createTrip(init) · ensureDays(trip) · setTripMeta(trip, patch) · setDayMeta(trip, dayId, patch)
                 addStop(trip, placement, stop) · updateStop(trip, stopId, patch) · removeStop(trip, stopId)
                 moveStop(trip, stopId, placement)      // day↔day, day↔pool, reorder — ONE function
                 reorderStop(trip, stopId, delta)
                 scheduleFromPool(trip, stopId, hint?) · returnToPool(trip, stopId) · poolFor(trip, cityKey)
                 acceptCandidate / rejectCandidate(trip, ref, actorUserId: UserId, at)  // NOT nullable — §2.14
                 copyStopInto(target, source, placement, ctx)        // §2.14 — the social primitive
                 upsertBooking · linkBooking
  derive (21)    computeLegs(day, trip) · dayMovingMinutes(day, trip) · dayDistanceKm(day, trip) · fmtMins
                 clusterStops · focusCluster · fitSpanKm · MIN_SPAN_KM · mapBounds · stopPoints · stopLatLng
                 rollUpCost · displayStatus · attribution
                 cityRange · daysForCity · orderedCities · weekdayOf · tripSummary
                 geoCheck · GEO_LIMIT_KM                             // §2.13 — one implementation
  conflict (5)   detectConflicts · RULES · resolveConflict · unresolveConflict · syncResolutions
  validate (2)   validateTrip · issueCounts
  merge (2)      mergeTrips · describeMerge                          // §4.2 rule 6b's "merge with the stored copy"
  access (7)     canView · canComment · canEdit · canShare · canDelete · can · effectiveRole   // §6.2
  serialize (3)  toJSON · fromJSON · migrateDoc
  import (1)     importLegacyDays
  redact (4)     REDACTION_PATTERNS · REDACTED · redactText · redactionHits                     // §6.6

  types          exported freely and NOT part of the set-equality assertion: types are erased at runtime,
                 `tsc` already fails on a missing one, and a type cannot leak an implementation the way a
                 function can.
```

#### The 45 that come off, and why

`CAT_DEFAULT_TIME` · `DEFAULT_CLUSTER_THRESHOLD_KM` · `EARTH_RADIUS_KM` · `STALE_RESOLUTION_LIMIT` ·
`addDays` · `addPlace` · `blankDay` · `canonical` · `cityOfStop` · `compareStops` · `conflictId` ·
`conflictsFor` · `currenciesOf` · `dateSpan` · `dayCost` · `dayNumber` · `digest` · `emailCandidate` ·
`findDay` · `findStop` · `fixedClock` · `friendImport` · `fromDayNumber` · `haversine` · `inRange` ·
`insertionIndex` · `isIsoDate` · `legBetween` · `makeConflict` · `makeStop` · `mergeLostData` · `mixesBasis` ·
`needsBadge` · `parseCostDisplay` · `parseIsoDate` · `pickDay` · `rawSpanKm` · `resolvePlaceLink` ·
`statusLabel` · `stopsForBooking` · `supersedeBooking` · `systemSuggestion` · `timeVal` · `toDoc` ·
`userProvenance`

They fall into four groups, and the group is the reason — no per-symbol justification list, because a
per-symbol justification list is what let 42 wrong justifications through:

1. **Internals of a public function** (`legBetween`, `haversine`, `resolvePlaceLink`, `inRange`,
   `rawSpanKm`, `dayCost`, `parseCostDisplay`, `currenciesOf`, `mixesBasis`, `timeVal`, `insertionIndex`,
   `compareStops`, `conflictsFor`, `mergeLostData`, `blankDay`, `makeStop`, `findDay`, `findStop`,
   `cityOfStop`, `pickDay`, `addPlace`, `stopsForBooking`, `supersedeBooking`, `addDays`, `dateSpan`,
   `dayNumber`, `fromDayNumber`, `parseIsoDate`, `isIsoDate`, `statusLabel`, `needsBadge`). Exporting the
   halves of a function alongside the function invites a caller to assemble its own version of it — which is
   how two implementations of one geography rule came to exist (§2.13).
2. **Tuning constants a caller must not read or reproduce** (`CAT_DEFAULT_TIME`,
   `DEFAULT_CLUSTER_THRESHOLD_KM`, `EARTH_RADIUS_KM`, `STALE_RESOLUTION_LIMIT`). Contrast `MIN_SPAN_KM` and
   `GEO_LIMIT_KM`, which are on the surface because §2.5 and §2.13 state their values as part of the contract
   and a consumer explains a finding with them.
3. **Identity and canonicalisation** (`conflictId`, `makeConflict`, `digest`, `canonical`, `toDoc`) — the
   six the builder's own test already tagged `INTERNAL`. A conflict id is a value core mints and consumers
   compare; a consumer that can *mint* one can mint a resolution for a conflict that never existed.
4. **Provenance constructors** (`userProvenance`, `systemSuggestion`, `emailCandidate`, `friendImport`) and
   the test-only `fixedClock`. These are the same class as `accept`/`reject`, which QA R5-5 already took off
   the surface for the same reason: they stamp provenance with no gate, so exporting them publishes a way to
   mint an attributed record without going through `copyStopInto` and its seven rules (§2.14).

**Enforcement.** One list in `surface.test.ts`, set equality in both directions against `index.ts`'s runtime
exports, **no union and no second list**. A symbol added to the index without being added to §2.10 fails; a
symbol in §2.10 that is not exported fails. Widening the surface is a documentation change first — add the
caller or add the section that names it, then add the line.

`moveStop` covering day↔day, day↔pool and reorder is deliberate: today those are three functions with three
chances to disagree about what happens to `sug`/`_optId`/`addHint`.

`access` predicates ship in Phase 1 even though nothing enforces them yet — they are the definition the
Phase 2 RLS policies are generated from and tested against. Writing them later is the retrofit Jacob
specifically asked to avoid. All seven are on the surface, `can` and `effectiveRole` included: the module is a
*definition*, and a definition with a private half is a definition Phase 2 will re-derive.

The redaction four move onto the index in this revision because `tools/redact.mjs` reaches into
`packages/core/src/build/redactText.ts` by module path today. §6.6 makes redaction a rule with a test behind
it; a rule enforced through a deep import into another package is the boundary erosion this section exists to
prevent.

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
  limitKm: number;                // GEO_LIMIT_KM — 35
  nearest: GeoAnchor | null;      // null when the record has no anchor at all
  confidence: 'certain' | 'unanchored';
};
```

`'unanchored'` carries **two** cases and a consumer tells them apart by `nearest` (revision 5): `nearest ===
null` is *"this trip offered the record no anchor"*; `nearest !== null` is *"anchors exist and this record is
deliberately not measured against them"* — the copied-record row below. Both mean the same thing to
`geo_outlier`, which publishes neither. There is no third `confidence` value, because a consumer that wants
the distinction already has it in a field it must read anyway.

**The principle, stated once:** *every coordinate is measured to the nearest point in the trip's own
declared geography, and a coordinate far from everything the trip knows about is a coordinate to look at.*
Not "far from its city" — a day trip is supposed to be far from its city, and a flight lands wherever it
lands.

The anchor set, by record class. The limit is a flat **35 km** everywhere — the constant is `GEO_LIMIT_KM`
and it is on §2.10's surface, so the number in this paragraph and the number in the code cannot disagree
quietly. There is no second radius, no `daytrip` exemption constant and no travel-mode exemption.

| Record | Anchors |
|---|---|
| **Scheduled stop** on day `D` | centres of every city in `D.cities` · `Trip.homeBase` · every *other* coordinate-bearing stop on `D` · the last coordinate-bearing stop of `D−1` · the first of `D+1` |
| **Pool stop** filed under city `c` | centre of `c` · every coordinate-bearing scheduled stop on a day whose `cities` include `c` |
| **Place** filed under city `c` | the same set, minus any stop that resolves its `PlaceLink` **through this place** (or the record would anchor itself) |
| **Any stop with `attribution(stop) !== null`** — a record `copyStopInto` produced (revision 5) | **none.** `confidence: 'unanchored'`, always. `km` and `nearest` are still measured against the row above so a view can say how far it is, but `geo_outlier` never publishes it |
| any record with no resolvable coordinate | not checked — `place_ref_dangling` and the `PlaceLink {kind:'none'}` path already cover it |

`geo_outlier` publishes `confidence:'certain'` findings as blockers. `'unanchored'` is not published as a
conflict at all in Phase 1 — neither the empty-trip case nor the copied-record case.

#### The copied-record row, and why it anchors on nothing (revision 5, QA R2-9)

Copying *"Arrive LAX"* out of the reference trip into a Lisbon-based trip produced `geo_outlier: dstop-1,
9140 km, certain` — **a blocker, on the phase's newest primitive, seconds after a human deliberately asked
for exactly that record to be there.** §0.5 governs and settles it: a rule that cannot distinguish *"the data
says something impossible"* from *"the data is shaped oddly by design"* degrades to a warning rather than
asserting a defect. A stop copied from another trip being far from this trip's geography is not odd, it is
**the point of the feature**, and ROADMAP C's promise that a third blocker appears only when somebody writes
down why Jacob must act on it cannot survive a primitive that mints blockers by being used.

**The choice, stated as a choice.** The alternative was to give the copied record an anchor inherited from
its origin trip. Rejected, on three counts, in order of how decisive they are:

1. **It is not computable.** `geoCheck(trip: Trip)` is a pure function of *one document*. The origin trip is
   not in it; `provenance.origin` holds ids, not coordinates. Inheriting an anchor means persisting the
   origin's geography inside the copy — new cross-document state, copied without the user asking, going stale
   from the moment it is written, and directly against §0.6.
2. **It would check the wrong claim.** The anchor set means *"the trip's own declared geography"*. A copied
   stop makes no claim about the destination trip's geography until the user accepts it; measuring it against
   the origin's geography would only re-run, against a snapshot, a check that already ran against the live
   document in the trip the record came from.
3. **The detection it appears to buy is already spent.** A copy is byte-identical in position to a record
   that `geoCheck` already examined in its own trip, where the anchors are meaningful. Copying does not
   create a new opportunity to catch a coordinate typo; it creates a new opportunity to *false-positive* on
   one that was already cleared.

**Symmetrically, and this half matters more than it looks: a copied stop is not an anchor for other records
while `provenance.state !== 'accepted'`.** An anchor asserts *"the trip's geography includes this point"*,
and an un-accepted candidate is by construction not yet part of the user's plan (§2.14). Letting one into the
anchor set would let a stop the user has not accepted **suppress a real blocker** on a stop they wrote
themselves. Once `acceptCandidate` runs, it joins the anchor set like any other stop — and note the direction
that moves in: acceptance can only ever *add* anchors, so it can only ever *remove* a blocker, never create
one. A transition that can mint a blocker is exactly what this ruling exists to stop.

**Places need no row of their own, and here is why the table does not grow.** A `Place` carries no
`provenance` (§2.2), so a copied place is not identifiable as one — and it does not need to be.
`copyStopInto` rule 4 copies the place with its `cityKey` verbatim, so in the destination trip it is either
filed under a city that trip *does* have — in which case its anchors are that city's centre and that city's
stops, which is a meaningful measurement and should run — or under a city key that trip has never heard of,
in which case the existing Place row already yields no anchor, `nearest === null`, and `'unanchored'`. Both
outcomes are correct under the rules already written. Adding `Place.provenance` to serve this rule would be
new persisted state bought for nothing.

**A third honest limitation, alongside the two below**: a
coordinate typed *into* a copied stop after it was copied is invisible to this rule, because the row keys on
`attribution(stop) !== null` and not on `provenance.state`. That is deliberate. Keying on state would make
the same document produce different conflicts either side of a provenance transition — accepting a stop could
*create* a blocker, with nobody writing down why — and §0.5 rates a rule that mints unexplained blockers as
worse than a rule with a named blind spot. The blind spot is one field on records the user has already been
told came from somewhere else.

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
3. A coordinate edited into a copied stop after the copy — the copied-record row above.

**None of the numbers above move under revision 5.** The reference trip contains no record with
`attribution(r) !== null`, so the clean run is still 0/112 and 0/94, the +1° detection rate is still 112/112
and 92/94, and the Fisherman's Bastion blocker is untouched. The new row changes what happens to records the
*copy path* creates and nothing else — which is why it is a row and not a rewrite.

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
5. `flags`, `name`, `note`, `category`, `durationMins`, `arrival`, `travelRole` and `links` copy verbatim
   (`note` through `redactText` — BUILD-NOTES KD-20). They are descriptions of a place and a journey, not
   claims about the user. **`ticket` is not on this list and never joins it** — see rule 3.
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

**The invariant to attack, restated in revision 4 after QA R2-11 falsified it in one call:** for every
record `r` with `attribution(r) !== null`, `displayStatus(r) !== 'own'` unless `r.provenance.state ===
'accepted'` **and** `r.provenance.acceptedAt !== null` **and** `r.provenance.actorUserId ∈ members(trip)` —
and `attribution(r)` is *still* non-null afterwards.

`members(trip)` rather than `=== trip.ownerId`: a co-owner or editor accepting is legitimate the moment
`TripMember` exists, so the narrow clause would have been wrong in Phase 2 anyway. In Phase 1 it degenerates
to `{trip.ownerId}` and the two readings coincide.

**Where it is enforced, because "stated as an invariant and enforced nowhere" is what R2-11 found.**
`displayStatus` is a pure function of one `Provenance`; it does not receive the trip and structurally
*cannot* check membership, and it is not going to start — a badge function that needs the whole document is
a badge function that gets called with the wrong document. The invariant is a claim about which documents may
exist, so it is enforced at the two places documents come from:

1. **`acceptCandidate`, `rejectCandidate` and `copyStopInto` throw on a missing actor.** `actorUserId` stops
   being `UserId | null` and becomes `UserId`; `null`, `undefined` or `''` throws, as programmer error, per
   §2.1. An acceptance is a record of *who took this on*; one with no accepter is unfalsifiable forever
   after, and §6.2's "ownership traceable on every row" is on the brief's short list of things that are
   public-grade from day one because they are expensive to retrofit. The Phase 1 client already always
   passes `LOCAL_OWNER`, so this costs nothing today and closes the door before a second user exists to walk
   through it. `copyStopInto`'s `ctx.actorUserId` is already non-nullable in the type and unchecked at
   runtime — the same gap §2.1 already decided in favour of the runtime check for `updateStop`.
2. **A wrong (non-member) actor is `validateTrip`'s `accepted_by_non_member`**, §2.9 — an error on the
   document, not a throw at the call, because that shape arrives from outside.

**Explicitly out of scope in Phase 1, named rather than left silent:** `source:'user'` records built by
`addDay`/`addStop` carry `actorUserId: null` today (`userProvenance(at)` defaults it), and they stay legal.
They assert no acceptance of anyone *else's* content, so nothing is being presented as the user's own that
was not; `attribution()` on them is `null`, which puts them outside the invariant's subject. When accounts
arrive in Phase 2, `BuildCtx.actorUserId` becomes required, `userProvenance`'s default parameter is removed,
and every constructor threads it. That is a deferral with a boundary and a trigger, not an omission.

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
  derived: DerivedCache;       // legs, roll-ups, clusters, conflicts, issues — keyed by (doc identity, today)
  ui: UiState;                 // activeDay, activeCity, mapScope, selection, panels — NEVER in the doc
  history: { past: Trip[]; future: Trip[]; limit: 50 };
  persistence: {
    savedDoc: Trip | null;                 // the document storage last agreed with us about — §2.2b F2.
                                           // Answers "is there an unwritten edit" AND is the merge ancestor.
    savedVersion: StorageVersion | null;   // the WRITE FENCE — §2.2a. `null` = nothing stored yet.
    status: 'idle'|'saving'|'error'|'conflict'; lastError?: string;
  };
};
```

**`savedRevision` is deleted** (revision 4, QA R4-1). It had one remaining consumer, `dirty()`, and that
consumer was the bug; a field left in place is a field the next person compares. `savedDoc` replaces it and
also absorbs the store's module-level `baseDoc`, so there is exactly one pointer to "what storage last agreed
with us about" instead of two facts that can disagree. Because it lives in `persistence` it moves only inside
a `set()`, so no subscriber can render an indicator computed against a pointer the state it was handed does
not contain.

**`savedVersion` and `savedDoc` are assigned from a port result and from nowhere else** — `load()`'s
`{doc, version}`, or a successful `saveIfVersion()` (paired with the document that write carried). Neither is
ever computed from the in-memory document, and **neither is touched by the reducer**, including by
`undo`/`redo`: undo changes the document, not what storage holds. That one sentence is what makes R3-1
structurally unreachable, and it is why `savedDoc` is safe where `savedRevision` was not — it is a *pointer
to bytes that were written*, not a number the document owns.

Six rules, each of which exists because of a specific failure:

1. **Every mutation is `dispatch(action)`, and every action maps 1:1 onto a core build function.** The
   reducer holds no domain logic — it is `doc = core[action.fn](doc, ...args)` plus history and persistence
   bookkeeping. If a feature needs logic the reducer cannot express, the logic goes into core. This is the
   mechanism that keeps web and native from drifting: it is `CLAUDE.md`'s "one data structure drives every
   view", one level up.
2. **`ui` is never persisted into the trip document.** Today the app stores drag order in localStorage keyed
   by `CONTENT_VERSION`, and that conflation is exactly why the cache went stale for a week. Stop order is
   *document* data (`placement.order`); which day is open is *UI* state.
3. **Derived data is never stored, and is invalidated wholesale on `(document identity, today)`.** No partial
   invalidation — cheap at 112 stops, and it removes a class of stale-view bugs outright. Revision 4: the key
   was `(revision, tripId)` and `===` on a revision cannot prove sameness (§2.2a rule 1), so undo-then-a-
   different-edit served the pre-undo document's legs and conflicts — and, through `syncResolutions`, *wrote*
   from them. §2.2b F2. The same defect exists in any view-level memo keyed on `derived.revision`
   (`DayMap`'s effect dependency array is one) and is fixed the same way: depend on the cache object, not on
   a number inside it.
4. **Autosave** writes the whole document, debounced 400 ms. `state.doc !== persistence.savedDoc` drives the
   dirty indicator (§2.2b F2).
   A failed write puts `persistence.status = 'error'` and says so on screen; it never fails silently.
   **The write is compare-and-set, and the compare happens inside the port.** `StoragePort` exposes
   `saveIfVersion(id, expectedVersion, doc, summary)` and nothing else that writes: the comparison and
   the write are one indivisible step (one IndexedDB `readwrite` transaction; one synchronous block in the
   in-memory port). The expectation is `persistence.savedVersion` — the opaque storage token of §2.2a, **not
   `doc.revision`**. If the stored version has moved, the write is refused, `status` becomes `'conflict'`,
   and the indicator says so. **A tab whose write was refused MUST NOT display "Saved."**

   It is worth being explicit about why the compare cannot live in the store, because the first fix put it
   there and it did not hold. `load()` → compare → `save()` is two awaits with an interleaving point in
   the middle: two tabs both read revision *R*, both passed the compare, and the second write destroyed
   the first while **both** displayed "Saved" (QA R2-1, two runs in three). No amount of checking above
   the port closes that window. Two tabs on one trip is not an exotic case; it is Jacob with a second
   window open.

   The store also serializes its **own** saves, chaining each attempt onto the last, so an autosave and an
   explicit `flush()` cannot overlap. A tab that conflicts with itself has no other writer to merge with,
   which makes it an unresolvable state rather than a recoverable one.
5. **Undo/redo is snapshot-based** over the immutable `Trip`, limit 50. Structural sharing makes this cheap.
   The restored snapshot is byte-identical to the document it captured, `revision` included; it carries no
   authority over `savedVersion` (rule 4, §2.2a).
6. **A pending write is never outlived by its document.** The five NO-SILENT-LOSS cases the criterion
   enumerated all keep the edit in memory; QA R3-2 found the sixth, where the edit's *container* goes away —
   a 400 ms debounced write is still pending and the active document is replaced, closed or deleted, so the
   timer fires against a document that is no longer there and the edit is gone with nothing on screen. One
   click, no second tab, inside a window the app chose. Three rules close it:

   **6a. Every transition that changes the active document flushes first.** `closeTrip`, `openTrip`,
   `createTrip`, `adoptTrip`, `importDoc`, `deleteTrip` — that is the complete list, and it is a **closed
   list**: a seventh path that assigns `state.doc` is a defect. Each begins with `await flush()`, which
   cancels the pending timer and awaits the write.

   **6a′ (revision 4, QA R4-1). The flush may be skipped only on the F2 predicate.** `flushForTransition`
   is allowed to avoid rewriting a 176 KB document on every navigation, and that optimisation is where the
   whole of rule 6 was lost: it asked `doc.revision !== savedRevision`, a *content counter*, whether an edit
   would be lost — and undo makes that counter non-injective over content, so a fresh, different edit landing
   on a revision number an earlier edit already used made the store report "nothing to write", skip the
   write, complete the switch, and display "Saved" over a document storage did not hold. One click, no
   second tab, nothing on screen — R3-2's symptom sentence reached through the predicate rather than through
   the timer. The skip now requires **all three** of `status === 'idle'`, no pending debounce timer, and
   `state.doc === state.persistence.savedDoc`; the third is the real condition and the other two can only
   ever cause more writing. `flush()` stays unconditional and must never consult the predicate.

   **6a″ (revision 3, QA R5-1; the bound blessed and its exits ruled in revision 5, QA R6-1/R6-2). The flush
   is a loop, bounded by `FLUSH_MAX_ATTEMPTS = 5`.** A flush is not a moment — it is an `await` long enough
   for the user to type into — so the exit condition is `dirty()`, re-asserted *after* every write and never
   sampled before one. The loop needs a bound because a user typing through every write could otherwise hold
   a transition open forever, and a hang is not an improvement on data loss.

   **Five is right, and the reason is that the bound is not a timeout.** Each pass awaits its own write, so
   slow storage makes the loop *take longer*, it does not make it exhaust; the bound is only reached by a
   document that will not settle. Convergence in the realistic worst case takes two passes — the in-flight
   document, then the one that arrived behind it — and a transition is a *click*, not a typing session, so a
   third pass already means something unusual is happening. Five is two plus three of headroom, and it does
   not need to grow with document size, device speed or trip length. If a future phase finds it exhausted in
   the field, that is a defect report about what will not settle, not a reason to raise the number.

   **Exhausting the bound is a refusal, for display as well as for control flow.** It was the one path that
   aborted a transition without telling anyone: `flushForTransition` returned `false`, the caller returned
   `state` unchanged, `status` was still `'idle'`, and no banner reads `'idle'` — so the click did nothing
   and said nothing. Rule 6b's sentence is *"aborts the transition **and tells the user**"*, and this exit
   owes the same debt as the other two. Concretely, the give-up path sets `persistence.status = 'error'` with
   a `lastError` that names what happened — *"Couldn't finish saving before switching. Your edit is still
   here."* — so the **existing** error banner renders, offering the two recoveries it already offers (retry,
   export this copy). Not `'conflict'`: nothing refused the write and there is no other writer to merge with,
   so offering a merge would be a lie about what went wrong. No new UI mechanism; §4.2 rule 6b's refusal path
   already reaches the screen this way and this exit joins it.

   **And the debounce is re-armed when the loop gives up while the document is dirty.** The loop cancels the
   pending timer on every pass (`cancelTimer()`), including the pass on which it gives up — so before this
   ruling the store was left dirty, `'idle'`, and with **no scheduled write at all** until the user's next
   keystroke. Cancelling work the user's own edit had scheduled and not putting it back is a bug on its own
   terms, independent of the banner. So: on the bound-exhausted exit, if `dirty()`, re-arm the ordinary
   debounce.

   Re-arming automatically is the right shape, and the alternatives are worse for stated reasons. A
   "Retry" button alone leaves a dirty document with nothing scheduled, which is the defect. A dedicated
   retry loop with backoff is a second scheduler on the write path, and §4.2 has one. What is re-armed is the
   **ordinary** debounced `attemptSave`, not another `flushForTransition`, so it cannot recurse into the loop;
   if that write also leaves the document dirty it re-arms only through the normal `scheduleSave` path, which
   is what typing does anyway. When it lands, `status` returns to `'idle'` and the banner clears — the message
   is honestly transient. **The transition is never retried automatically**: the user clicks again. An app
   that navigates by itself some seconds after a click the user has already given up on is worse than one
   that does nothing.

   **The other two exits do not re-arm, and this is a three-way rule the builder must not flatten.** On
   `'conflict'`, a re-armed autosave would spin against a fence that will refuse it every 400 ms; the user
   must merge or export. On `'error'`, the port is failing and the banner's Retry is the deliberate act. Only
   the bound-exhausted exit re-arms, because it is the only one where nothing has actually refused anything.
   In all three, `isDirty()` stays true, the indicator does not read "Saved", and the edit is still in `doc`.

   **6b. If the flush cannot succeed, the transition does not happen.** A refusal (`'conflict'`) or a storage
   failure (`'error'`) aborts the switch: the old document stays active, still holds the edit, the indicator
   does not read "Saved", and the screen names the two things the user can actually do — merge with the
   stored copy, or export this copy. *Discarding the edit with a notice would satisfy the letter of "the app
   says so" and violate the product: this is a local-first, single-owner app whose stated conventions are
   that the user's content is authoritative and that conflicts are surfaced rather than resolved by guessing.
   Blocking is only tolerable because it is rare — it fires when a write genuinely cannot land, not on every
   navigation, which is why "flush" and not "prompt" is the default path.*

   **6c. `deleteTrip` of the active trip is the one exception, and it is explicit.** The pending timer is
   cancelled *without* writing and the transition proceeds — the user asked for that document to be
   destroyed, and 6b would otherwise make a conflicted trip undeletable. The delete confirmation names the
   trip.

   **The exception is about not *writing*. It is not about not *ordering*** (revision 5, QA R7-3). The
   parenthetical this rule used to end on — *"a stray timer surviving a delete would be harmless anyway: its
   expectation matches no record"* — was wrong, and wrong in the direction that costs data. A write already
   queued on the store's serialization chain can settle *after* `ports.storage.delete(id)` returns; an
   expect-absent write (`expectedVersion: null`) is then **satisfied** by the record's absence, so it
   succeeds, `upsertSummary` puts the library row back, and the trip is resurrected with the delete silently
   undone. QA measured it: `in storage=true in library=true`. It is not reachable through the shipped UI
   today, and that is luck, not design.

   So: **`delete()` goes on the serialization chain, as a link of its own** — §4.3. `deleteTrip` does not
   merely `await saving` and then call the port. `await saving; ports.storage.delete(id)` is a check-then-act
   with an interleaving point in the middle, which is §0.6's error one level up from where §2.2a found it:
   between the await resolving and the call, another link can be appended and land concurrently with the
   delete. Putting the delete *on* the chain gives the store one total order over every mutation it issues,
   which is the property `chainOntoSaving` already exists to provide. The link is *"drain, delete, forget"*
   and all three happen inside it: the port delete, the library row removal, and — when the deleted trip was
   the active one — the reset of `doc`, `savedDoc` and `savedVersion`, so that no later link can observe a
   half-deleted store or write against a fence pointer for a trip that no longer exists.

   None of that reopens the exception: the *active* trip's pending timer is still cancelled without writing,
   so the queue the delete link drains contains only writes the store had **already committed to** before the
   user asked for the deletion, and a conflicted trip is still deletable — a refused write ahead of the delete
   in the chain reports its own failure and the delete still runs behind it.

   Belt and braces, because a timer that fires late must not be able to hurt anything: **a scheduled save
   captures the trip id it was scheduled for**, and if `state.doc` is no longer that trip when it fires, it
   is dropped rather than retargeted at whatever is now open. Revision 2's `attemptSave` read `state.doc` at
   execution time, which is how trip A's pending write came to be executed against trip B.

   **Leaving the page is the same case, and the platform will not fully cooperate.** `apps/web` registers
   `visibilitychange` → `hidden` *and* `pagehide` (deduped) and calls `store.flush()` from both, and
   registers a `beforeunload` handler that calls `preventDefault()` while `isDirty()` so the browser shows
   its own "Leave site?" prompt. Verified, and stated as the limitation it is: `hidden` is the last state
   transition a page can reliably observe, `pagehide`/`beforeunload`/`unload` are *not* reliable on mobile,
   Safari does not always fire `visibilitychange` when the user clicks a link away, and the `beforeunload`
   dialog requires sticky activation — satisfied here by construction, since the user typed the edit.
   Crucially, an unload handler **cannot await an asynchronous IndexedDB write**, so the page-exit guarantee
   is "flushed at the last point the platform reliably offers, plus a native prompt if the user leaves
   dirty" — nothing stronger, and the criterion says so rather than pretending. The real guarantee is 6a/6b,
   which covers every in-app transition and needs no cooperation from the browser at all.

### 4.3 Ports — the honesty-to-native mechanism

```ts
type StorageVersion = string;                               // opaque; equality only — §2.2a
type StoredDoc      = { doc: TripDoc; version: StorageVersion };
type SaveOutcome    = { ok: true;  version: StorageVersion }        // the version now in storage
                    | { ok: false; storedVersion: StorageVersion | null };  // null = nothing stored

interface StoragePort { listTrips(): Promise<TripSummaryRow[]>; load(id): Promise<StoredDoc|null>;
                        // EVERY mutation below is issued from inside the store's serialization
                        // chain — `saveIfVersion` and `delete` alike. §4.2 rule 6c, QA R7-3.
                        // ATOMIC compare-and-set. `expectedVersion: null` means "nothing stored yet".
                        // A refusal is `{ok:false, storedVersion}`, not a throw — storage is healthy.
                        // MUST mint a fresh, never-reused version on every success (§2.2a rules 1-2).
                        saveIfVersion(id, expectedVersion: StorageVersion|null, doc: TripDoc,
                                      summary: TripSummaryRow): Promise<SaveOutcome>;
                        delete(id): Promise<void> }
interface FilePort    { exportDoc(name: string, bytes: Uint8Array): Promise<void>;
                        importDoc(): Promise<{ name: string; bytes: Uint8Array } | null> }
interface MapPort     { mount(el, points, bounds): MapHandle; refit(handle, bounds): void;
                        setVisible(handle, visible: boolean): void }
interface ClockPort   { today(): IsoDate }
interface IdPort      { newId(): string }
```

**The chain's subject is every `StoragePort` mutation, not every write** (revision 5, QA R7-3). `store.ts`'s
`chainOntoSaving` is the sole gateway for **all** storage mutations — `saveIfVersion` *and* `delete()` — so
the store issues at most one mutation at a time and in a single total order. A mutation that reaches the port
without going through it is a defect, and the criterion greps for it: every `ports.storage.*` call that is
not `listTrips` or `load` appears lexically inside a `chainOntoSaving` callback. The reason it must be the
port and not "the writes" is that the two kinds of mutation contradict each other — a delete makes a record
absent, and an expect-absent write is *satisfied* by absence, so the only thing standing between them is
their order.

**The port no longer parses the document to run the guard.** `revisionOf(doc)` is deleted: the fence is the
envelope version, so a truncated or corrupt record no longer decides its own refusal behaviour. Every
implementation is also responsible for the one-time upcast of §2.2a — stamp a fresh version onto any record
that lacks one, at open, before serving a read.

**And the port mints from nothing it remembers** (§2.2b F3, QA R4-2). The path from entering `saveIfVersion`
to returning `version` may read only parameters, locals, and values read inside the same atomic step. A port
may memoise *that* its one-time upcast has run — `ensureReady`'s `Promise<void>` carries no value, and a
stale one is harmless because the only records that need stamping predate the fence and cannot appear after
it. It may not memoise a value the token is built from, which is what `epoch` was. `apps/web` mints 16 bytes
from `crypto.getRandomValues`; the in-memory port mints from a per-instance prefix and its own counter;
Phase 2's server mints an `ETag`; Phase 4's SQLite bumps a counter inside `BEGIN IMMEDIATE`. All four satisfy
§2.2a rule 2 by argument (a) or (b), and each must be able to say which.

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
- **Real-time collaboration / CRDTs.** Phase 2 is last-writer-wins per stop behind the §2.2a version guard. Two people
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
