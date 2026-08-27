# Cairn — product vision and the road from Phase 1

**Input: Jacob's product thesis, given in full on 2026-08-27**, the day after Phase 1 shipped
(`REVIEW.md`, verdict SHIP, `b32ef9a`). It is preserved verbatim in **Appendix A** — read his words, not a
paraphrase of them. This document is the *decision* that follows from it: what to build next, in what
order, what to design now and what to leave alone.

**Where the authority lives, so this file never becomes a second contract:**

| Question | Authoritative document |
|---|---|
| What Cairn is, and what Jacob has decided | `BRIEF.md` |
| The model, the rules, the rulings | `ARCHITECTURE.md` — the travel-history model is **§8** |
| Phases, deliverables, acceptance criteria | `ROADMAP.md` — revision 9 |
| **Why this order and not another; what is deferred and why** | **this file** |

≈7k tokens. Read it whole if you are the architect or the manager; §1, §4 and §6 if you are building Phase
2; §3 if you are about to build something that is not in the roadmap.

The thesis in one sentence, because everything below is downstream of it:

> **Cairn is the persistent record of a person's travel life. A trip does not end when the itinerary ends.**

---

## 1. Recommended Phase 2 scope

**Phase 2 is travel history, local-first: past trips, the trip lifecycle, the lifetime map, and who you
travelled with. No server, no accounts, no device.**

Three steps, each shippable on its own (`ROADMAP.md` Phase 2 has the deliverables and the build order):

- **2a — past trips and the lifecycle.** A trip's stage is *derived* from its dates; a past trip is a trip
  whose end date has passed; `Trip.datePrecision` records "March 2019" honestly; and every conflict rule
  declares whether it is about **feasibility** or **integrity**, so a finished trip stops being nagged at.
- **2b — the lifetime map and travel identity.** On-device country attribution from a bundled public-domain
  dataset, derived travel statistics, a widened library summary with a version-forced rescan, and the two
  surfaces that make it visible: **Map** and **Profile**.
- **2c — participants.** Who was on the trip, as data in the trip document, granting **nothing**.

### Why this and not the server

The previous roadmap had accounts and the server as Phase 2. Four reasons it moves back one, in order of
how decisive each is:

1. **Nothing in the travel-history product needs a server.** Past trips, the lifecycle, the lifetime map,
   statistics and participants are all pure functions of documents the user already owns. The server is
   required by exactly one thing — *other people* — and the thesis's own principle 10 says the base product
   must be valuable before the social layer exists.
2. **It is the last large capability a single builder can finish and a tester can genuinely attack in
   plain Node.** Phase 1 — a local-first client with no network — took eleven QA rounds and four
   architecture revisions to close. A phase that adds a database, a hosting account, RLS policies, OAuth
   and a sync protocol is strictly larger than that, and the environment this pipeline runs in has no cloud
   account and a proxy that blocks most egress. Keeping one more phase inside `node --test` is worth more
   than reaching the server one phase earlier.
3. **It is what makes an account worth creating.** A user with one trip has nothing to sync. A user with
   twelve trips and a map of thirty countries has a travel history, and *that* is the thing they will not
   want to lose — which is the honest reason to sign in, and the reason a friend will install anything.
4. **It fixes a live defect that has no other home.** Today is 2026-08-27 and the reference trip ended on
   the 22nd. Every feasibility rule in the conflicts panel now fires about a trip Jacob has already taken —
   *"no lodging in Budapest"* for nights he has already slept. §8.2 is the fix, and it is only expressible
   once a trip has a lifecycle.

### The one thing deliberately left out of Phase 2

**The `acceptCandidate` control.** Phase 1 shipped without it (`REVIEW.md`: a copied stop stays badged
*from a friend* forever), and Jacob was asked whether he wants it early. It belongs with accounts, because
that is when accepting someone else's stop stops being hypothetical — **and because shipping it fires
R8-3**, a MAJOR that is unreachable only because the control does not exist. If Jacob pulls the control
forward, R8-3 is ruled first; the two move together and neither moves alone. `ROADMAP.md` Phase 2 carries
that as a table row rather than a paragraph.

---

## 2. Full prioritized roadmap after Phase 2

Numbers shifted by one from the accounts phase onward; every heading in `ROADMAP.md` carries its old
number, and the mapping is stated once at the top of that file rather than by editing forty
cross-references inside settled rulings.

