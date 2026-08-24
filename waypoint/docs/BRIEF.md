# Waypoint — product brief

The contract every agent on this project works from. The architect refines the *shape*; nothing here
about *intent* changes without Jacob.

---

## What this is

The Europe 2026 planner (`europe-2026-itinerary.html` at the repo root) proved the format: a day-by-day
itinerary that knows where each stop is, what it costs, how long the hop takes, and which ticket you need
— dense enough to actually travel from. It is single-trip, single-user, and its data is hardcoded.

Waypoint is that, generalised into a product:

1. **Many trips, many people.** Create an itinerary per trip, in the shape the Europe planner uses.
2. **Social.** Add friends, browse their itineraries, pull a whole trip or a single stop into your own.
3. **Mailbox ingestion.** Connect an email account; the app finds what you've booked, adds it to the
   right day, and attaches the actual ticket.
4. **Live path.** Location services draw your real route as you travel, over the planned one.
5. **Photos.** Using that location history, photos get placed on the trip automatically — or suggested
   against the stop you were standing at when you took them.

---

## The constraints that decide the architecture

Not preferences. These eliminate options, and the architect must reason from them:

- **Background location is not a web capability.** Drawing a path while the phone is in a pocket needs
  OS-level background location. A PWA cannot do this on iOS at all. Pillar 4 either gets a native
  shell or it does not exist. *(Architect: verify current iOS/Android behaviour rather than trusting
  this line.)*
- **Photo *library* access is not a web capability either.** A file picker returns files the user
  chose. Auto-*suggesting* photos means enumerating the library by timestamp and GPS, which is native-only.
- **Email ingestion cannot be client-only.** OAuth refresh tokens cannot live safely on a device, and
  scanning has to happen while the app is closed. This forces a real server with a background worker.
- **The social graph forces a real database.** Friends, per-trip permissions, and "who can see this"
  are server-authoritative or they are not enforceable.
- **Location traces, mailbox contents, and friends' itineraries are all sensitive.** Treat every one of
  them as data that must not leak, not as a feature payload.

The first two are the interesting ones: they mean the end state is a native app, so the design must not
paint itself into a browser. The last one means privacy is a design input, not a later hardening pass.

---

## Carry these forward from the existing planner

Hard-won and non-negotiable — see the root `CLAUDE.md` for the full history:

- **One data structure drives every view.** Today the `DAYS` array feeds the city tabs, the day view,
  the maps, and the cost roll-up, which is exactly why they never drift apart. Whatever replaces it keeps
  that property.
- **Never present a suggestion as the user's own plan.** Anything the system added — an email-derived
  booking, a friend's stop, our recommendation — is visibly marked as such until the user accepts it.
- **Flag conflicts, don't resolve them by guessing.** When a booking contradicts the plan, both stay
  visible and the conflict is surfaced. This is a first-class entity, not an error state.
- **Email-derived data is a *candidate*, never a silent write.** It lands in a review queue the user
  confirms. This is the same rule as the two above, applied to the highest-volume source.
- **Every ticketed thing gets a working link, and links get verified before they ship.** A ticket
  committed alongside the trip beats a vendor URL that expires.
- **Maps cannot be fitted while hidden, and a day spanning two cities must cluster before it fits.**
  Both were real bugs. Any new map layer inherits both problems.

---

## Recommended shape — a hypothesis for the architect to confirm or overturn

- **`packages/core`** — the domain model and itinerary engine as pure TypeScript: days, stops, legs, cost
  roll-up, geographic clustering, conflict detection. No UI, no network, no platform APIs. This is the
  generalisation of `DAYS` and it is the most valuable thing in the repo — it is what keeps web, native,
  and server agreeing on what a trip *is*.
- **`apps/web`** — planning and editing on a real keyboard; public share pages; OAuth callbacks.
- **`apps/mobile`** — the native shell that owns location, the photo library, and offline travel.
- **`services/api`** — auth, trips, social graph, permissions, ticket storage.
- **`services/ingest`** — mailbox polling and parsing, writing candidates only.

Worth costing seriously: a managed Postgres platform with row-level security and built-in auth/storage
collapses most of the sharing-permission surface into declarative policy instead of hand-written checks.
For a project this size that trade may be worth more than stack purity.

Data model to design against, at minimum: `User`, `Trip`, `TripMember`, `Stop`, `Place`, `Booking`,
`Ticket`, `MailAccount`, `IngestCandidate`, `Friendship`, `TripShare`, `TripFork`/`StopImport`,
`Conflict`, `LocationPoint`/`LocationSegment`, `PhotoAsset`.

Two design positions to take a view on explicitly:
- Are **days** stored, or derived from a date range plus stops? (Today they are stored.)
- Do **location traces and photo metadata stay on-device by default**, with only an explicit, simplified
  share going to the server?

---

## Phasing principle

Every phase ships something usable on its own, and the earliest phases must be runnable and attackable
in a plain Node environment with no device and no cloud account. Phase 1 is the core engine **plus a
working multi-trip client** — with the Europe 2026 data as the fixture, since it is the only real trip we
have and it exercises overnight legs, multi-city days, and unresolved conflicts. Core and the client's
state machine must both stay attackable in plain Node; see `ROADMAP.md` for the acceptance criteria.

## Non-goals for now

Booking or payments. Chat. Recommendation ML. Offline map tiles. Anything multi-tenant-enterprise.

## Decisions Jacob has confirmed

Settled. Do not relitigate these; raise a flag if the design forces one open.

- **Native app with a web companion.** Expo/React Native owns the phone — background location, photo
  library, offline travel. A web app covers desktop planning and share links friends can open without
  installing anything.
- **Lives in this repo under `waypoint/`.** Splitting it out later is a `git subtree split`.
- **Eventually public, launching with friends.** The posture is **public-grade on what is expensive to
  retrofit, friends-grade on everything else.** Public-grade from day one: authorization on every read
  path, ownership traceable on every row, deletion and export as a designed cascade (including location
  traces, cached copies of friends' trips, ticket blobs, and parsed mail candidates), and narrow mailbox
  handling that stores candidates rather than messages. Explicitly deferred until strangers arrive:
  moderation, rate limiting, billing, admin tooling, scaling, i18n.
- **Working name is "Waypoint"** — placeholder, not yet chosen.

## Working rules

Work on `master`. No feature branches, no PRs. Do not modify `europe-2026-itinerary.html`, `docs/`, or
`tickets/` at the repo root — that is a live app on Jacob's phone. Read them freely.
