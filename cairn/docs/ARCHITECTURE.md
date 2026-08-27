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

**Revision 6, 2026-08-27.** QA round 8 falsified two promises revision 5 made, both on paths a user reaches
in four clicks. Two rulings, no redesign, and the engine still does not move. **A-5** (§2.7, §4.2 rule 5, QA
R8-1): retirement is *monotone metadata*, not document history — it lives in the document because it must
persist, and a **retirement ledger** outside `history` re-asserts it after every snapshot restore, so undo
reverts the user's edits and never the bookkeeping. **A-6** (§2.13, QA R8-2): revision 5's *"Places need no
row of their own"* paragraph is **withdrawn** — its premise (an unrecognised `cityKey` yields `nearest ===
null`) is false for any trip with a `homeBase`, which is the field §2.13 itself added, so a copied `Place`
mints a blocker. A place whose only referents are copied stops is now exempt, derived at evaluation time
with **no change to `Place`'s shape**. §2.10 moves 69 → 70 runtime symbols as a mechanical consequence of
A-5, and for no other reason. **A-5a** (§2.7, BUILD-NOTES KD-36) is an addendum to A-5, not a new ruling: the
builder objected — with a reproduction — that A-5's absorb step re-acquires a released id from the retired row
the document still carries, which makes a *second* dismissal stillborn. Upheld. The ledger may now acquire a
`conflictId` from a document only when that document holds no live row for it, at **both** the reseed and the
absorb, and everything else about A-5 stands.

**Revision 7, 2026-08-27.** QA round 9 verified A-5, A-5a and A-6 and found one adjacent door open on each,
both user-reachable, both the same defect the ruling was written to close reached one action further along.
Two addenda, no redesign, no change to any engine. **A-5b** (§2.7, QA R9-1): `redo` releases the ledger too —
the release list goes from two `dispatch` action types to three sites, and because history stores snapshots
and not actions, `redo`'s release keys off the document delta (a row count that rises for a `conflictId` is a
redone `resolveConflict` and nothing else). A uniform veto rule *cannot* work here and the addendum proves
it. `undo` is unchanged and must stay unchanged. **A-6a** (§2.13, QA R9-2): A-6 clause 1 stands — 60 of the
reference trip's 94 coordinate-bearing places are orphans and `place-68` is one of them, so exempting orphans
would delete two thirds of the rule's detection — and instead `removeStop` prunes the one `Place` a copied
stop leaves with no referent. `Place`'s shape still does not change, `packages/client` does not change, and
§2.10 stays at 70 runtime symbols.

**Revision 8, 2026-08-27.** The Phase 1 gate re-review (`REVIEW.md`, SEND BACK) routed **one** ruling here
and nothing else. **A-7** (§2.2a, §4.2 rule 4a, QA R11-1): a successful write whose document the store
*declines to install* was still advancing `savedDoc` and `savedVersion` to it and re-arming the debounce, so
the user's next autosave wrote an un-merged document over another writer's saved work with the fence's
blessing and the chip on *Saved*. The fence and the document it stands for move **together or not at all**;
the merged write is the one site in the system where they can come apart, the exposure is the whole of
`doMerge` rather than the write, and the merge refuses rather than rebasing. No engine, no persisted shape,
no export surface and no autosave behaviour moves. R8-3, R8-4 and R10-1 are **not** adjudicated by this
revision.

**Revision 9, 2026-08-27.** Phase 1 shipped (`REVIEW.md`, verdict SHIP, `b32ef9a`) and Jacob gave the
product thesis in full. This revision is **additive**: a new **§8** carries the travel-history model — the
trip lifecycle, past trips, participants, geography attribution and the lifetime map — and states what the
location, photo and social phases must be able to land on. **No Phase 1 section changes behaviour.** Three
smaller things ride with it: **A-8** (§2.7, QA **R10-1**) blesses A-5b clause 2 and closes the last carried
MINOR; every rule in §2.7 gains a **class**, ruled in §8.2 (a feasibility rule does not
run on a day that has passed — the reference trip is itself in the past as of today, and the app has been
telling Jacob his finished trip is missing a hotel); and §4.2's `TripSummaryRow` comment is corrected to the
shipped shape. **R8-3 and R8-4 are still not adjudicated** — `ROADMAP.md` names the phase and the trigger
for each.

**Revision 10, 2026-08-27.** Jacob followed the thesis with one clarification: Cairn should eventually track
**meaningful physical travel distance by mode** — air, train, road, walking, cycling, boat — and must keep
three things visibly apart: physical distance, *planned* distance, and airline loyalty rewards. That is a
model decision, so it is taken here rather than in the phase that first wants a number. New **§8.10**: four
provenance bases (`verified` / `observed` / `derived` / `planned`) that may never be summed across, a
`Journey` record class that is the movement counterpart of §8.5's `Visit`, a bundled airport index on the
same mechanism as §8.4's country index, the definition of a *verified* flight endpoint measured against the
model as it actually is, and a per-mode phase schedule. §8.8's blanket mileage deferral is **superseded, not
reversed** — a distance derived from a plan still never counts. **Nothing in §8.10 is Phase 2 scope and
nothing in it is implemented by this revision**; the mechanical consequences are three one-line deliverable
additions in `ROADMAP.md` (phases 4, 5b and 7) and no new phase. Airline loyalty miles are **out of scope and
unscheduled** — §8.10.7 says why, and why that is not the same kind of "no" as §8.8's refusal of live presence.

**Phase 1 is §2 and §4. The next phase is §8.1–§8.4.** Everything else is the shape those must not
foreclose. See `ROADMAP.md` for sequencing and `PRODUCT-VISION.md` for why this order and not another.

## Read only your sections

This document is ~65k tokens (re-measured at revision 10 with `cairn/tools/doc-section ARCHITECTURE`; the
per-section figures below were stale by a third before that). Nothing needs all of it, and a fresh agent that reads it whole starts a sixth
of the way into its context before writing a line. Pull what you need:

```bash
cairn/tools/doc-section ARCHITECTURE 2 4     # prints §2 and §4 only
cairn/tools/doc-section ARCHITECTURE         # lists the sections and their sizes
```

| § | Contents | ≈ cost | Who needs it |
|---|---|---|---|
| 0 | Six positions, stated up front | <1k | everyone — read it, it is 20 lines |
| 1 | Stack decision and the capability checks behind it | 3k | architect. Settled; do not re-litigate |
| 2 | **Domain model — the builder's contract.** §2.12 `travelRole`, §2.13 geography and §2.14 import/copy are new in revision 2 and are where the Phase 1 rework lives; **§2.2a (the `StorageVersion` write fence, revision 3) and §2.2b (the freshness rule it turned out to be one instance of, revision 4) are read together with §4.2 and §4.3, never alone**; §2.10 (the export surface) and §2.13's copied-record row are settled in revision 5; **§2.7's retirement ledger (A-5) and §2.13's copy-borne `Place` rule (A-6) are revision 6**; **§2.2a's A-7 (the fence a declined write may not move) is revision 8** and is read with §4.2 rule 4a | 35k | builder, breaker |
| 3 | Module boundaries | <1k | builder |
| 4 | **The Phase 1 client.** §4.2 rule 6 (a pending write is never outlived by its document) is new in revision 3 — QA R3-2; rule 6a′ and the `savedDoc` predicate are revision 4 — QA R4-1; **rule 6a″ (the flush bound and its exits) and rule 6c's "delete goes on the chain" are revision 5** — QA R6-1/R6-2/R7-3; **rule 5's retirement carve-out is revision 6** — QA R8-1, read with §2.7; **rule 4a is revision 8** — QA R11-1, read with §2.2a A-7 | 7k | builder |
| 5 | The four hard subsystems | 2k | breaker; builder from Phase 3 on |
| 6 | Privacy, authorization, deletion cascade | 3k | breaker, manager; builder for §6.2 |
| 7 | Explicitly deferred | <1k | anyone about to build something not in the roadmap |
| 8 | **The travel-history model** (revision 9) — trip lifecycle and past trips (§8.1), the feasibility/integrity rule class (§8.2), participants (§8.3), geography attribution, travel stats and the summary-row rule (§8.4); then the shapes the location, photo and social phases must land on (§8.5–§8.7) and what is refused (§8.8). **§8.10 is revision 10** — physical travel distance by mode and the four provenance bases that keep it honest; **it is not Phase 2 scope**, so a Phase 2 builder reads §8.1–§8.4 and stops | 11k | architect; the builder and breaker of the phase after Phase 1 (§8.1–§8.4 only). §8.10 is for the architect and for phases 4, 5 and 7. Read with `PRODUCT-VISION.md` |

*(§8's figure is measured with `doc-section`, not estimated. §8.1–§8.4 — the Phase 2 model — are roughly
half of it; a Phase 2 builder who reads only those pays about 5k.)*

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
7. **A trip does not end when the itinerary ends, and nothing about the history is stored as a count.**
   Added at revision 9 from Jacob's product thesis. The lifecycle is derived from dates; a past trip is a
   trip whose end date has passed; participation, access, friendship and location-sharing are four
   different edges; and every statistic — countries, cities, days, goals — is derived from the trips it
   claims to summarise, so it cannot drift from them and cannot be inflated by typing. §8.

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
| **Merge** (`mergeWithStored`) | `load()` returns `{doc, version}`. The merge is only valid against that exact `remote`, so the merged write carries **that same `version`** as its expectation. A third writer landing in between moves the version, the port refuses, the conflict stands unmerged and the edit stays in memory. On success **and only while the store still holds the document the merge started from**, the merged write mints a new version, which becomes `savedVersion`, and `savedDoc` becomes the merged document. If the store has moved on — the user typed anywhere inside `doMerge`, which is a window spanning the load, the parse, the merge and the queue, not just the write — the merged document is not installed **and the fence does not move with it**: **A-7** below, QA R11-1. The deleted-trip branch expects `null` — "nothing is stored under this id" — so a newcomer appearing in the gap is refused rather than clobbered. (This reinforces rather than replaces the R3-3 fix: the merged write must go through the store's own save chain, because an expectation computed before an in-flight autosave settles is stale by construction.) |
| **Delete then recreate under one id** (R3-4, ABA) | `delete()` removes the record; the counter does not rewind. The recreated record gets a strictly fresh version, so a writer holding the dead record's version matches nothing and is refused. `importDoc`'s "keep the original id when it is free" path — the export → delete → restore sequence — is therefore safe by construction, and so is the within-lineage recycle R3-1 exploited. One mechanism, both findings. |
| **The whole database is destroyed under a live tab** (R4-2, ABA one level up) | Site data cleared, or §1.1's 7-day eviction of a non-installed tab. Tab A has been open the whole time and holds `V`. Tab B restores the backup into the freshly-created database and gets `V2`. `V2` is 128 fresh random bits, so `V2 ≠ V` — not because anything checked, but because there is no shared derivation for the two to collide through. A's next keystroke offers `V`, matches nothing, is refused, and A reads *"Not saved — edited elsewhere"* rather than "Saved". The old scheme produced `V2 === V` here, verified in Chromium. Note what the fix is *not*: it is not "re-read the epoch more often". Any cadence leaves a window, because the wipe is not an event the port is told about. |
| **Phase 2, server-authoritative** | The token becomes server-issued: an `ETag` on the trip resource, `If-Match` on the write, or a `version` column with `UPDATE … WHERE version = $expected`. Because the client only ever compares for equality and only ever obtains a token from a port result, **nothing above the port changes** — same `persistence.savedVersion`, same refusal → `'conflict'`, same `mergeWithStored`. A synced device's local record carries **two** envelope fields, and they are never conflated: `version` fences local writers (two tabs on one device) and `serverVersion` records the last version the server acknowledged, fencing the sync push. Two fences over two resources. Phase 2 adds a field; it does not redesign this. |
| **Phase 4, `apps/mobile` over SQLite** | Identical contract, no SQLite-specific concept. `UPDATE trips SET doc=?,summary=?,version=? WHERE id=? AND version=?` (or an insert guarded on absence when the expectation is `null`) inside one `BEGIN IMMEDIATE` transaction, with `changes() === 0` meaning refused; re-read and return `storedVersion`. The counter is a one-row `meta` table bumped in the same transaction. `expo-sqlite` exposes `withExclusiveTransactionAsync()` for exactly this, and `BEGIN IMMEDIATE` is the documented way to avoid a mid-transaction `SQLITE_BUSY` — *verified against Expo's SQLite docs and expo/expo#13552, but the isolation actually delivered across two JS contexts must be re-verified on a device before Phase 4 ships.* The token being an opaque **string** rather than a number is what makes all three backings free. |

#### A-7 — a write the store declines to install may not move the fence (revision 8, QA R11-1)

The **Merge** row above says what happens when the merged write succeeds. It never contemplated the branch
where the write succeeds *and the store does not keep the document it wrote*, which is the branch a single
keystroke reaches. This addendum rules on that branch. It changes no engine, no persisted shape, no export
surface, and no behaviour at either autosave site.

**The defect, verified against the code and not against the finding.** In
`packages/client/src/store/store.ts`:

- `doMerge:590` captures `const doc = state.doc` — call it **A** — **before** its first `await`,
  `ports.storage.load(doc.id)` at `:592`.
- `:620` computes `merged = mergeTrips(ancestor, A, remote)`; `:634-640` calls
  `writeAndSettle(A, merged.trip, …, stored.version, {reseed:true})` inside a `chainOntoSaving` link
  (`:627`), so the write also queues behind anything already on the chain.
- `writeAndSettle:419` computes `stillOurs = state.doc === startedFrom`. `:422` installs `toWrite` **only**
  if `stillOurs`. `:429-431` set `savedDoc = toWrite` and `savedVersion = outcome.version`
  **unconditionally**, and `:437` re-arms the ordinary debounce precisely when `!stillOurs`.
- So if the store advanced to any document **B** at any point between `:590` and the write settling, the
  merged document is discarded from memory while sitting in storage, and the store keeps a fence minted by
  a document it does not hold. The re-armed autosave then writes **B** — which never incorporated the merge —
  under that fence. The port has nothing to object to: this tab really does own that version. The other
  writer's saved edit is destroyed in storage, `status` is `'idle'`, and the chip reads *Saved*.

**The window is the whole of `doMerge`, and a future reader must not re-derive it narrower.** It is not "the
tens of milliseconds the merge write is in flight". `startedFrom` is captured at `:590`, so the exposure
covers the IndexedDB `load()`, `fromJSON`, `mergeTrips`, `toJSON`, **and any write already queued ahead of
this one on `chainOntoSaving`** — the manager measured 233 801 bytes and a 5.7 ms CPU floor on the reference
trip *before* either storage round trip, and reproduced the loss with `load()` gated, the write untouched,
the shipped 400 ms debounce and no explicit flush at all. With an autosave already queued when the button is
pressed, the window is unbounded. This is why the fix cannot be a check taken once at the top of `doMerge`.

**What is actually wrong is not that the merge was dropped.** Dropping it is `stillOurs` doing its job:
`state.doc` is the user's own document and A-7 does not overwrite it. The defect is that three facts are
recorded as one, and one of them is a lie:

| Recorded | True after a non-installed merge write? |
|---|---|
| storage issued `outcome.version` for the bytes of `toWrite` | **yes** — a fact about storage, stated by storage |
| `savedDoc` is *"the last document this store and storage agreed about"* (§2.2b F2's definition) | **no** — this store never held `merged.trip` |
| therefore this store may write `state.doc` forward over what storage holds | **no** — `B` does not incorporate `merged.trip` |

That third line is the loss, and it is §0.6 one level out from where §2.2a found it: *the write's success is a
fact about `toWrite`, and it says nothing whatever about `state.doc`.* Advancing the pair converts a fact
about one document into a licence to overwrite storage with another. **F1** names this write-path code —
deciding to *keep* a fence is deciding to *permit* a later write, taken earlier and with less information, so
it is subject to the same prohibition as deciding to skip one. **F2** is what breaks first: `savedDoc` is
read by `dirty()` **and** by `doMerge:612` as the merge's common ancestor, and after this branch it is
neither.

**The invariant.** Stated as §4.2 **rule 4a**, and it is the whole ruling:

> **`persistence.savedDoc` and `persistence.savedVersion` advance together, and only to a document this
> store still holds or may legitimately write forward over.** Concretely, at the moment the write settles,
> either the store still holds the document the write began from (`state.doc === startedFrom`), or the
> write carried exactly that document (`toWrite === startedFrom`) — in which case whatever `state.doc` has
> since become came from this store's own `dispatch`/`undo`/`redo` chain and legitimately supersedes it.
> **A successful write whose document the store declines to install advances neither field, installs
> nothing, re-arms nothing, and leaves `status: 'conflict'`.**

The second disjunct is what makes this a two-line discrimination rather than a redesign: `toWrite ===
startedFrom` holds at **both** autosave sites (`:373` and the deleted-trip merge branch at `:602`) and is
false at exactly one site in the system, `:634`. That asymmetry — the one place `startedFrom !== toWrite` —
*is* R11-1, and the invariant reads it directly instead of asking the call site to declare its intent.

**Why "refuse", of the three options on the table.**

| Option | Ruling |
|---|---|
| **Re-queue / rebase** — `mergeTrips(savedDoc, state.doc, merged.trip)` and write that | **Refused.** It is a second three-way merge the user never pressed a button for, and its ancestor is a fiction — `savedDoc` is the ancestor of *A* and of *remote*, not of a document that already incorporates both. It is also self-similar: the rebase write is raced by the same keystroke that caused it, so the honest form is a loop with a bound, i.e. a second `flushForTransition` on the merge path. ROADMAP F's sentence for this path is *"the automatic save path must refuse rather than guess"*, and per-stop last-writer-wins is the thing the user asks for by pressing a button (§4.2's own words: *"a button, not a behaviour"*). Guessing twice for one press is not that. |
| **Install the merge and surface B's edits as a new notice** | **Refused, as the manager expected.** It discards the user's in-flight content, which §4.2 rule 6b already refuses in the transition case for stated reasons: the user's content is authoritative and conflicts are surfaced, not resolved by guessing. A notice does not make it not a discard. |
| **Refuse: leave `'conflict'` standing, the user's edit intact, and the button where it already is** | **Chosen.** It matches rule 6b's shape verbatim (*the transition does not happen*), it matches R7-1's in-flight guard (a second press joins the first rather than starting a second merge), it costs one click, it invents no semantic model, and it is the only option whose failure mode is "the user presses a button again" rather than "the app wrote something nobody asked for". |

**Not advancing `savedDoc` is required by the *merge*, not only by the fence — and this is what kills every
half-measure.** Suppose the store kept `savedVersion` (a true fact about storage) and advanced `savedDoc` to
`merged.trip`. The next press of *Merge and save* would compute `mergeTrips(merged.trip, B, remote′)` — a
three-way merge asserting that **B** descends from a document containing the other tab's edits. It does not.
The diff would read those edits as **deletions B performed**, and the merge would remove them on purpose.
That is the same loss reached through the merge instead of through the autosave. So the pair moves together
or not at all, which is why the invariant is written about the pair.

**What the fence does in the meantime, explicitly.** The store keeps its **stale** `savedVersion` and knows
it is stale. That is the honest state and it needs no new machinery:

- `status` becomes `'conflict'` with the existing `CONFLICT_MESSAGE`. No new string, no new banner: the
  situation genuinely *is* "storage holds a document your copy has not incorporated; merge it or export
  this copy", which is what that message says and what the banner already offers.
- The next autosave is **refused by the port**, against a version storage has moved past. That is the fence
  doing exactly its job, and it is why this design fails safe even if the pre-write check below is defeated.
- The debounce is **not** re-armed (`:437`), which is §4.2 rule 6a″'s standing three-way rule: a `'conflict'`
  exit must not spin against a fence that will refuse it every 400 ms.
- `library` **is** still upserted from the write's own `summary`. The write landed; the row is a true fact
  about what storage now holds.
- `persistence.lastMerge` is **not** set on this branch. The merge notice is a disclosure about the document
  on screen; describing content the user cannot see would be the *inverse* of the rule it exists to serve.
- Nothing is lost anywhere: storage holds a document that incorporates both sides, the user's later edit is
  in `doc`, and the screen does not read *Saved*. Pressing *Merge and save* again converges in one step,
  because `savedDoc` is still the true common ancestor **A**.

**Two mechanisms, and neither substitutes for the other. A builder that ships one has not implemented A-7.**

1. **A precondition inside the chained link** (`doMerge:627`, *before* `writeAndSettle`): if `state.doc !==
   doc`, abandon the merge without writing and leave `'conflict'` standing. This closes the wide part of the
   window — the load, the parse, the merge, the serialization, and the queue wait — at the cost of nothing.
   It must be *inside* the link, after the queue has drained: checking before `chainOntoSaving` is a
   check-then-act with an interleaving point in the middle, §0.6's error and R7-3's exact mistake.
2. **The invariant in `writeAndSettle`**, applied when the write has already committed. This one is
   load-bearing and cannot be replaced by any amount of checking above the port, because the last stretch of
   the window is inside `saveIfVersion`'s own `await` — which is §2.2a's founding lesson (R2-1), reached
   from the other side.

**Where the fix goes, and the smallest change that enforces the invariant.** Two edits, both in
`packages/client/src/store/store.ts`, no new function, no new state field, no new message constant, no
change to `packages/core`, `apps/web` or any port:

1. **`writeAndSettle`, immediately after `:419`** (`const stillOurs = …`), before the existing `set` at
   `:420`. Everything below it stays exactly as it is:

   ```ts
   const stillOurs = state.doc === startedFrom;                    // :419, unchanged
   // A-7 / §4.2 rule 4a. The write landed, and this store does not hold the document it wrote —
   // true only of the merged write, where `toWrite !== startedFrom`. The fence may not move to a
   // document `state.doc` neither is nor descends from, or the next autosave writes an un-merged
   // document over another writer's work with the fence's blessing (QA R11-1).
   if (!stillOurs && toWrite !== startedFrom) {
     set({
       ...state,
       library: upsertSummary(state.library, summary),            // storage really does hold this
       persistence: { ...state.persistence, status: 'conflict', lastError: CONFLICT_MESSAGE },
     });
     return;                                                       // no install, no fence, no re-arm
   }
   ```

2. **`doMerge`'s merged-write link, at the top of the `chainOntoSaving` callback at `:627`**, before the
   `try` that wraps `writeAndSettle`: if `state.doc !== doc`, `set` `status:'conflict'` with
   `CONFLICT_MESSAGE` and `return` without writing. Inside the link, never before it.

Both branches leave `merging` to `mergeWithStored`'s `finally` (R7-1), so the button is pressable again and
a second press starts a fresh merge from the document the user now holds — which is the "re-queue" option
arriving where it belongs, behind a user action.

**The regression set — the smallest set that proves the invariant rather than one timing window.** Six
tests. `packages/client/test/merge-race.test.ts` already owns the harness (`gatedStorage`,
`conflictedStoreWithParkedAutosave`, `manualScheduler`); it needs one addition, a gate on `load` as well as
on `saveIfVersion`, because the two gates open different halves of the window. **Every test asserts on the
bytes the port holds** — `core.fromJSON(await storage.load(id))` — and no test proves a write with
`isDirty()` alone (ROADMAP F's standing rule since R4-1):

| # | Sequence | Must hold |
|---|---|---|
| 1 | **Ordinary case.** Two tabs, a real conflict, *Merge and save*, **no** interleaving dispatch | stored bytes contain **both** tabs' edits; `state.doc` **is** the merged document; `savedDoc === state.doc`; `savedVersion` advanced; `status:'idle'`; `isDirty()` false; `lastMerge` recorded. This is the test that fails if the fix over-refuses |
| 2 | **Edit lands during the write.** Gate `saveIfVersion`, dispatch one edit, release — `qa/r11-recheck.mjs` §1.3b's shape, **zero undo calls** | the other tab's edit survives in storage; `status:'conflict'`; the local edit is still in `doc`; and then, **with the real 400 ms debounce and no explicit flush**, the bytes still contain it — the loss lands through the ordinary autosave, so the test must let that autosave run |
| 3 | **Edit lands before the storage read completes.** Gate `load()`, dispatch during the read, release | no merged write is issued at all (count `saveIfVersion` calls); stored bytes are exactly the other tab's document; `status:'conflict'`; local edit intact |
| 4 | **A write already queued ahead of the merge.** Dispatch, let the autosave park in the port, press *Merge and save*, dispatch again while the queue drains | same as 3 or 2 depending on where it lands, and in both: no document reaches storage that does not incorporate what storage held |
| 5 | **The invariant directly, not a timing window.** After any non-installed merge write | `savedVersion` is **not** the version that write minted and `savedDoc` is **not** the merged document; the store's next autosave is **refused** by the port; and pressing `mergeWithStored()` a second time converges — stored bytes then contain the other tab's edit **and** both local edits |
| 6 | **Ceiling: the autosave sites are unchanged.** Gate `saveIfVersion`, dispatch during an *ordinary* autosave, release | `savedDoc`/`savedVersion` **do** advance, the debounce **is** re-armed, and the newer document reaches storage with `status:'idle'`. A fix that turns this into a conflict has broken rule 4 to satisfy 4a |

**Scope, stated so it is not read wider than it is.**

- **Both autosave call sites are byte-identical after this ruling** (`:373`, `:602`): `toWrite ===
  startedFrom`, so the fence advances exactly as today and `!stillOurs → scheduleSave()` still writes the
  newer document forward, which is correct — it descends from the one just written.
- **`{reseed:true}` stays where it is.** On the non-install branch the document does not change, so `set`
  returns at its step-1 identity check and the R10-3 history clear does not run — correct, and deliberately
  so: the surviving `history` is linear with the document the store still holds. Nothing here licenses
  clearing history on a branch where `state.doc` did not move.
- **R8-4 is untouched by this ruling.** Its harm is a *record resurrected by a write*, not a fence advanced
  by one, and closing it means deciding whether `doMerge`'s off-chain `load()` at `:592` may be trusted at
  all after a delete — a question about read ordering, not about `savedDoc`/`savedVersion`. The deleted-trip
  branch (`:598-611`) is therefore **not** modified by A-7, and R8-4 rides unchanged on its own reachability
  argument. A builder must not add the mechanism-1 precondition to that branch under cover of this ruling.

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

**Every rule also carries a `class` — `feasibility` or `integrity` — and a feasibility rule does not run
for a subject whose day is strictly before `ctx.today`** (revision 9). The classification, the reasoning
and the two ceilings are **§8.2**; it is stated there and not here because it is a consequence of the trip
lifecycle, and because the numbers in this section's fixture table are asserted at a fixed clock and must
not move.

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

#### A-5 — retirement is monotone metadata, and undo does not un-retire it (revision 6, QA R8-1)

**The defect, in one sentence.** `syncResolutions` writes `retiredAt` into the document *outside* the
reducer — correctly, because retirement is bookkeeping and §2.7 forbids it from consuming an undo slot — but
§4.2 rule 5's undo is a snapshot restore over that same document, and `history.past` already holds the
pre-retirement `Trip`. Ctrl+Z therefore restores `retiredAt: null` and a dismissed **blocker** renders again
as *"Marked dismissed on <date>"* after a keystroke that acknowledged nothing. QA measured it in Chromium in
four user actions (`qa/r8-undo.mjs`). §2.7's *"never un-retires"* and §2.7's *"not undoable document state"*
were both true of the code and were not reconciled with each other.

**The position.** *Undo restores the plan. It does not restore the user's ignorance of what has already been
retired.* Retirement is not a step in the document's history; it is a **monotone fact about a `conflictId`**,
discovered once and true from then on. It is stored in the document because it has to survive a reload, and
that storage location is what made it look like history. It is not history.

Two mechanisms were rejected before this one and the reasons are the ruling's own evidence:

- **Re-running `syncResolutions` after undo cannot work.** After the restore the conflict is live again, so
  the rule sees nothing to retire. QA's finding says this, and it is right: the mechanism cannot distinguish
  *"never retired"* from *"un-retired by a snapshot"* without remembering something.
- **Moving `retiredAt` out of `Trip` entirely is the expensive answer to the cheap question.** It is a second
  persisted structure with its own storage record, its own place in the §6.3 deletion cascade, its own
  export/round-trip parity and its own migration. The thing that must be remembered is one date per
  `conflictId`; a document already carries it.

**The mechanism — a retirement ledger, in client state, outside `history`.**

```ts
// packages/core/src/conflict/resolve.ts — pure, next to syncResolutions
reassertRetirements(trip: Trip, retired: ReadonlyMap<ConflictId, IsoDate>): Trip
```

Sets `retiredAt = retired.get(r.conflictId)` on every resolution row whose `retiredAt === null` and whose
`conflictId` the ledger holds. Returns the **same reference** when nothing changed; bumps `revision` when
something did, exactly as `syncResolutions` does. It changes no other field of any record, ever — that
sentence is the whole of §4.2 rule 5's carve-out and the builder writes a test that asserts it.

`AppState` gains one field, and it is neither persisted, exported, nor in `history`:

```ts
retired: { tripId: TripId; marks: ReadonlyMap<ConflictId, IsoDate> } | null;
```

There is **exactly one place it is read or written**: `set()`. This is deliberate and it is the R3-3 pattern
— one assignment site, so no path can opt out — rather than a closed list of callers to keep in step.

**`set(next, opts?: { reseed?: boolean })`, in five mechanical steps:**

1. If `next.doc === state.doc` (reference identity) → assign and emit, unchanged. Every UI-only `set` takes
   this branch; the cost is one comparison.
2. If `opts.reseed` is true → `retired` becomes **exactly** `next.doc`'s own retired rows (`null` when
   `next.doc === null`), and **no re-assertion runs**. The document that just arrived is the authority.
3. Otherwise, if `state.retired === null` or `state.retired.tripId !== next.doc.id` → same as step 2. (A
   ledger is per trip; conflict ids are content-addressed over subject ids, which do not cross trips, and a
   ledger that outlived its trip would only grow.)
4. Otherwise **absorb**: for every row of `next.doc.resolutions` with `retiredAt !== null`, record
   `marks[conflictId] = retiredAt` **if the key is absent** — first write wins, so the recorded date is the
   earliest retirement this session observed and does not drift.
5. Then **re-assert**: `next.doc = reassertRetirements(next.doc, marks)`. Assign and emit **once**, with the
   corrected document — never a `set` for the restored snapshot followed by a second `set` for the fix, or
   subscribers render the stale *"Marked dismissed"* for a frame, which is the defect.

**`reseed: true` is passed by exactly the paths that install a document from outside this store's own
edits** — §4.2 rule 6a's closed list (`closeTrip`, `openTrip`, `createTrip`, `adoptTrip`, `importDoc`,
`deleteTrip`) plus `doMerge`'s result. Seven paths; an eighth path that installs a document without passing
it is a defect, checked the way rule 6a's list is checked. Merge reseeds rather than absorbs because the
merged document is one storage and this tab have just *jointly agreed on*, at the user's explicit request,
and the ledger's job is to defend against this store's own undo stack — not to outvote a merge.

**Release, so a fresh answer is not stillborn.** `unresolveConflict` followed by a new `resolveConflict` for
the same `conflictId` would otherwise have its brand-new live row stamped retired by the ledger on the very
next `set`. So: **`dispatch` deletes the ledger entry for that conflict id before calling `set`, for exactly
two action types** — `resolveConflict` (key: `action.resolution.conflictId`) and `unresolveConflict` (key:
`action.conflictId`). Nothing else releases. This does not weaken *"never un-retires"*: both are deliberate
user acts *on that exact conflict*, which is the opposite of the bookkeeping-with-no-user-action that §2.7
exists to stop. Undoing past a release restores a live row, and that is the user's own answer being undone.

**Two obligations on the builder that are easy to miss and expensive to get wrong:**

- **After `set()`, the store reads `state.doc` — never the local it passed in.** `retireResolutions` today
  ends `return derivedFor(derived, next, …)`; `next` is the pre-re-assertion document and keying the derived
  cache on it is §2.2b F2 in miniature. It becomes `state.doc`.
- **Re-assertion is idempotent and converges in one pass** (it only ever moves `null` → a date the ledger
  already holds), so `set` → re-assert cannot recurse and `getDerived`'s existing one-pass convergence
  argument still holds.

**What is not persisted, and what happens on a hard kill.** The ledger is memory only and is reconstructed
on load from the stored document's own `retiredAt` fields — there is no new storage record and no change to
`toJSON`/`fromJSON`, the §6.3 cascade or `importDoc`. If the process dies before the retirement's autosave
lands, the retirement is lost together with the edit that triggered it, which is the same guarantee every
other edit in §4.2 has and no weaker.

#### A-5a — the ledger never *acquires* an id the document already holds a live answer for (revision 6 addendum, BUILD-NOTES KD-36)

**The objection is upheld.** KD-36 is right: A-5's release deletes the key and step 4's absorb puts it back
from the *surviving* retired row in the same document, so a second dismissal of a conflict that has come back
is stamped retired the instant it is made. The builder reproduced it, declined to work around it, and that
was the correct call. A-5 as written is defective in one clause; the fix is to that clause and nothing else.
The five steps, the release, `reassertRetirements`, the per-trip scoping and the reseeding list all stand.

**The ruling, as one rule a builder can apply without interpretation:**

> **The retirement ledger may record a `conflictId` from a document only if that same document contains no
> resolution row for that `conflictId` with `retiredAt === null`. This test governs every point at which the
> ledger reads marks out of a document — step 2/3's reseed *and* step 4's absorb, with no exception for
> either. Nothing else about the ledger changes: marks are still first-write-wins, are still removed only by
> `dispatch`'s release, and are still never removed by absorb.**

Say it as an invariant, because that is what makes it checkable: **the ledger acquires an id only from a
document that has no live answer for it, and loses an id only through release.** Acquisition is vetoed;
retention is not.

That is KD-36's option 1 — *corrected*, because option 1 as literally stated is not sufficient. Option 1 puts
the test only in step 4. But steps 2 and 3 build the ledger from the arriving document too, and the document
persisted after a second dismissal is exactly `[retired row, live row]`. Reload it, and the reseed at
`openTrip` records the id from the retired row; the next ordinary edit then re-asserts it onto the live row.
The second dismissal survives the click and dies at the next reload — the same defect through a third door,
with no `dispatch` and no release anywhere in the trace. One predicate, both sites, or the fix is half a fix.

**Why the veto is safe: what a coexisting live row actually means.** Within one document, a live row and a
retired row for the same `conflictId` arise from exactly one sequence — the user answered the conflict again
after a previous answer of theirs had been retired. `resolveConflict` is the only writer that appends a row,
and it drops any existing *live* row for the id while keeping the retired ones (that pairing is the whole
point of the retained row); `syncResolutions` and `reassertRetirements` only stamp rows in place and never
append; `unresolveConflict` drops every row for the id; and `mergeTrips` merges resolutions by `conflictId`,
so a merged document holds at most one row per id and cannot manufacture the pair. There is no other
legitimate state that looks like this. The veto is a set-membership test over the rows actually present, not
an assertion that the pair is unique — a hand-edited or corrupt stored document with two live rows declines
the id and is otherwise unremarkable.

**Why this does not weaken A-5's two requirements.**

- *Never un-retires with no user action.* The R8-1 trace is untouched. The document that follows a
  retirement carries the retired row and **no** live row for that id, so the ledger acquires the id exactly as
  before; the snapshot undo then restores a document whose only row for that id is live, and re-assertion
  stamps it. Acquisition already happened, and the veto never takes a mark away. The corner that looks
  dangerous — undo restoring `[retired, live]` after that live row had itself been retired — is safe for the
  same reason: at the moment that second row was retired the document had no live row for the id, so the mark
  was acquired then and is still held now.
- *Retirement is not an undo-stack entry.* Nothing here touches the reducer, `history`, or where `retiredAt`
  is written. The change lives entirely in how the client-side ledger is populated.

**The release stays.** It is not made redundant by the veto and must not be removed: marks are sticky, so
without `dispatch`'s release the pre-existing mark for that id would still be re-asserted onto the row the
user just created. Release removes the stale mark; the veto stops absorb from immediately restoring it. Both,
or neither works.

**Why not option 2 (a release that survives one `set`).** It is wrong, not merely fragile. Suppression that
expires after one cycle defers the defect by one keystroke: the document still holds the retired row, so the
*next* `set` from any cause absorbs the id again and re-asserts it onto the still-live second answer. Making
the suppression permanent-for-the-session would be a third structure to carry and would still not cover the
reload path, which has no release in it at all. Its expiry trigger is also unspecifiable in a way that
survives review — "the next `set`" and "the `set` this `dispatch` produces" happen to coincide today only
because `dispatch` runs `releaseRetirement`, `reduce` and `set` in one synchronous statement sequence with no
intervening store call, and a rule whose correctness rests on that is a rule the next `getDerived()` call site
can silently break. The corrected option 1 carries no timing state: it is a function of the document in hand,
so it holds under any call order, any number of intervening `set`s, and a reload.

**Accepted and named: the date, not the fact, can be early.** First-write-wins means a mark holds the
*earliest* retirement observed for that id, so a live row re-asserted after a later retirement is stamped with
the earlier date. A-5 chose first-write-wins deliberately so the recorded date does not drift; the visible
consequence is confined to `retiredAt`, which no view renders — `detectConflicts` renders `resolution.at`
("you dismissed this on …") and reads `retiredAt` only as a boolean. Not worth a second field.

**What the builder must assert** (three tests, all at the store level, no product redesign):

1. Dismiss → edit away (retire) → edit back → dismiss again: the conflict renders **resolved**, the document
   holds `[retiredAt: <date>, retiredAt: null]`, and it stays that way across a further unrelated edit.
2. The same document round-tripped through storage and reopened (`reseed`), then one unrelated edit: still
   resolved. This is the case option 1 as stated would have missed.
3. R8-1 itself, unchanged: dismiss → retire → Ctrl+Z restores the pre-retirement snapshot → the row is
   re-stamped retired and the blocker does **not** read "Marked dismissed".

#### A-5b — `redo` releases as well, and the release keys off the document delta (revision 7 addendum, QA R9-1)

**The defect.** A-5's release list is a closed list of two `dispatch` action types. `redo()` is not a
`dispatch` — §4.2 rule 5's history is `{ past: Trip[]; future: Trip[] }`, plain snapshots with no action
recorded — so it calls `set()` with no release. QA's seven-action trace ends with a **stillborn** dismissal:
the redone live row is stamped `retiredAt` inside the same `set()`, the blocker renders unresolved, and no
later edit or reload brings it back.

**Why A-5a's veto does not stop it, precisely.** The veto governs *acquisition*, not *retention* — A-5a's own
sentence, *"acquisition is vetoed; retention is not"*. At the sixth step the document `undo` installs holds
only the **retired** row for that id and no live row, so the veto passes and the ledger legitimately
(re-)acquires the mark. At the seventh step `redo` installs `[retired, live]`: absorb correctly declines to
re-acquire, and declining changes nothing, because the mark is **already held**. Step 5 re-asserts it onto the
redone live row. The veto was never the mechanism that protected the second dismissal — the *release* was, and
`redo` does not perform one.

**Approach B — "make the veto uniform so no new release call is needed" — is not merely inelegant, it is
impossible.** Two reachable states are indistinguishable to any predicate over `(the arriving document's
resolutions, the ledger's marks)` and require opposite outcomes:

| | document installed | ledger | required outcome |
|---|---|---|---|
| A-5a's blessed corner: dismiss → retire → undo → dismiss again → retire again → **undo** | `[retired₁, live₂]` | holds the id | **stamp** `live₂` — undo must not un-retire (A-5a says this corner is safe for exactly this reason) |
| R9-1: dismiss → retire → undo → dismiss again → undo → **redo** | `[retired₁, live₂]` | holds the id | **do not stamp** `live₂` — it is the user's own answer being reinstated |

Same rows, same marks, opposite answers. The only thing that differs is the direction history moved, and that
is known at the call site and nowhere else. **So the fix is at the call site: `redo` releases.** No change to
`marksOf`, to absorb, to the veto, to `reassertRetirements`, or to `dispatch`.

**The rule, exactly, with no judgment left to the builder.** Because history stores documents and not actions,
the release keys off the **document delta**, and the delta that identifies a redone `resolveConflict` is
exact: `resolveConflict` is the only writer in the system that *appends* a resolution row (A-5a's writer
analysis; `unresolveConflict` and the reducer's other 15 actions never do), so a redo step that raises the row
count for a `conflictId` is a redone `resolveConflict` for that id and nothing else.

> **`redo()` releases a `conflictId` from the ledger, before calling `set()`, exactly when all four hold:**
> 1. the redo actually moves — `next.doc !== state.doc`, both non-null — and the ledger exists and is for
>    this trip (`state.retired !== null && state.retired.tripId === next.doc.id`);
> 2. `next.doc.resolutions` contains a row for that id with `retiredAt === null` (a **live** row);
> 3. `state.retired.marks` currently holds that id;
> 4. **the row count for that id increased**: `rowsFor(next.doc, id) > rowsFor(state.doc, id)`, counting live
>    and retired rows alike.
>
> Release each such id with the existing `releaseRetirement()`, then call `set(next)` exactly as today. Order
> matters and is the same as `dispatch`'s: release first, `set` second, one emit.

Clause 4 is the one that is easy to drop and must not be. Without it the rule also fires when the *same* row
appears live in the redone snapshot and retired in the current one — a document the store passed through
without a `getDerived()` between two dispatches — and releasing there would un-retire a mark with no user act
behind it, which is R8-1 rebuilt inside `redo`. With clause 4, the release fires if and only if the redone
action was a `resolveConflict` on that id, which is precisely the act A-5 already blesses.

**The closed list is now three sites, not two:** `dispatch`'s `resolveConflict`, `dispatch`'s
`unresolveConflict`, and `redo`'s delta rule above. Nothing else releases. A redone `unresolveConflict` needs
no entry: it drops every row for the id, so clause 2 fails, and with no live row there is nothing a mark can
be stamped onto.

**`undo()` does not get this, and a builder must not add it.** Three reasons, in order of how decisive they
are:

1. **It is the mechanism.** A-5 exists because undo is a snapshot restore that resurrects `retiredAt: null`.
   Releasing on undo would delete the ledger's entire purpose, and R8-1 would come back on the first Ctrl+Z.
2. **Undo moves away from the user's answer, never toward it.** Undoing a `resolveConflict` *removes* the row
   — the row count falls, clause 4 fails, and there is nothing to protect. Undoing an unrelated action leaves
   the count equal (R8-1's own case), clause 4 fails, and the restored live row is stamped, which is exactly
   what §2.7 requires.
3. **The one shape where the same rule *would* fire on undo is a shape where firing is wrong**: undoing an
   `unresolveConflict` restores rows the unresolve dropped, raising the count with a live row present. A
   release there would leave a live blocker reading *"Marked dismissed"* after a keystroke that acknowledged
   nothing — R8-1's symptom sentence, verbatim. Undo's correct behaviour in every case is *stamp and stay
   silent*.

**One invariant makes all of this checkable, and it is cheap.** After every store operation:

> **For every id in `state.retired.marks`, `state.doc` contains no resolution row for that id with
> `retiredAt === null`.**

It holds today at every branch of `set` (re-assert stamps any live row for a held mark; `marksOf` and absorb
both refuse to acquire an id with a live row; release only removes marks), and it holds after `redo`'s
release. A test asserting it after each step of the three sequences below is worth more than the sequences
themselves — it is the property both R9-1 and KD-36 violate.

**What the builder asserts** (store level, in-memory ports, plus the Chromium shape of `qa/r9-redo.mjs`):

1. QA's seven actions: dismiss → retire → undo → dismiss again → undo → **redo** → the redone row's
   `retiredAt` is `null`, the conflict renders **resolved**, and both stay so across the next three `set()`s
   and across a storage round trip and reopen (the reseed, where A-5a's veto carries it).
2. Redo of an unrelated action never releases: with a mark held and a redo step that does not raise any row
   count, the restored live row is still stamped — R8-1 at redo depth, unchanged.
3. `undo()` contains no release: the R8-1 sequence, at six undo/redo depths, still ends with the row stamped
   and no rendered row reading *"Marked dismissed"* against a live blocker.

#### A-8 — A-5b clause 2 is blessed, and the reason is that history stores re-asserted documents (revision 9, QA R10-1)

**The finding.** With **two** Ctrl+Z's instead of one — dismiss → retire → undo → undo → redo — the document
`redo` installs already carries the dismissal row stamped `retiredAt`, because `set` step 5 re-asserted it
*before* the second `undo` pushed it into `future`. A-5b clause 2 requires a **live** row, so it declines,
no release happens, and the redone dismissal is dead in the document.

**Ruling: clause 2 stands as written. Nothing changes.** Three reasons, in order:

1. **It is not user-visible.** The render after the redo is identical to the one the user was looking at one
   keystroke earlier — A-5's blessed re-assertion — and pressing *"Not a problem"* again works and sticks.
   §0.5's standard is *"a blocker is a thing Jacob must act on"*; nothing here is.
2. **Weakening clause 2 rebuilds R8-1.** Releasing on a *retired* row is precisely the state A-5b's own
   impossibility table proves is indistinguishable from the corner where undo must **not** un-retire. Any
   rule that fires here fires there.
3. **The honest fix is one level down and is not worth its blast radius today.** The real cause is that
   `history` stores the document *after* re-assertion, so the pre-assertion truth the redo needs is already
   gone. Storing the document **as dispatched** — re-asserting only on install, which `set` does anyway —
   would make clause 2 pass without touching it. That is a change to the substrate of A-5, A-5a, A-5b and
   §4.2 rule 5, and it would have to be re-measured against all three; buying that with a defect nobody can
   see would be the worst trade in this document.

**The trigger, written down rather than left implicit:** if any surface ever renders `retiredAt` directly,
or makes the retired-versus-live distinction visible to the user, this stops being invisible and reason 1
expires — at which point the fix is reason 3's, not a new clause.

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

**Settled in revision 5 (QA R2-12, KD-19); 69 → 70 in revision 6, for one symbol and one stated reason.**
`reassertRetirements` joins under **P1** — `packages/client`'s `set()` calls it — and it is the same class as
`syncResolutions`, which is already here: a pure build function the client must call because the client is
where the trigger lives. §2.10's own enforcement rule is *"widening the surface is a documentation change
first"*, and this line is that change. The list below is the whole contract: **70 runtime symbols**,
one list, asserted as set equality in both directions against the runtime exports of
`packages/core/src/index.ts`. It replaces a two-list arrangement — 50 "in §2.10" plus 60 "beyond §2.10, each
with a justification" — that made the criterion true by construction against 110 exports. A boundary the
Phase 2 server and the Phase 4 native app are written against cannot be "110 against 50, enumerated".

#### How the list was derived — the principle, so the next change does not need a ruling

A symbol is on the surface if **either**:

**(P1) a consumer outside `packages/core` calls it today** — `packages/client`, `apps/web`, `cli.ts`,
`fixtures/`, `tools/`. Measured, not assumed: 50 symbols in revision 5, **51 in revision 6**
(`reassertRetirements`, called by the store's `set()` — §2.7 A-5), counting the reducer's string-keyed
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
packages/core/src/index.ts re-exports exactly this and nothing else — 70 runtime symbols:

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
  conflict (6)   detectConflicts · RULES · resolveConflict · unresolveConflict · syncResolutions
                 reassertRetirements(trip, retired)                  // §2.7 A-5 — the retirement ledger
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
| **Any *copy-borne* `Place`** — at least one stop in this trip resolves its coordinate through it, and **every** such stop has `attribution(stop) !== null` (revision 6) | **the same as the Place row above, and the same treatment as the copied-stop row**: measured, `km` and `nearest` still computed, `confidence: 'unanchored'`, never published |
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

#### A-6 — the copied `Place`, and why revision 5's paragraph here is withdrawn (revision 6, QA R8-2)

**Revision 5 said Places needed no row of their own. That paragraph is wrong and is withdrawn.** Its
argument was a disjunction: a place `copyStopInto` rule 4 drags in is filed either under a city the
destination trip *does* have — meaningful anchors, the check should run — or under a `cityKey` that trip has
never heard of, *"in which case the existing Place row already yields no anchor, `nearest === null`, and
`'unanchored'`"*. **The second disjunct is false, and it is falsified by this section's own new field.**
`homeBase` is appended to every anchor list unconditionally, so any trip with a `homeBase` — the reference
trip has one, LAX — offers the unrecognised place exactly one anchor, thousands of kilometres away.
`nearest !== null`, `km > 35`, `confidence: 'certain'`, and QA measured the result: **one Browse-and-copy
click puts a third `geo_outlier` blocker on the reference trip**, naming a record the user never typed a
coordinate into and never accepted (`qa/r8-geo.mjs` §1).

**(a) A-1's principle extends to the place. Yes, and for A-1's own three reasons, unchanged.** A place that
is in this trip *only* because a stop copy brought it is not a claim the user has made about this trip's
geography; measuring it against the destination's anchors checks the wrong claim; and the coordinate was
already measured, against meaningful anchors, in the trip it came from — copying creates no new opportunity
to catch a typo, only a new opportunity to false-positive on one already cleared. Above all, §0.5 governs
here exactly as it governed the stop: *the copy path may not mint blockers by being used*, and ROADMAP C's
promise that a third blocker appears only when somebody writes down why Jacob must act on it cannot survive
a primitive that mints one per click.

**(b) The implementation rule, exactly — and `Place`'s shape does not change.** The two candidate mechanisms
were provenance on `Place` and derivation at evaluation time. **Derivation wins, decisively**, and adding
`Place.provenance` is refused:

- Rule 4 **reuses** an equivalent existing place in the target when `samePlace` matches, so a "copied" place
  can be byte-identical to, and literally the same row as, one the user entered. A `provenance` field would
  have to answer what the reuse branch stamps, and any answer is a judgment call handed to a builder.
- It is new persisted state, in `toJSON`/`fromJSON` round-trip parity, `migrateDoc`, the §6.3 cascade and
  `validateTrip`'s provenance rules (`origin_stripped`, `accepted_by_non_member`) — bought to express a fact
  the document already contains.
- §2.2's *"a Place is a description of the world, not a claim about the user"* is still right. That is why
  it has no provenance, and this ruling does not disturb it.

So, the rule a builder implements with no interpretation, in `geoCheck.ts`'s `---- places ----` loop:

```ts
// Built once, before the loop, over trip.days.flatMap(d => d.stops) then trip.pool, in
// document order: placeId -> the stops whose PlaceLink names it.
//
// A Place is COPY-BORNE iff it has at least one such stop AND every one of them is isCopied().
const linking = linkedBy.get(p.id) ?? [];
const copyBorne = linking.length > 0 && linking.every(isCopied);
const f = finding({ kind: 'place', id: p.id }, p.at, anchors, copyBorne ? 'unanchored' : 'certain');
```

Four clauses, each load-bearing, each stated so nobody has to infer it:

1. **`linking.length > 0`.** A place with *no* stop pointing at it is a place the user keeps for its own
   sake, or an orphan. It is measured at `'certain'` exactly as today; this rule does not touch it.
2. **`every`, not `some`.** If even one stop the user wrote themselves resolves through this place, the
   user's own plan rests on that coordinate, and a blocker on it is indistinguishable from — and is — the
   Fisherman's Bastion case. The exemption is *"the only reason this record is here is a copy"*, and `every`
   is the only reading of that sentence.
3. **`isCopied`, i.e. `attribution(stop) !== null` — and NOT `provenance.state`.** This is what makes the
   ruling monotone across acceptance, which is the half R8-2's sibling finding proves is not optional. See
   the next paragraph.
4. **`anchors` is computed unchanged**, including the existing self-exclusion of stops that resolve through
   this place, so `km` and `nearest` are still real. §2.13's *"measure it and decline to publish"* applies
   verbatim: an implementation that `continue`s past the record has implemented "skip", loses the distance,
   and is wrong.

**What happens when the copied stop is accepted: nothing, deliberately, and that is the whole point.**
Because the clause keys on `attribution()` and not on `provenance.state`, accepting the copied stop does not
make its place `'certain'`. Had it keyed on state, `acceptCandidate` would flip the place from exempt to
measured and **mint a blocker at the moment of acceptance** — precisely the transition A-1 exists to forbid
(*"acceptance can only ever add anchors, so it can only ever remove a blocker, never create one"*), and
precisely the failure mode §0.5 rates as worse than a named blind spot. Acceptance stays monotone in the
only direction it moves: the accepted stop joins `anchorable` (`anchorsOthers` already keys on state), so the
place's coordinate starts serving as a `same_day`/`adjacent_day`/`city_stop` anchor for *other* records —
**anchors are added, and a blocker can therefore only disappear.** No code change is needed on the anchor
side at all: `Place` is not an anchor kind, a place's coordinate enters the anchor set only through a stop
that resolves via it, and that stop's eligibility is already governed by `anchorsOthers`.

**What ends the exemption is a user act, and it is the right one:** the moment the user creates a stop of
their own linking to that place, `every(isCopied)` is false, the place is measured at `'certain'`, and a
genuine outlier is reported — because that is the moment the coordinate becomes a claim about the user's own
plan. Until then it is a record they have been told came from somewhere else.

**The cost, stated rather than discovered later:** a coordinate typo that was already in the *source* trip's
place travels with the copy and is not re-reported here. That is A-1's third rejection reason applied
unchanged — the record was already measured where the anchors meant something — and it joins the numbered
limitations list below rather than being left implicit.

**Limitation 3 in the list below**: a
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

Four honest limitations, written down rather than discovered later (1 and 2 are measurement misses; 3 and 4
are the stated cost of the two copy-path rows):

1. **The two misses are `Blue Cave, Biševo` and `Stiniva Cove, Vis`.** Both are Split-filed island places
   ~55–64 km out; displaced 1° north they land within 35 km of the Aug 14 Krka day-trip stops, which are
   legitimate anchors for a Split place. Naming them is cheaper than adding machinery for two records.
2. **A whole day of wrong coordinates is invisible**, because the day's stops anchor each other. The bug
   class this exists for — one digit, one record, `HISTORY.md` and `CLAUDE.md` both — is a single outlier.
   A bulk error is a different problem and it is not this rule's job to pretend otherwise.
3. A coordinate edited into a copied stop after the copy — the copied-record row above.
4. A coordinate typo already present in a *copy-borne* `Place` in its source trip — A-6 above. Same reason
   as 3, on the record class rule 4 drags across.

**None of the numbers above move under revision 5 or revision 6.** The reference trip contains no record with
`attribution(r) !== null`, so no place in it can satisfy A-6's `every(isCopied)` either: the clean run is
still 0/112 and 0/94, the +1° detection rate is still 112/112 and 92/94, and the Fisherman's Bastion blocker
is untouched. Both rows change what happens to records the *copy path* creates and nothing else — which is
why they are rows and not a rewrite. **The builder re-derives all four numbers rather than quoting them**;
ROADMAP C states them as the ceiling.

#### A-6a — the copy that brought a `Place` takes it away again (revision 7 addendum, QA R9-2)

**The defect.** `copyStopInto` rule 4 adds a `Place` row to the destination trip; `removeStop` removes the
stop and **not** the place (confirmed in `build/stops.ts` — `removeStop` never touches `trip.places`, and
`Stop.place` is the only referent a `Place` has anywhere in the model). One `×` after a copy, the place has
zero linking stops, A-6 clause 1 measures it at `'certain'`, and the reference trip carries a third
`geo_outlier` **blocker** naming `place-copy-1` — a record the user never authored and has just thrown away.

**Clause 1 is not the thing to change, and this is a measurement, not a preference.** On the reference trip,
**60 of the 94 coordinate-bearing places have no linking stop at all** — the importer creates places for named
things whether or not a stop resolves through them. Under the per-record +1° injection, 92 of 94 places are
caught and **60 of those 92 are orphans**. `place-68`, *Fisherman's Bastion* — the single historical bug this
entire section exists to catch — **is an orphan**. So every variant of *"an orphan is exempt"* or *"an orphan
degrades to a warning"* costs this rule roughly two thirds of its detection surface and the one blocker
ROADMAP C names by id. Refused on the number.

For the same reason, QA's option (a) is refused twice over: it is also not computable. A place with zero
linking stops carries no evidence of how it arrived — that is what "orphan" means — and A-6's refusal of
`Place.provenance` stands unchanged (the `samePlace` reuse branch has no honest value to stamp, and it is new
persisted state in `toJSON`/`fromJSON`, `migrateDoc`, the §6.3 cascade and `validateTrip`). Nothing about
`Place`'s shape moves in this ruling either. *(The other alternative — having rule 4 inline the coordinate
instead of copying a `Place` — would make the orphan impossible but would withdraw A-6 entirely and drop the
place's name, city and address on every copy; refused as a larger change than the defect.)*

**The ruling: the orphan is not created in the first place.** The `Place` entered the document as a side
effect of a copy, to support the copied stop; when that support is removed and nothing else refers to it, it
goes with it. This is the *action's* responsibility, exactly as QA's option (b) frames it, scoped so narrowly
that it cannot reach a record the user is keeping for its own sake:

> **`removeStop(trip, stopId)` deletes exactly one `Place`, and only when all four of these hold:**
> 1. the removed stop's link is `{ kind: 'place', placeId: P }`;
> 2. the removed stop is a copy — `attribution(stop.provenance) !== null`, the same predicate A-6 clause 3
>    uses and `geoCheck`'s `isCopied` is defined as;
> 3. **after** the removal, no stop anywhere in the trip (`days[].stops` ∪ `pool`) has
>    `place.kind === 'place' && place.placeId === P`;
> 4. `trip.places` contains a row with id `P`.
>
> The returned trip is then the same trip with that one row filtered out of `places`, and `revision` bumped
> **once** for the whole operation. If any clause fails, `removeStop` behaves exactly as it does today.

Four things that are load-bearing and must be stated so nobody infers them:

1. **It prunes the removed stop's own place and nothing else. It is never a sweep.** A garbage collector over
   `trip.places` would delete all 60 of the reference trip's orphans, `place-68` among them, and silently
   remove the Fisherman's Bastion detection. At most one row leaves per call.
2. **Clause 2 means removing a stop the *user* wrote never prunes anything.** Every existing path keeps its
   current behaviour; the fixture contains no record with `attribution() !== null`, so §2.13's four numbers
   are provably unmoved (0/112 and 0/94 clean, 112/112 and 92/94 under +1°, and the Fisherman's Bastion
   blocker still fires).
3. **There is no window in which the orphan is measured.** With two copied stops on one place, removing the
   first leaves `linking.length === 1` and A-6's exemption intact; removing the second prunes. `geoCheck` is
   never handed a zero-link copy-borne place, which is the state it has no evidence about.
4. **The prune lives inside `core.removeStop`, not in the reducer or a second action.** §4.2 rule 1 —
   one action, one core function, no domain logic in the reducer — so `packages/client` changes not at all,
   and undo keeps working for free: history is a `Trip` snapshot, so Ctrl+Z restores stop and place together.

**The cost, named rather than discovered later.** Because rule 4 *reuses* an equivalent existing place when
`samePlace` matches, the pruned row can be one the user originally typed — in the one sequence where they had
already deleted their own last stop linking it, leaving a copy as its only referent. That row is deleted. It
is acceptable in Phase 1 and the reasons are checkable rather than aesthetic: at that moment the place is
unreachable from every view (nothing in `apps/web` renders a place except through a stop), A-6 already
classifies it as a record whose only reason to be here is a copy, undo restores it, and it is a description of
the world, cheap to re-enter. **The trigger to revisit is explicit:** the moment `Place` gains a life of its
own — a saved-places library, place-level notes or photos, or any second referent kind — clause 2's prune must
become a reference-counted delete with a user-visible affordance, and this paragraph is the thing to reread.

**What the builder asserts:**

1. Browse → copy a place-linked stop → `×`. `detectConflicts` returns **2** blockers on the reference trip,
   not 3, and `trip.places.length` is back to what it was before the copy.
2. The user's own stop, own place, `×` → the place is **still there** and is still measured (inject +1° into
   it and get exactly one `geo_outlier` naming it). This is the guard against the sweep.
3. Two copied stops on one place: after the first `×` the place survives and is `'unanchored'`; after the
   second it is gone.
4. Ctrl+Z after the `×` restores both the stop and the place, and `geoCheck` reports the place
   `'unanchored'` again.
5. `rejectCandidate` on a copied stop prunes nothing — the stop stays in the document, so clause 3 fails.

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
  library: TripSummaryRow[];   // the shipped shape is {id,title,startDate,endDate,cityCount,dayCount,
                               // stopCount,poolCount,revision} — cheap, always loaded. (Revisions 1–8 said
                               // `updatedAt`, which has never existed; corrected in revision 9, and §8.4
                               // widens the row and states the freshness rule that keeps it honest.)
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

   **4a. A write the store declines to install may not move the fence** (revision 8, QA R11-1; the ruling,
   its alternatives and its reasoning are **§2.2a A-7**, and this rule is not implementable without it).

   > `persistence.savedDoc` and `persistence.savedVersion` advance **together**, and only to a document this
   > store still holds or may legitimately write forward over: at the moment the write settles, either
   > `state.doc === startedFrom` or `toWrite === startedFrom`. A successful write whose document the store
   > declines to install advances neither field, installs nothing, re-arms no debounce, and leaves
   > `status: 'conflict'` with the user's edit in `doc` and the indicator not reading "Saved".

   Rule 4 already says `savedVersion`/`savedDoc` come from a port result and nowhere else. That was
   necessary and not sufficient: the port result is a fact about **the bytes that were written**, and
   `writeAndSettle` was recording it as a fact about **the document the store holds**. When a merge writes a
   document the user has since typed past, those are different documents, the store keeps a fence it has no
   right to, and the next ordinary autosave writes an un-merged document over another writer's work with the
   fence's blessing and the chip on *Saved* — §0.6 reached one level out from where §2.2a found it. The two
   autosave call sites satisfy the second disjunct by construction and do not change; the merged write is
   the only site in the system where `toWrite !== startedFrom`.

5. **Undo/redo is snapshot-based** over the immutable `Trip`, limit 50. Structural sharing makes this cheap.
   The restored snapshot is byte-identical to the document it captured, `revision` included; it carries no
   authority over `savedVersion` (rule 4, §2.2a).

   **One carve-out, and it is exactly one field (revision 6, QA R8-1).** `resolutions[].retiredAt` is
   monotone metadata, not history: §2.7's A-5 ledger re-asserts it onto every restored snapshot, inside the
   same `set()`, before any subscriber sees the state. So the guarantee reads, precisely: *the restored
   snapshot is byte-identical to the document it captured except that a `resolutions[]` row whose `retiredAt`
   was `null` may be restored carrying the date the ledger already holds for its `conflictId`, and `revision`
   is bumped when that happens.* Nothing else moves — not a day, not a stop, not a place, not a booking, not
   a resolution's `state`, `by`, `at` or `note`, and not a row the ledger has no key for. `reassertRetirements`
   is a pure function whose only writable field is `retiredAt`, so this is enforced by the function's shape
   and not by discipline, and the test asserts field-by-field equality over everything else.

   The reducer's `undo`/`redo` stay pure snapshot restores and gain nothing: the ledger is applied by the
   store, above them. **Retirement still never consumes an undo slot and is still never a user edit** — it
   does not push onto `history.past`, and pressing undo *N* times reverts *N* of the user's own edits.
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
- **Public share pages with SEO/OG rendering** — the accounts phase. They are the one surface where a
  permission bug is publicly visible, so they get their own attack pass.

*(§8 adds to this list and, in two places, takes something off it. Read §8.8 with this section.)*

---

## 8. The travel-history model — what the next phase adds, and what nothing may foreclose

**Input: Jacob's product thesis of 2026-08-27**, given directly and in full. The product argument — why this
sequencing and not another — is `PRODUCT-VISION.md`. This section is only the part that is a *model*
decision, because that is the part that is expensive to get wrong later.

The thesis in one line: **Cairn is the persistent record of a person's travel life, and a trip does not end
when the itinerary ends.** Three of its ten principles are data-model decisions rather than policy
statements, and they are what this section exists to settle:

- **Principle 2 — planned and observed travel must stay distinguishable.** §8.5. Observation is a separate
  record class; it never mutates a `Stop`.
- **Principle 3 — trip participants, social relationships and location-sharing permissions are separate
  concepts.** §8.3 and §8.7. Five edges, never collapsed, and the first of them ships before any account
  exists so the separation is load-bearing before it is convenient to break.
- **Principle 5 — the lifetime history compounds in value.** §8.4. Every statistic is *derived*; nothing in
  this product stores a count of anything.

**Phase 1 is §2 and §4. The next phase is §8.1–§8.4** — all of it local-first, no server, no device.
§8.5–§8.7 are architected here and implemented in the phases `ROADMAP.md` names. §8.8 is what is refused.
**§8.10 is revision 10** — physical travel distance by mode, and the provenance that makes a distance figure
mean anything. It is **not** Phase 2 scope and nothing in it is built in Phase 2; it supersedes the mileage
bullet in §8.8, which deferred the whole subject before Jacob gave it a shape.

### 8.1 The trip lifecycle is derived. A past trip is a trip whose end date has passed.

```ts
lifecycle(trip: Trip, today: IsoDate): 'planned' | 'active' | 'completed'
```

Pure, in `derive/`, keyed on `today` exactly as the conflict engine's `ctx` already is. **No stored status
field, and a builder must not add one.** A stored `status` is a copy of a fact the dates already state, it
goes stale at midnight with nothing to invalidate it, and §0.6 is the whole of the argument — the same
reasoning that keeps `Leg`, `CostRollUp` and `Conflict` derived.

**Days stay dense.** A three-week trip to Japan in 2019 entered from memory gets 21 empty `Day` rows, and
that is fine: empty days are already a supported, titled, navigable shape (§2.3), `ensureDays` already
mints them, and a `Day` is small. The alternative — permitting `days: []` for "memory" trips — would put a
hole in the one invariant every derive function relies on, to save a few kilobytes.

**One new stored field, and it earns its place:**

```ts
Trip.datePrecision: 'exact' | 'month' | 'year';   // default 'exact'
```

`startDate` and `endDate` remain **real calendar dates** (`invalid_calendar_date` is unchanged), so every
existing rule, derive and golden is untouched; `datePrecision` records only that the user did not know the
exact days — *"Japan, March 2019"* is stored as `2019-03-01 … 2019-03-31, precision:'month'`. It is stored
because it is not derivable and because retrofitting fuzziness onto dates after a user has entered forty
trips is the expensive migration this project keeps choosing to avoid. It is read by **display and nothing
else**: no conflict rule, no derive, no validation may branch on it. It joins `setTripMeta`'s patch
allowlist; it adds no build function.

**There is no `Trip.kind`, and manually-entered travel needs no new provenance value.** The certainty of a
record is already `provenance.confidence`, and it already means exactly the right things:

| The thesis's phrase | Existing shape | Nothing new needed |
|---|---|---|
| manually entered from memory | `{source:'user', confidence:'asserted'}` | *"a human said so with nothing behind it"* — §2.8's own words |
| imported from a booking | `{source:'email', confidence:'confirmed'}` | we hold the document |
| observed by the device | `{source:'device', confidence:'inferred'}` | **one** new `source` value, and not until §8.5 |
| taken from someone else | `{source:'friend', …}` + `attribution()` | §2.14, shipped |

That is the thesis's *"treat manually entered, imported, and observed travel as potentially different
provenance rather than pretending all data has identical certainty"*, and four fifths of it was already
built. A phase that adds a `Trip.kind: 'past' | 'planned'` has added a second, weaker copy of both the
dates and the provenance.

### 8.2 Conflict rules gain a class: feasibility, or integrity

**The defect this closes, which is live today.** `detectConflicts` was designed against a trip in the
future. Today is 2026-08-27 and the reference trip ended on the 22nd, so the app now tells Jacob — forever
— that his Budapest lodging is missing for a trip he has already taken. Worse for the phase: a 21-day
memory trip in one city with no stops trips `missing_lodging` on every night of it, so **the first thing a
new user sees after entering their first past trip is a wall of warnings about a holiday they finished in
2019.** §0.5 governs: *a blocker is a thing Jacob must act on.* Nobody can act on the past.

**The rule.** Every entry in `RULES` declares its class:

```ts
class: 'feasibility' | 'integrity'
```

> A **feasibility** rule asserts something about whether the plan can happen. It does not run for a subject
> whose day is strictly before `ctx.today`. An **integrity** rule asserts that the data disagrees with
> itself or with the world; it always runs.

| Rule | Class | Why |
|---|---|---|
| `impossible_transfer` | feasibility | you cannot miss a connection you already made |
| `overlap` | feasibility | two things you already did do not clash |
| `missing_lodging` | feasibility | you slept somewhere; the record is merely incomplete |
| `unbooked_ticketed` | feasibility | *"book this within N days"* is meaningless afterwards |
| `booking_vs_plan` | feasibility | it asserts the plan cannot happen as written, which is the blocker definition |
| `legacy_flag` | integrity | the user marked this day themselves; retiring their own flag is not ours to do |
| `geo_outlier` | integrity | a coordinate typo is wrong forever, and the lifetime map now renders it |
| `unverified_reference` | integrity | a reference nobody could verify stays unverified |
| `duplicate_booking`, `superseded_booking` | integrity | two records disagreeing about one thing is a fact about the records |

**Per *subject day*, not per trip.** A trip in progress has past days and future days in the same document,
and a trip-level test would silence tomorrow's missed connection on the strength of yesterday's. The
subject's day is exact; the trip's lifecycle is not.

**Three edges the sentence above does not settle, ruled here rather than left to the builder** (revision 10,
written for the increment that implements this — the shipped `Conflict` carries `subjects: Ref[]`, plural,
and three of the ten rules emit more than one):

1. **A conflict is suppressed iff *every* subject resolves to a date strictly before `ctx.today`.** One
   subject on or after today keeps the whole finding. The asymmetry is deliberate and it is the safe
   direction: a `booking_vs_plan` between a past booking and a future day is still something Jacob can act
   on, and §0.5 is the test — suppression must never remove a finding somebody could still do something
   about.
2. **A subject that resolves to no date resolves to `trip.endDate`.** `{kind:'trip'}`, `{kind:'place'}` and
   a pool stop have no day of their own. Falling back to the trip's end date means a wholly-past trip goes
   quiet — which is the point of the whole ruling — while a trip that has not ended keeps every one of its
   trip-level findings. `{kind:'day'}` is its own date, `{kind:'stop'}` is its day's date, `{kind:'booking'}`
   is `startsAt.date`.
3. **With no `ctx.today`, nothing is gated.** `DetectOpts.today` is already optional and rules that need a
   horizon already skip themselves without it; the gate inherits that rule rather than inventing a default
   clock, which core is forbidden from having anyway (§2.1). **The goldens run at `FIXTURE_TODAY =
   2026-08-01`, which is before the reference trip starts**, so every subject in them is in the future and
   the gate is a no-op on the golden clock *by construction* — which is why "every Phase 1 number is
   re-derived unchanged" is an achievable ceiling and not a hope. A run that moves one has classified a rule
   wrongly, exactly as the criterion says.

**Two ceilings, and the second is the one that will be got wrong.** (1) The goldens run at a fixed clock
(§2.1 — no ambient time), so **every number in ROADMAP §C must be re-derived and unchanged**; a run that
moves them has classified a rule wrongly. (2) `booking_vs_plan` going quiet on a completed trip is a
deliberate loss, and it is named here rather than discovered: for a trip that has happened, *"the booking
says the 15th and the plan says the 14th"* stops being a feasibility question and becomes a **history
accuracy** question — which is a real question, and it is answered in the phase that has observed data to
answer it with (§8.5), not by leaving a rule firing where nobody can act on it.

### 8.3 Participants — principle 3's first entity, shipped before there is anything to grant

```ts
type Participant = {
  id: ParticipantId;
  displayName: string;
  kind: 'self' | 'contact';
  userId: UserId | null;     // null until that person has an account AND the user links them
  note?: string;
};

Trip.participants: Participant[];   // ordered; at most one 'self'; 'self' is trip.ownerId
```

**Participation grants nothing. Not a read, not a comment, not a coordinate.** A participant is a statement
about *who was on the trip*; access is `TripMember` and `TripShare`; visibility of a location trace is
`LocationShare`; a social relationship is `Connection`. Five edges (§8.7), and Jacob's girlfriend's family
are participants with no row in any of the other four. This is principle 3 as a schema rather than a
sentence, and it ships now precisely because there is nothing to grant yet — the separation is free today
and is a migration the day it is not.

**Embedded in the document, not a second persisted structure.** The alternative — a store-level people
record — buys cross-trip identity and costs a second storage record, its own place in the §6.3 cascade, its
own export/round-trip parity, its own migration and its own index that can drift from the documents. That
is A-5's rejected option, verbatim, and it is rejected here for the same reasons. Embedding gives
round-trip parity, deletion and undo for free.

**Cross-trip identity is therefore derived, and the view says so.** *"People you have travelled with"*
groups by `userId` where it is non-null and by a normalised `displayName` otherwise, and the surface states
that it is grouping by name. Two spellings of one person are two people until one of them is linked to an
account. Named limitation, not a silent one.

**Not in this phase, and named so it is not assumed:** participants on a *stop* (who came to dinner),
inviting a participant, and a participant contributing anything. The first is a second nesting level nobody
has asked for; the other two require accounts and are §8.7.

`validateTrip` gains two codes: `duplicate_participant_id` (error) and `participant_name_empty` (error — a
participant with no name renders as a ghost row and can never be re-identified). One `'self'` at most is
the third check and rides on the first two's mechanism.

### 8.4 Geography attribution, travel statistics, and the lifetime map

This is the signature surface of the thesis and it is, in model terms, three decisions.

**1. A coordinate is attributed to a country on-device, from a bundled dataset, never by a network
geocoder.**

```ts
countryOf(at: LatLng, index: CountryIndex): CountryCode | null    // pure; index injected
```

Not a preference. Sending a coordinate to a geocoding service **is transmitting a location**, which §6.1
forbids in every phase, and it would put a per-request dependency in the middle of the one screen the
thesis calls the signature experience. Separately and independently: the public OSM/Nominatim service's
usage policy forbids exactly this use — systematic reverse queries, and any application whose function is
related to geocoding must run its own service *(verified 2026-08-27,
[operations.osmfoundation.org/policies/nominatim](https://operations.osmfoundation.org/policies/nominatim/))*.
There is no cheap hosted answer that is also a private one.

The index is generated by `tools/gen-countries.mjs` from **Natural Earth admin-0**, which is public domain
*(verified 2026-08-27, [naturalearthdata.com](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/))*,
into one committed module; the lookup is ray-casting point-in-polygon over the ISO-coded rings. Two
constraints on the generator, both measured rather than assumed:

- **A size budget, pinned by a test.** The generator reports the emitted bytes and a test fails above the
  budget. Start at the 1:110m simplification; **the builder measures, and the number goes in the test, not
  in this paragraph.**
- **A correctness floor that decides the scale.** 1:110m is coarse at coastlines and islands. The generator
  is validated against every coordinate-bearing record in the reference trip — 112 stops and 94 places,
  including the Dalmatian islands (`Blue Cave, Biševo`; `Stiniva Cove, Vis`) and Lokrum. **If 1:110m
  misattributes or drops one of them, the generator uses 1:50m and the budget moves.** Detection quality
  decides the dataset; the budget does not.

**`null` is a first-class answer.** A coordinate the index does not resolve — mid-ocean, a disputed area, a
bad digit — is reported as *unattributed* and rendered as unattributed. It is never snapped to the nearest
country. This is §2.7's rule about `unknown` in a different costume: a system that guesses a country is a
system whose lifetime map is quietly wrong, and a wrong map is worse than an honest hole.

**2. Every statistic is derived. Nothing counts anything into storage.**

```ts
travelStats(summaries: TripSummaryRow[], today: IsoDate): TravelStats
type TravelStats = {
  countries: Array<{ code: CountryCode; firstVisit: IsoDate; lastVisit: IsoDate; tripIds: TripId[] }>;
  cities:    Array<{ key: CityKey; name: string; countryCode: CountryCode | null; tripIds: TripId[] }>;
  trips: { planned: number; active: number; completed: number };
  daysTravelled: number;
  unattributed: { places: number; stops: number };     // the honest hole, on screen
};
```

A stored `countriesVisited: 47` is a second source of truth that can disagree with the trips it summarises,
and — the reason that matters for this product specifically — **it is a number a user can inflate by
typing**. Principle 1 says real-world travel is the source of truth; a derived statistic cannot drift from
the travel it is derived from. This same rule pre-decides goals and achievements (§8.8): a goal is a
declarative target evaluated against `travelStats`, never a counter that is incremented.

**3. The library summary widens, and one rule keeps it honest.** The lifetime map must not load forty trip
documents — §4.2's *"exactly ONE trip in memory at a time"* is unchanged and is not negotiable here.

The shipped `TripSummaryRow` is `{id, title, startDate, endDate, cityCount, dayCount, stopCount, poolCount,
revision}` *(§4.2's inline comment says `{…, updatedAt}` and has been wrong since revision 1; corrected in
this pass, the shipped shape is the contract — the §2.5 precedent)*. It gains
`countryCodes: CountryCode[]`, `cityKeys: CityKey[]` and `summaryVersion: number`.

A summary is a **copy**, so §0.6 applies to it and four clauses discharge it:

1. **A summary is computed only from the document being written, inside the write that carries it.** That
   is already the shipped shape — `saveIfVersion(id, expectedVersion, doc, summary)` — and no port method
   changes. Nothing computes a summary from another summary, from `AppState`, or from a document it is not
   about.
2. **Nothing edits a summary independently of its document.** A rename writes the document.
3. **`SUMMARY_VERSION` is a core constant, bumped whenever any summary field's derivation changes.** The
   client rescans every row below it — load the document, recompute, rewrite through the ordinary chained
   write — before the lifetime map claims to be complete, and the map says *"recomputing"* while it does.
   Without this, the day `countryOf` improves is the day the map silently keeps the old answer.
4. **Every drill-down reads the document.** The summary answers *"which countries"*; the moment the user
   taps one, the trip is opened and the answer comes from `Trip`.

**Two consequences of clause 1, ruled at revision 10 because the increment that builds it cannot avoid
them:**

- **The country index is a required argument to `tripSummary`, not an optional one.** `tripSummary(trip,
  index)` — because an optional index has a default behaviour, and the only available default is *"emit a
  row with no countries"*, which is a row that claims to be complete and is not. Making it required means
  there is no way to mint a summary that silently forgot the countries. The index itself is generated code
  inside `packages/core` and is exported as a value from `index.ts` so every call site can pass it; the
  *function* still takes it as a parameter and stays pure and testable against the four-polygon fixture. The
  `StoragePort` contract does not change — the caller computes the summary, as it already does.
- **The lifetime map should be drawn from the country index we already bundle, with no tiles behind it.**
  `PRODUCT-VISION.md` §7 risk 5 names the exposure — a *lifetime* map loads on every profile view, so tile
  cost scales with sessions — and a phase that is local-first with no network has no business acquiring a
  tile dependency to draw filled countries. The rings are already in the bundle; a filled-country world map
  needs nothing else. The *trip* map keeps its existing tiles and is untouched.

**And the question §6.1 will be asked about this: no, a country code is not location data of the kind that
table governs.** It is derived from coordinates the user typed into their own itinerary and which already
live in the document; the table's subject is *observed* location — a fix stream, a library index, a dwell
inference — none of which exists in this phase. When observation does arrive (§8.5), a country derived from
a `Visit` inherits that `Visit`'s rules, not these. The cross-cutting rule still binds: **no coordinate in
any log line**, and a country code in a summary row is not a licence to log the point it came from.

**The map surface inherits both of `CLAUDE.md`'s map bugs and adds one.** §4.4 is unchanged — bounds come
from core, a hidden container never fits — and the world map's version of the min-span guard is that a
history containing one country must not zoom to a max-zoom rooftop view. Same mechanism (`fitSpanKm`,
`MIN_SPAN_KM`), new caller, no second implementation.

### 8.5 Observed travel — the shape Phase 5 must be able to land on

Not built now. Three decisions taken now, because each is a one-way door:

**1. Observation is a separate record class. It never mutates a `Stop`.**

```ts
type Visit = { id: VisitId; at: LatLng | null; placeId: PlaceId | null; stopId: StopId | null;
               arrived: IsoDateTimeLocal; departed: IsoDateTimeLocal | null;
               confidence: 'certain' | 'likely' | 'uncertain'; provenance: Provenance };
```

A `visited: boolean` on `Stop`, or a device writing an observed time over a planned one, destroys principle
2 permanently and irreversibly: once the plan has been overwritten there is no second copy to compare
against, so *"did I actually do what I planned"* — the question the completed-trip view exists to answer —
becomes unanswerable for every trip already travelled. This is the same rule as *"email-derived data is a
candidate, never a silent write"*, applied to the highest-volume source there will ever be.

**2. Acceptance is the transmission boundary, and this is what keeps §6.1 true when location arrives.** An
unaccepted observation is device-local: no server row, no upload, no analytics. Accepting one makes it
*trip content* — the user's own itinerary record, which syncs like the rest of the document. The user's
explicit act is the only thing that moves a location off the device, and it moves one coarse record rather
than a fix stream. §6.1's table gains its row in that phase, and the raw-fix row does not change.

**3. `Provenance.source` widens by exactly one value — `'device'` — and not before.** `fromJSON` rejects it
until then (that rejection is already asserted), and the widening carries a `schemaVersion` bump and a
`migrateDoc` case, so an older client cannot silently drop records it does not understand.

Country attribution then runs over visits with the same `countryOf`, and the profile can distinguish
*planned* countries from *observed* ones — which is principle 2 paying for itself on the surface the thesis
cares most about.

### 8.6 Photos — the shape, and the one thing it triggers

Not built now. §5.4 and §6.1 already hold the flow and the privacy rules; the thesis adds only the
association model, and it is deliberately narrow:

> A photo reference attaches to **exactly one trip** and **at most one** of a stop, a place or a day, plus
> optionally a subset of that trip's participants. It is `{source:'system', state:'candidate'}` until the
> user accepts it. Bytes stay in the library; only an accepted, explicitly attached photo is uploaded, with
> EXIF GPS stripped by default.

Not a general tagging graph, not many-to-many, not a feed item. **And it fires a trigger already written
down:** §2.13 A-6a's closing paragraph says that the moment `Place` gains a second referent kind — a saved
places library, place notes, or photos — `removeStop`'s single-row prune must become a reference-counted
delete with a user-visible affordance. Photos are that second referent. The phase that ships them re-reads
that paragraph; it is not a discovery.

### 8.7 The social graph — five edges, and the pairs that must never be collapsed

Phase 3's tables, stated now because `core/access` already models three of them and the conformance matrix
is generated from the types:

| Edge | Answers | Grants |
|---|---|---|
| `TripParticipant` | who travelled | **nothing** |
| `TripMember` | who co-owns | full rights on that trip |
| `TripShare` | who was given this trip (a user, or a link token) | `viewer` / `commenter` / `editor`, with `expiresAt` / `revokedAt` |
| `Connection` | who follows or is friends with whom | **nothing by itself** — §6.2's predicates already treat `friendIds` as granting nothing |
| `LocationShare` | who may see a trace, at what precision, until when | one audience, one day, revocable |

**The collapses to refuse, each of which is the obvious shortcut:** participant ⇒ member (*"they were on
the trip, let them edit"*), friend ⇒ viewer (*"friends can see my trips"*), member ⇒ location (*"we are
travelling together, share my position"*). Every one of them is a privacy decision disguised as a
convenience, and every one is a data migration to undo. The conformance matrix (§6.2) gains **participant
with no share** as a principal, and its expected verdict on every operation is `deny` — a cell that is
asserted before there is any code that could make it true.

**Following is not friendship and Cairn has no public surface** until a trip is explicitly published.
Publication is a `TripShare` to a link principal, which already exists; there is no `is_public` column, and
adding one is what would create the moderation obligation §6.5 defers.

### 8.8 What §8 refuses to architect, and the two it refuses outright

- **Live presence — *"people currently or approximately in the same destination"*. Refused outright, and
  this is the one place I push back on the thesis.** It cannot be built without the server holding where
  someone *is now*, which inverts §6.1's central claim — *"a full dump of the production database contains
  zero raw traces"* — the single property that makes every other location feature in this product
  defensible. **Nothing may add a `last_seen_at`, a `current_city` or a coordinate column "for later".** If
  it is ever built it is a separate, opt-in, per-trip *ephemeral presence*: a coarse geohash with a short
  TTL, written by the device, readable only by that trip's members, never joined to a trace and never
  retained. That design is written here so that the version which shows up under schedule pressure — a
  `users.current_location` column — is recognisable as the thing this paragraph refused.
- **Travel miles and flight miles. Deferred, both — *superseded at revision 10 by §8.10*, which is a
  refinement and not a reversal.** The refusal this bullet actually made stands verbatim and is now §8.10's
  first rule: **a mile count derived from a *plan* is a fabricated statistic**, and no planned distance ever
  counts toward a lifetime total. What has changed is that Jacob has given the capability a shape — distance
  by mode, with air separable from ground — so the deferral is now per mode and per *provenance* rather than
  wholesale, and the model decisions that keep the four kinds of number apart are taken in §8.10 rather than
  left for the phase that first needs them. **Airline loyalty miles (SkyMiles, AAdvantage, MileagePlus) are
  a different thing again and are out of scope in §8.10** — unscheduled, not refused.
- **Goals and achievements. Architected here in one line, implemented late:** a `Goal` is a declarative
  target (`{kind:'countries'|'cities'|'trips', target: number, window?: {from,to}}`) evaluated against
  `travelStats`. **No stored counters, no points, no badge table.** The reason is not tidiness: a
  gamification that rewards *entering* data corrupts the travel history's honesty, and this product's whole
  claim is that the history is real.
- **Automatic trip detection.** Nothing here forecloses it — a detected trip is a candidate `Trip` with
  `{source:'device', state:'candidate'}`, which is the shape that already exists — and nothing here builds
  it. It is worth the thesis's own warning: build it when the manual path is good enough that the automatic
  one has something to be checked against.
- **CRDTs, still.** §7's deferral stands, and its **trigger is now named**: the first `editor` role on a
  shared trip makes two people editing one document real. Last-writer-wins per stop behind the §2.2a fence
  is the answer for as long as the complaint is hypothetical.
- **Opening hours, currency conversion, sub-maps, booking/payments, chat, recommendation ML** — §7,
  unchanged.

### 8.9 The export surface, and what §8 costs it

§2.10 is set equality against one list, and *"widening the surface is a documentation change first"*. This
section is that change: it names, under **P2**, `lifecycle`, `countryOf`, `travelStats`, `SUMMARY_VERSION`,
the generated country index value `COUNTRY_INDEX` (revision 10 — `tripSummary` and the map surfaces are
outside `packages/core` and every one of them has to be handed one), and the participant build functions
`addParticipant` / `updateParticipant` / `removeParticipant`. `setTripMeta`'s patch allowlist gains
`datePrecision`; `tripSummary`'s return type widens and it **takes the index as a second parameter**
(revision 10, §8.4) — neither adds a symbol. **The new total is derived by counting, in the pass that adds the callers, and pinned in §2.10
and in ROADMAP criterion E in the same commit.** Quoting a number here that nobody has counted is the
defect §2.10 exists to prevent.

**§8.10 adds nothing to the surface now**, because it implements nothing now. The symbols it will name when
its first mode ships — `airportOf`, `journeyDistance`, and whatever `travelStats`' widening needs — are
listed in §8.10 and counted in the pass that adds their callers, under the same rule.

---

### 8.10 Physical travel distance — four bases, one per-mode schedule, and what may never be added together

**Input: Jacob's clarification of 2026-08-27**, given after the product thesis and recorded here because it
is a model decision, not a feature request. He asked for meaningful physical travel distance by mode — air,
train, car/road, walking/hiking, cycling, boat/ferry, and other modes where trustworthy data exists — and,
in the same breath, for three things to stay visibly apart: **physical distance** (actual travel, which may
count toward lifetime statistics and achievements), **planned distance** (itinerary estimates, which may
not), and **airline loyalty rewards** (SkyMiles and friends, which are not distance at all).

**This is not Phase 2 scope and none of it is built in Phase 2.** Phase 2 is §8.1–§8.4. This section exists
so that the phases that *can* produce an honest distance do not each invent their own answer, and so that
the cheap wrong version — one `totalKm` field, filled from whatever was nearest to hand — is recognisable
as the thing this section refused.

#### 1. The rule the whole section is for: a distance is only as good as the reader's ability to tell where it came from

A mode-by-mode figure is meaningless unless the reader can distinguish a great-circle distance between two
airports named on a confirmation from a GPS track sum from a number an operator's own document stated from
a guess the itinerary implied. **These are four different claims and they are never interchangeable.**

```ts
type DistanceBasis = 'verified' | 'observed' | 'derived' | 'planned';
type DistanceMethod = 'great_circle' | 'track_sum' | 'stated';
```

| Basis | Means | Example | Counts toward lifetime totals |
|---|---|---|---|
| `verified` | both endpoints came from a document we hold, or from the user confirming them against one, **and the journey is in the past** | airport-to-airport great circle for a completed, coded flight | **yes** |
| `observed` | measured from the device's own fixes, on the device | a walked, cycled or driven track summed by `segmentTrace` | **yes, on acceptance** (§8.5's boundary, unchanged) |
| `derived` | computed from a trustworthy stated figure that is not a measurement — Jacob's *"reliably derived"* | a rail operator's ticket that states 412 km | **yes, labelled as derived** |
| `planned` | implied by the itinerary and nothing else | `computeLegs`' `km` for a flight that has not happened; a haversine between two typed coordinates | **never** |

**Three consequences, each of which is the thing a later phase will be tempted to break:**

1. **No total is ever rendered across two bases.** *"48,120 km flown"* is only a sentence if every kilometre
   in it has the same basis; a screen may show *verified*, *observed* and *derived* subtotals side by side,
   and `planned` belongs in a different block or on a different screen entirely. A UI that adds `verified`
   to `planned` has committed §8.4's error — a statistic a user can inflate by typing — with an extra step.
2. **`null` stays a first-class answer**, exactly as it is for `countryOf` (§8.4). A journey whose endpoints
   do not resolve has **no distance**, and the surface says *"n journeys not measured"*. It is never
   back-filled from the plan, and it is never snapped to the nearest thing that would produce a number.
3. **Nothing counts anything into storage.** §8.4's rule is unchanged and binds here hardest, because a
   running mileage total is the single most tempting counter in the product. Every figure is derived, on
   read, from the records it claims to summarise.

#### 2. `Journey` — the movement counterpart of `Visit`, and it obeys §8.5's three rules

§8.5 gave observation one record class for *being somewhere*. Distance needs its counterpart for *going
between two somewheres*, and it is the same shape for the same reasons:

```ts
type Endpoint =
  | { kind: 'airport'; code: string }          // IATA/ICAO, resolved through the bundled index
  | { kind: 'place';   placeId: PlaceId }
  | { kind: 'coord';   at: LatLng }
  | { kind: 'name';    name: string };         // unresolvable by construction — distance is null

type Journey = {
  id: JourneyId;
  mode: TravelMode;                            // the existing enum — §2.2, no new values
  from: Endpoint; to: Endpoint;
  date: IsoDate;                               // the day it happened
  distance: { km: number; basis: DistanceBasis; method: DistanceMethod } | null;
  bookingId: BookingId | null;                 // what it was derived from, if anything
  stopId: StopId | null;
  provenance: Provenance;                      // the existing one — WHO produced the record
};
```

**Two provenances, deliberately, and they are not the same question.** `Journey.provenance` is §2.8's — who
produced this record and whether the user has taken it on. `distance.basis` is what the *number* is. A
`{source:'user'}` record can carry a `verified` distance (the user confirmed the airport codes against the
confirmation) and a `{source:'device'}` record can carry a `planned` one (it never should, and the type
permits saying so rather than lying). Collapsing them into one field is how *"asserted"* becomes
*"verified"* in a later refactor.

**The three §8.5 rules apply unchanged:** a `Journey` is a separate record class and **never mutates a
`Stop`** or a `Booking`; an unaccepted, device-produced `Journey` is device-local and **acceptance is the
transmission boundary**; and `source:'device'` is the one widening, carried by §8.5's `schemaVersion` bump,
not a second one.

**Stored or derived — the ruling, because §0.6 will be pointed at it.** A `Journey` is stored **only when
its inputs are not in the document**. Observed journeys are stored on acceptance, because the fix stream
they came from is device-local and never syncs, so there is nothing left to recompute from — which is
exactly `Visit`'s situation and gets `Visit`'s answer. **Air distance for a booked flight is not stored at
all**: it is recomputed on read from `(route.fromCode, route.toCode, airportIndex)`, so it cannot drift
from the booking and improves for free when the index does. A stored `distanceKm` on a `Booking` is the
`countriesVisited: 47` mistake in a different costume.

#### 3. The airport index — the same mechanism family as the country index, a separate dataset

```ts
airportOf(code: string, index: AirportIndex): LatLng | null    // pure; index injected
journeyDistance(j: Journey, ctx: { airports: AirportIndex; today: IsoDate }): Journey['distance']
```

Same **mechanism** as §8.4 and for the same three reasons — a bundled, generated, committed module; the
index injected so the function stays pure and testable against a four-airport fixture; a size budget pinned
by a test and measured by the generator, never quoted from a document; `null` first-class. **§8.4's finding
that there is no cheap hosted answer that is also a private one applies here unchanged, and it extends to
routing:** sending an origin and a destination to a routing service transmits a location just as surely as
sending one coordinate to a geocoder does. That is why `DistanceMethod` has no `'route'` value — a hosted
route API is not an available mechanism under §6.1, and if one ever becomes viable on-device it is a new
method value *and* a new privacy ruling, not a quiet addition.

**A separate dataset and a separate generator** (`tools/gen-airports.mjs`), not a widening of
`gen-countries.mjs`: countries are polygons tested by ray-casting, airports are points keyed by code, and
one generator emitting both would couple two size budgets that move for unrelated reasons.

**Source, with its licence checked rather than assumed** *(verified 2026-08-27)*: **OurAirports**, whose
distribution repository states the **Unlicense** and whose project data page is described as Open Data
Commons PDDL 1.0 — public domain either way, no attribution required, commercial use permitted. Filtered to
airports carrying an IATA code with scheduled service, which is a few thousand rows of `code → lat,lng`
rather than the full ~80,000. ⚠ **The project's own data page was blocked by this session's egress proxy,
so the licence line must be re-confirmed from the source before the generator ships** — the fallback, if it
cannot be, is Natural Earth's `ne_10m_airports` layer (already public domain, already the family §8.4
uses), at the cost of coverage that the correctness floor would then have to measure. Sources:
[ourairports-data](https://github.com/davidmegginson/ourairports-data) ·
[OurAirports open data](https://ourairports.com/data/).

#### 4. What *"verified/completed flight"* means against the model as it actually is

Three findings from the shipped code, because this is where a plausible-sounding spec would go wrong:

1. **There is no airport identity in the model today.** `Booking.route` is `{fromName, toName}` and both are
   free text: the reference trip's first booking reads `"Los Angeles (LAX)"`. That is a display string.
2. **`confidence:'confirmed'` is not sufficient.** All 21 bookings in the reference fixture are
   `{source:'user', state:'accepted', confidence:'confirmed'}` — transcribed by hand from `docs/BOOKINGS.md`
   — and two of them carry `unverified_reference` conflicts. Confidence describes *the booking*; it says
   nothing about whether an endpoint pair is trustworthy.
3. **Nothing in the model says a journey happened.** `lifecycle()` (§8.1) is the only thing that can, and
   only at day granularity — which is enough.

So, stated once:

> A flight's distance is **`verified`** iff all three hold: **(a)** the booking carries structured endpoint
> codes that came from the booking document itself or that the user confirmed against it; **(b)** both codes
> resolve in the bundled index; **(c)** the journey's date is strictly before `today`. Fail (a) or (b) and
> there is **no distance** — `null`, rendered as unmeasured. Fail only (c) and the identical number exists
> with basis `planned`, is labelled, and does not count.

**Named anti-pattern: regex-scraping `(LAX)` out of `fromName` does not produce a verified endpoint.** It
may produce a **suggestion the user confirms** — `{source:'system', state:'candidate'}`, the same
candidate-then-accept path as every other automatic source in this product — and that is the shape the phase
that builds it must take. A scraped code that silently becomes a lifetime statistic is precisely the
fabricated number this section exists to prevent.

**The additive field, named now, added in the phase that can populate it honestly:**

```ts
Booking.route?: { fromName: string; toName: string; fromCode?: string; toCode?: string };  // IATA/ICAO
```

Optional, display-neutral, **read by no rule, no derive and no validation**, exactly as `datePrecision` is
(§8.1). It lands in **Phase 4** with the parser that fills it from a real confirmation, plus a user-confirm
control for bookings already entered by hand. **It is not added in Phase 2**, because a field nothing can
fill honestly is a field that gets filled dishonestly.

#### 5. Per-mode schedule — which phase can make each mode honest

| Mode | Where an honest number comes from | Bases reachable | Phase |
|---|---|---|---|
| **Air** | great circle between two indexed airports | `verified` when past + coded + resolved; else `planned` | endpoints in **4**; index, `journeyDistance` and the surfaces in **7** |
| **Train** | observed track; or a distance the operator's document states | `observed`, `derived` | **5b** (observed); `derived` whenever a parser can read a stated figure — **4** at the earliest |
| **Car / road** | observed track | `observed` | **5b** |
| **Walking / hiking** | observed track | `observed` | **5b** |
| **Cycling** | observed track | `observed` | **5b** |
| **Boat / ferry** | observed track; or a stated operator figure | `observed`, `derived` | **5b** |
| anything else | — | — | a mode gets a model when it has a trustworthy source, not before |

**Air is the only mode that can be honest without a device**, which is the whole reason it is separable —
and it still cannot be honest before Phase 4, because nothing before Phase 4 produces a structured endpoint
pair. **Every ground mode waits for §8.5's observed data.** Sequencing rule 8 already says this in general
form; this table is it applied per mode.

Two constraints inherited rather than invented: distance arithmetic is `derive/geo.ts`'s haversine and
**there is exactly one implementation of coordinate distance in `packages/core`** (§2.13's grep criterion —
a `journeyDistance` that hand-rolls its own great circle fails it); and any surface that renders a journey
inherits §5.3's gap rule — a track with a hole is summed as the sum of its measured segments and the hole is
**reported**, never bridged.

#### 6. What `travelStats` gains, in the phase that ships the first mode

```ts
TravelStats.distance?: {
  byMode: Array<{ mode: TravelMode; km: number; basis: DistanceBasis; journeys: number }>;
  unmeasured: { journeys: number };      // the honest hole, on screen — §8.4's `unattributed`, again
};
```

One row per `(mode, basis)` pair and **no `totalKm` field anywhere**, so a caller that wants a total has to
choose a basis to state — which is the point. Units are stored in kilometres and converted for display; a
goal expressed as *"fly 25,000 miles"* stores its target with its unit, and §8.8's ruling stands unchanged:
a goal is a declarative target evaluated against derived statistics, filtered to physical bases, never a
counter that is incremented.

#### 7. Airline and loyalty rewards — out of scope, and not the same kind of out-of-scope as live presence

**SkyMiles, AAdvantage, MileagePlus and every programme like them are outside the near-to-mid-term
architecture.** Three reasons, in order:

1. **They are not a distance.** Award and status miles are derived from fare, cabin, status tier and
   promotions; the same physical flight earns different numbers in different programmes and different
   numbers for two passengers in adjacent seats. Putting them in the same field as a great-circle distance
   would be the exact conflation Jacob asked to prevent — **and it is forbidden in advance: no loyalty
   figure may ever be written into a `Journey`, into `TravelStats.distance`, or into any total that also
   contains physical travel.**
2. **They are a third-party integration surface**, not a travel-history concept: per-airline account
   linking, OAuth or scraping, credentials to hold, and a partner relationship to negotiate. That is the
   mailbox problem's family (§6.4), and it is the family this project has already measured as expensive.
3. **No phase plans for it**, and sequencing rule 8 says a capability with no data behind it does not get a
   phase.

**This is a deferral, not a refusal.** §8.8 refuses live presence *on principle*, because building it would
invert the product's central privacy claim; nothing of that kind is true here. If Jacob wants loyalty
balances later they are a separate capability with their own record class, their own credential handling and
their own phase — sitting **beside** physical distance on a profile, never summed into it.