| # | Phase | Why here and not earlier | Needs |
|---|---|---|---|
| **3** *(was 2)* | **Accounts, server, sync, sharing.** Postgres + RLS, `SyncPort`, friends, per-trip shares, public share links, the accept control | The first thing that genuinely cannot be local. Phase 2's participants become linkable to real users here — and linking still grants nothing | a managed Postgres/auth/storage account |
| **4** *(was 3)* | **Mailbox ingestion.** Candidate review queue, per-operator parsers, reissue-vs-duplicate, tickets on acceptance | Needs the server; and its Gmail gate is a long-lead external item (§7) that should start ticking early. Step 1 — forward-to-an-address — needs no OAuth at all | a forward-in address, then Outlook, then Gmail |
| **5** *(was 4)* | **The phone.** 5a offline travel; 5b background location, observed `Visit` records, timezones, `journey_overrun` | The differentiator, and the one phase that cannot be tested without a device and two store reviews. 5a is useful the day it lands; 5b is the first automatic data in the product | developer accounts, a device, **a Play background-location declaration** |
| **6** *(was 5)* | **Photos.** On-device library scan, stop suggestions, opt-in attach | Needs 5b's traces to be good at what the thesis actually wants — a photo placed against the stop you were standing at | **a Play broad-media-access review** |
| **7** *(was 6)* | **Discovery, recap, goals, polish.** "Friends who have been here", the yearly recap, goals over derived stats, trace sharing, share-page hardening | Every item is a query over history and a social graph that do not exist until 3 and 5. Built earlier, each would be a shell with nothing behind it | — |

**The one order I would swap on request.** If Jacob has a real trip booked before Phase 4 finishes, **5a
(offline travel on the phone) outranks mailbox ingestion** — a trip he can open on a plane beats a review
queue. Nothing in the design depends on 4 preceding 5; the dependency runs 3 → {4, 5}.

**What is never scheduled:** live presence — *"people currently in the same destination"*. `ARCHITECTURE.md`
§8.8 refuses it in writing, with the bounded design it would have to take if it is ever built. It is the
one item in the thesis I am pushing back on, and §7 below states the cost of not doing so.

---

## 3. What must be architected now vs what can wait

Every capability the thesis names, classified. **"Architect now"** means a decision is recorded in
`ARCHITECTURE.md` §8 and *nothing is implemented*; it is reserved for decisions that are one-way doors.

| Capability | Verdict | Where |
|---|---|---|
| Past trips, entered manually | **Build in Phase 2** | §8.1 |
| The three stages of a trip (before / during / after) | **Build in Phase 2** — as three *renderings of one document*, never three data models | §8.1, §5 below |
| Completed-trip history that stays useful | **Build in Phase 2** | §8.1, §8.2 |
| Lifetime map, countries and cities visited | **Build in Phase 2** | §8.4 |
| Travel identity / profile | **Build in Phase 2**, from derived statistics only | §8.4 |
| Trip participants (who you travelled with) | **Build in Phase 2** — data and display; grants nothing | §8.3 |
| Participants who can *view or edit* the trip | **Architect now, build in Phase 3** — a separate edge, never inferred from participation | §8.7 |
| Social graph, friends, sharing, share links | **Build in Phase 3.** The access *predicates* already shipped in Phase 1 and already treat friendship as granting nothing | §6.2, §8.7 |
| Photo-metadata-assisted past-trip suggestions | **Architect now, build in Phase 6+** — and only ever as a suggestion queue, never an auto-created trip | §8.6 |
| Location: historical, per-trip, live-path | **Architect now, build in Phase 5** — observation is a separate record class that never mutates a plan | §8.5 |
| Automatic future-trip detection | **Architect now (it is a candidate `Trip`, a shape that already exists), build much later** | §8.8 |
| Photos attached to trips/places/people | **Architect now, build in Phase 6** | §8.6 |
| Goals and achievements | **Architect now in one line — derived, never counted — build in Phase 7** | §8.8 |
| Destination discovery through people | **Build in Phase 7.** A query over shares and history, not a recommendation engine | §2 above |
| Yearly recap, travel passport | **Build in Phase 7.** Pure derive; cheap once stats exist, empty before | §8.4 |
| Travel miles / flight miles | **Safely defer both.** Needs airport data and real instants — and a mileage derived from a *plan* is a fabricated statistic | §8.8 |
| Live / overlapping travellers | **Refused, not deferred.** It requires the server to hold where someone is *now*, which inverts the product's central privacy claim | §8.8 |
| Chat, payments, recommendation ML, public feed | **Safely defer both** — the brief's standing non-goals | §7 of ARCHITECTURE |

**The three principles that are data-model decisions, and where each is now enforced:**

- **Principle 3 — participants, social relationships and location-sharing permissions are separate
  concepts.** Five edges in §8.7, never collapsible; the first ships in Phase 2 with nothing to grant, and
  the Phase 3 conformance matrix gains *"participant with no share"* as a principal whose expected verdict
  on every operation is **deny**. It is a schema, not a sentence.
- **Principle 2 — planned and observed travel stay distinguishable.** §8.5: a `Visit` is a separate record
  class. A `visited: boolean` on `Stop` would destroy the plan irreversibly, and *"did I do what I
  planned"* would become unanswerable for every trip already travelled.
- **Principle 5 — the history compounds.** §8.4: every statistic is derived from the trips it summarises,
  so it cannot drift from them and cannot be inflated by typing.

---

## 4. Architectural changes needed before Phase 2

Nine, all additive. None changes Phase 1 behaviour, and the ceiling on the whole phase is that every Phase
1 number is re-derived unchanged. Full text in `ARCHITECTURE.md` §8; this is the list.

1. **`lifecycle(trip, today)` is derived — no stored status field.** A stored status is a copy of what the
   dates already say and it goes stale at midnight with nothing to invalidate it. §8.1.
2. **One new stored field: `Trip.datePrecision: 'exact' | 'month' | 'year'`.** Start and end stay real
   calendar dates, so no rule, derive or golden moves; only display reads it. Stored because it is not
   derivable and retrofitting date fuzziness after forty trips is the expensive migration. §8.1.
3. **No `Trip.kind`, and no new provenance value for past trips.** Manual entry is already
   `{source:'user', confidence:'asserted'}` — §2.8's own definition of *"a human said so with nothing
   behind it"*. Four fifths of the thesis's provenance requirement was already built. §8.1.
4. **Every conflict rule declares a class: feasibility or integrity.** A feasibility rule does not run for
   a subject whose day is strictly before `ctx.today`. This is the fix for the live defect in §1 above, and
   it is what stops a new user's first past trip greeting them with twenty warnings. §8.2.
5. **`Trip.participants`, embedded in the document.** Not a second persisted structure — that is A-5's
   rejected option and it is rejected here for the same reasons. Cross-trip identity is derived and the
   view says so. §8.3.
6. **Country attribution is on-device, from a generated public-domain index, with `null` as a first-class
   answer.** Sending a coordinate to a geocoder *is* transmitting a location; the free public geocoder
   forbids this use anyway. A size budget and a correctness floor decide the dataset scale, both measured.
   §8.4.
7. **`travelStats` is derived and nothing counts anything into storage.** §8.4.
8. **`TripSummaryRow` widens, and the freshness rule that keeps it honest**: a summary is computed only
   from the document being written, in the write that carries it; nothing edits it independently; a
   `SUMMARY_VERSION` bump forces a rescan; every drill-down reads the document. §8.4 — this is §0.6 applied
   to the one cache the lifetime map depends on.
9. **The export surface widens by the symbols §8.9 names, and the number is counted in the pass that adds
   the callers**, not quoted from a document. §2.10's rule: widening the surface is a documentation change
   first, and §8 is that change.

**Also settled in this pass, so it is not carried further:** **A-8** (§2.7) blesses A-5b clause 2 and
closes **R10-1**, the last carried MINOR, with the trigger that would reopen it written down. **R8-3** and
**R8-4** are placed with their triggers in `ROADMAP.md` Phase 2's routed-items table, and neither is
adjudicated here.

---

## 5. Recommended UX/UI direction

**The shape: MAP · TRIPS · DISCOVER · PROFILE — but Cairn ships three of the four.**

**Do not ship an empty DISCOVER tab.** It appears in Phase 3, when there is a network behind it. A
navigation slot that exists to promise something is the opposite of what this product's conventions say
about presenting things that are not yet true. Phase 2 ships **Trips · Map · Profile**.

**One document, three renderings — and this is the `DAYS` lesson generalised.** The thesis's before /
during / after are not three data models and must never become three:

| Stage | The surface | New model? |
|---|---|---|
| **Before** | the day timeline that already exists — plan, pool, conflicts, day map | none |
| **During** | a *today* view: what is next, today's map, today's legs. A date-aware default over the same document | none |
| **After** | the **story**: route map, timeline, photos (Phase 6), places, participants, statistics | none |

If a future feature needs a fourth model to express a stage, that is the signal something has been designed
wrongly — the same rule that kept the city tabs, the day view, the maps and the cost roll-up from ever
drifting apart.

**The map is the signature, and it is two maps, not one.** The trip map (exists) answers *"where am I
going"*. The lifetime map answers *"where have I been"* — filled countries, city pins, tap a country to get
the trips, tap a city to get the places. It inherits both of `CLAUDE.md`'s map bugs (never fit a hidden
container; cluster before fitting) plus its own version of the min-span guard: a history containing one
country must not open at a rooftop zoom. Same core functions, new caller, **no second implementation**.

**Provenance carries onto every new surface.** A pin on the lifetime map for an unaccepted copied stop is
dimmed exactly as its card is; a country attributed from a stop the user never accepted is shown as such;
an unattributed coordinate is shown as unattributed. The badge rule is not a list-view rule, it is a
product rule, and the map is where it will first be forgotten.

**What the profile is, and what it is not.** It is a travel identity: countries, cities, trips, days
travelled, people travelled with, first and last visit per country, and an honest count of what could not
be attributed. It is **not** a generic social profile with travel photos: no follower count in Phase 2
(there is nothing to follow), no bio, no feed.

**What not to build, stated so it is not drifted into:** no infinite feed, no likes, no ranking, no
notifications for their own sake. The social unit is the **trip, the stop, or the place** — the thing a
person can actually use — not a photo post. When Phase 3 adds sharing, the unit that crosses between two
people is still one stop (`copyStopInto`, §2.14), which is already built and already exercised.

**Progressive reduction of manual work, in the order the thesis implies:** Phase 2 you type a past trip;
Phase 4 a forwarded email fills a booking in; Phase 5 the phone proposes the visits; Phase 6 the photos
land against them. Every one of those arrives as a **candidate** the user accepts. That is the single UX
invariant that lets the product get more automatic without ever getting less trustworthy.

---

## 6. Phase 2 ship gate

`ROADMAP.md` Phase 2's exit criteria are authoritative and each carries its oracle tag; this is the summary
in one line each. The first two are ceilings on Phase 1 and are the ones that fail first.

1. **Phase 1 does not move.** The whole suite passes, and every number in §A–§F is re-derived rather than
   quoted — 2 blockers at the goldens' fixed clock, `geoCheck` at 0/112 and 0/94 clean and 112/112 and
   92/94 under +1°.
2. **The rule class does what it claims.** The same trip at a `today` after its end date returns only
   integrity findings, with the count stated and one line per finding; moved back before the start date, it
   returns the original set exactly. A rule silent at both clocks has been deleted, not classified.
3. **A past trip is silent.** A 21-day, one-city, zero-stop 2019 trip returns **zero** conflicts and
   **zero** validation issues — a ceiling — while its days stay dense. Add a stop dated in the future and
   the feasibility rules return for that day only.
4. **Country attribution is measured and its holes are visible.** A golden naming every country *and the
   stop that produced it*; a mid-ocean coordinate returns `null` and renders as unattributed, never as the
   nearest country; the Fisherman's Bastion typo changes the attributed country **and** still produces its
   `geo_outlier` blocker; the Dalmatian islands attribute to HR or the generator is on the wrong dataset
   scale.
5. **Nothing counts anything into storage**, greppable, and `travelStats` is pure.
6. **The summary is only as fresh as the write that minted it.** Bump `SUMMARY_VERSION`, reopen, and every
   row is recomputed from its own document through the ordinary chained write — never from another row,
   from `AppState`, or from a document it is not about.
7. **Participation grants nothing, proved mechanically.** The access conformance set run with and without
   participants is identical, cell for cell.
8. **Round-trip, undo and NO SILENT LOSS hold over the new fields**, and every new action still maps 1:1
   onto a core build function.

**And the gate's own rule, unchanged:** a manager verdict of SHIP, full chain, no shortcuts — and the
breaker's carried probe repair is owed *before* the first round, because this phase re-runs the whole probe
board as its opening ceiling.

---

## 7. Major technical, resource and cost risks as the product scales

Ordered by how likely each is to change the plan rather than the code. Every external claim below is dated
and sourced, or marked as needing verification.

**1. Gmail is a hard gate on going public, and it has an annual bill.** *(Verified; `ARCHITECTURE.md`
§6.4.)* Every Gmail read scope is restricted — including `gmail.metadata`, so minimising scope does not
help — and a restricted scope plus a third-party server means a **CASA** assessment (≈$540–$1,000 at Tier
2, 4–12 weeks, **annual revalidation**). Untold path: "Testing" caps at 100 users and expires every refresh
token after 7 days, which is hostile to unattended polling. *Mitigation, already in the roadmap:*
forward-to-an-address first (zero scopes), Outlook second (publisher verification is free, no mandatory
assessment), Gmail third — and the decision to pay is Jacob's, not the architecture's.

**2. Background location is a store-review gate, not just an engineering task.** *(Verified 2026-08-27.)*
Google Play requires a Play Console permissions declaration for `ACCESS_BACKGROUND_LOCATION`, judged
against a **core-functionality** justification with a video of the feature in use; without approval,
updates are blocked and the app can be removed, and one source reports background-location apps now taking
a 3–5 day manual review on every release *(single source — confirm before planning a release cadence
around it)*. Apple rejects a declared background mode the app does not visibly use. *Consequence:* the
declaration is written before the build, and "the live path and the travel history it builds" must be the
feature it describes. Sources: [Play — location in the
background](https://support.google.com/googleplay/android-developer/answer/9799150?hl=en) · [Android —
background location](https://developer.android.com/develop/sensors-and-location/location/background).

**3. Android may simply refuse the photo capability.** *(Verified 2026-08-27.)* Play's Photo and Video
Permissions policy restricts broad `READ_MEDIA_IMAGES` to apps that pass an **appropriate-access review**
demonstrating a core use case for persistent or frequent access; everything else is expected to use the
system photo picker — **and a picker cannot enumerate a library by timestamp and GPS, which is precisely
what pillar 5 does.** Compliance is mandatory for apps targeting Android 17+ from 2026-10-28. *Consequence:*
Phase 6 must design its degraded mode (user-picked photos, time-only matching) rather than discover it
after a rejection. Source: [Play — Photo and Video Permissions
policy](https://support.google.com/googleplay/android-developer/answer/14115180?hl=en). The
`ACCESS_MEDIA_LOCATION` trap is separate and already recorded: without it, coordinates come back empty
**with no error**.

**4. There is no cheap hosted geocoder that is also a private one.** *(Verified 2026-08-27.)* The public
Nominatim service's policy forbids systematic reverse queries and any application whose function is related
to geocoding; and sending a coordinate to any geocoder is transmitting a location, which §6.1 forbids
outright. *Consequence:* the bundled on-device index of §8.4 is not a cost optimisation, it is the only
design that satisfies the privacy posture — and its cost is a generated artifact with a size budget.
Source: [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

**5. Map tiles become a real bill the moment there are users.** OSM's public tile servers are not for
production applications; a commercial tile provider is priced per map load or per tile. **Unverified — get
a quote before Phase 5**, and note the shape of the exposure: a *lifetime* map is loaded on every profile
view, so tile cost scales with sessions rather than with trips. Vector tiles plus client-side rendering
(MapLibre) reduce it; a world map drawn from the country index we already bundle, with no tiles at all
behind it, reduces it to zero and may be the right answer for the profile map specifically.

**6. Photo and ticket storage is the only unbounded byte cost in the product.** Originals stay in the
library by design and only accepted, attached photos upload — that is the mitigation, and it was chosen for
privacy before it was a cost argument. Still unmeasured: bytes per active user per trip, and egress on a
share page that a friend opens repeatedly. *Needs a measured estimate before Phase 6, not a guess.*

**7. Location data is a liability the moment it is server-side.** The current design's strongest property
is that a full dump of the production database contains **zero** raw traces. Every feature that would break
it — live presence, "who else is here now", a leaderboard of miles — is cheap to build and impossible to
un-build, because the retention, deletion, breach and jurisdiction obligations attach the day the first row
lands. §8.8 refuses the largest of them in writing. *This is the risk I would most want Jacob to
re-read before approving any future feature that says "approximately".*

**8. The authorization surface grows multiplicatively, and roles are the multiplier.** The conformance
matrix is (principal × relationship × operation), enumerated from types. Five edges and three roles is
already a large matrix; every new role or operation multiplies it, and the matrix is the only thing
standing between the design and a permission bug on a public share page. *Consequence:* adding a role is a
design decision routed to the architect, not a product convenience.

**9. Two people editing one trip is a Phase 3 event, and last-writer-wins is the answer only while nobody
complains.** The `editor` share role makes concurrent editing real for the first time. CRDTs stay deferred
(§7), and the trigger to revisit is now named rather than hypothetical.

**10. Single-builder throughput is the constraint the roadmap is actually shaped around.** Phase 1 — no
network, no accounts, one surface — took eleven adversarial rounds, four architecture revisions and eight
rulings to reach SHIP. Every phase from 3 onward adds surfaces that cannot be attacked in plain Node.
*Consequence, and it is the reason Phase 2 is what it is:* spend the phases that can still be verified for
free before spending the ones that cannot.

---

## Appendix A — the product thesis, verbatim (Jacob, 2026-08-27)

> ## PRODUCT THESIS
> Cairn should ultimately be more than a travel planner, itinerary app, or travel journal. The long-term
> thesis is: Cairn is a social network built around a person's real-world travel history. Core loop:
> Discover → Plan → Travel → Document → Share → Build travel history → Discover through the network → Plan
> again. The key idea is that a trip does not end when the itinerary ends. Cairn should eventually become
> the persistent record of someone's travel life.
>
> ## THE TRIP
> A Cairn trip should exist across three stages:
> BEFORE: planning, itinerary, destinations/places, people invited
> DURING: itinerary, actual places visited, photos, location/history, people traveling together
> AFTER: completed trip, map/route, timeline/story, photos, places, participants, statistics, permanent
> travel history
> A completed trip should remain useful and become part of the user's lifetime travel identity.
>
> ## MULTI-PERSON TRAVEL
> Trips are inherently social. A user should be able to add multiple people to a trip/itinerary — for
> example, traveling with a girlfriend and her family. Trip membership must remain separate from:
> friendship/following, public social visibility, live location sharing. Someone can participate in a trip
> without becoming a Cairn friend/follower. Eventually participants may be able to: view the itinerary,
> contribute/edit, add places, add photos, see trip history, contribute recommendations. Determine the
> minimum strong version that belongs in the near-term product.
>
> ## PAST TRIPS
> Past trips are a first-class capability. A new user should not have to start with an empty Cairn history.
> Users should eventually be able to: manually add past trips, add dates/destinations/people, add places,
> add photos, build their historical travel map. Later, Cairn could assist by recognizing past trips from
> photo metadata and other permitted historical data. Treat manually entered, imported, and observed travel
> as potentially different provenance rather than pretending all data has identical certainty. Past-trip
> creation should be considered part of the usable product, while sophisticated historical importing can
> remain later.
>
> ## LOCATION + TRAVEL HISTORY
> A major long-term differentiator is connecting Cairn to device location services. Eventually Cairn should
> understand: where someone traveled, cities/countries visited, places visited, routes, trip start/end,
> potentially airports/flights, actual movement during a trip. The eventual goal is: "Show me everywhere
> I've been." The progression can be: manual history → photo/location-assisted history → automatic future
> trip detection → automatic travel history. Do not build continuous background tracking simply because it
> is part of the vision. However, identify architectural decisions that would make it difficult to add
> later. Location privacy is foundational: explicit permissions, historical vs live location,
> private/trip/friend/public visibility, approximate vs precise location, pause/revoke, deletion,
> retention, secure access.
>
> ## PHOTOS + MEMORIES
> Photos should eventually become location- and trip-aware rather than simply appearing in a generic social
> feed. A photo could belong to: a trip, a place, a date/time, a location, potentially participating
> people. The eventual experience should combine: map + timeline + photos + places + people into a coherent
> travel story.
>
> ## TRAVEL IDENTITY
> Cairn should eventually maintain a persistent travel identity/profile. Potential metrics: countries
> visited, cities visited, trips, continents, travel miles, flight miles, destinations, favorite
> places/interests, people traveled with. Potential experiences: lifetime travel map, travel passport,
> yearly travel recap, destination history. The profile should feel like a travel identity, not a generic
> social profile with travel photos.
>
> ## GOALS + ACHIEVEMENTS
> Eventually users should be able to set goals such as: visit 5 new countries, visit 10 cities, fly 25,000
> miles, visit every country in a region, visit national parks, take 4 international trips. Achievements
> should derive from actual travel data where possible. The goal is meaningful travel motivation, not
> arbitrary points. Determine where this belongs in the roadmap rather than overengineering it now.
>
> ## SOCIAL GRAPH + DISCOVERY
> Cairn should eventually let people discover travel through people rather than only generic travel
> recommendations. Potential experiences: "Friends who have been here", "People you follow going here",
> "Trips from people you trust", "Travelers with similar interests". Eventually: "People you know are going
> here." Potentially later: people currently/approximately in the same destination. Live/overlapping travel
> must be explicitly privacy-controlled. The social unit should be the trip, moment, or place rather than
> simply copying a generic photo feed.
>
> ## UX DIRECTION
> The best Cairn UX should combine the strongest patterns from travel planning, travel journaling, maps,
> activity history, collaborative tools, and visual social products. The intended experience should be
> centered around: MAP + TRIPS + DISCOVER + PROFILE. The map/travel history should eventually become a
> signature experience. A strong future trip experience is: Trip → map → timeline → photos → places →
> people → recap. The social experience should be travel-native rather than a generic photo feed. Cairn
> should progressively require less manual work as it matures.
>
> ## IMPORTANT PRODUCT PRINCIPLES
> 1. Real-world travel should become the source of truth wherever possible.
> 2. Planned travel and observed/actual travel should eventually be distinguishable.
> 3. Trip participants, social relationships, and location-sharing permissions are separate concepts.
> 4. Past travel matters as much as future travel.
> 5. The user's lifetime travel history should compound in value over time.
> 6. Privacy/security must be designed before automatic location becomes public-facing.
> 7. Do not overbuild for hypothetical scale.
> 8. Do not create architectural complexity now unless it protects an important future capability.
> 9. Avoid building a generic social network with travel branding; the travel graph is the product.
> 10. The base product must be valuable before automatic location, sophisticated social discovery, or
>     large-scale gamification exist.
>
> ## ROADMAP DECISION
> Determine the best progression from the shipped Phase 1 foundation to this larger vision. For each major
> capability, classify it as: Build in Phase 2 / Build later / Architect for now but defer implementation /
> Safely defer both. Pay particular attention to: collaborative/multi-person trips, past trips,
> completed-trip history, maps, photos, location data, travel identity, social graph, goals/achievements,
> destination discovery, live/overlapping travelers. Also determine where the carried-forward R8-3, R8-4,
> and R10-1 items belong.
>
> Keep Phase 2 small and coherent. The goal is not to build the entire vision now; it is to choose the next
> product that creates real user value while preserving a clean path to the larger Cairn vision.

### Where each of Jacob's ten principles is now enforced

| # | Principle | Enforced by |
|---|---|---|
| 1 | Real-world travel is the source of truth | derived statistics only (§8.4); mileage deferred until observed (§8.8) |
| 2 | Planned vs observed distinguishable | `Visit` as a separate record class (§8.5) |
| 3 | Participants ≠ relationships ≠ location sharing | five edges (§8.7); participants ship first, granting nothing (§8.3); a matrix cell asserts it (Phase 3 gate) |
| 4 | Past travel matters as much as future | Phase 2 in full; the feasibility/integrity rule class (§8.2) |
| 5 | History compounds | derived stats, the versioned summary rescan (§8.4) |
| 6 | Privacy designed before automatic location is public | §6.1 unchanged; acceptance is the transmission boundary (§8.5); live presence refused (§8.8) |
| 7 | Do not overbuild for scale | no new persisted structure in Phase 2; one region, one database, no cache tier (§6.5) |
| 8 | No complexity that does not protect a future capability | §8's nine changes are additive and each names the door it holds open; `Place.provenance`, a people table and a stored lifecycle were each refused |
| 9 | The travel graph is the product, not a social network with travel branding | no feed, no likes, no ranking; the social unit is the trip/stop/place (§5) |
| 10 | The base product is valuable before automation and social | Phase 2 is local-first and needs no account (§1); sequencing rule 8 |
