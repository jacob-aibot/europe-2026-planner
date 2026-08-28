/**
 * Serialization (ARCHITECTURE §2.10, §6.3).
 *
 * `toJSON` writes every field in a FIXED order so that `toJSON(fromJSON(toJSON(t)))` is
 * byte-identical — the roadmap asserts exactly that, and it is also what makes the Phase 2
 * export a zip around this function rather than a new feature.
 *
 * Undefined optional fields are omitted rather than written as `null`, and they are omitted
 * the same way on the way back in.
 */
import type { Booking, City, Day, Place, Stop, Trip } from '../model/types.ts';

function omitUndef<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) if (o[k] !== undefined) out[k] = o[k];
  return out as T;
}

function city(c: City) {
  return omitUndef({
    key: c.key,
    name: c.name,
    countryCode: c.countryCode,
    centre: { lat: c.centre.lat, lng: c.centre.lng },
    order: c.order,
    meta: c.meta ? omitUndef({ flagEmoji: c.meta.flagEmoji, color: c.meta.color }) : undefined,
  });
}

/**
 * `Place.hours` on the way OUT, field by field (§2.14 **A-20**, revision 15).
 *
 * This was `hours: p.hours` — the one field of this function passed through unenumerated, in a
 * function that rebuilds every other field by name. Two consequences, both removed here: the
 * in-memory `weekly` array was **aliased** into the object handed to `JSON.stringify`, and an
 * unenumerated key on an entry of a cast-built document was re-emitted verbatim.
 *
 * It does **not** normalise or drop a malformed value, and it does **not** throw on one. An
 * export stays a faithful record of what the document holds; `validateTrip` is what says the
 * document is wrong (`place_hours_malformed`), and `fromJSON` is what refuses it on the way back
 * in. That division is A-20's whole line, and the ratified meaning of `place_hours_malformed`
 * depends on this function re-emitting rather than repairing: without the warning, a user with a
 * cast-built document learns their backup is unrestorable only at restore time.
 *
 * So anything not of the declared shape passes through untouched — the same defensive treatment
 * `hoursForCopy` gives an in-memory document, and for the same reason (R15-2).
 *
 * **A-21 (revision 16, QA R17-1):** `weekly` is read into a local **once**, so `Array.isArray`
 * and `.map` see the same value and an accessor property cannot produce `o.weekly.map is not a
 * function` out of an export. The rest of `toJSON` is deliberately out of scope, and the boundary
 * is principled rather than arbitrary: `toJSON` writes the user's own document back to the user,
 * so an unstable getter elsewhere in this file costs that caller their own data, crosses no
 * boundary and leaks to nobody. `place()`'s `p.at ? {lat: p.at.lat, …} : null` has the same shape
 * and is knowingly left; the day something other than a person's own hand builds a `Trip` in
 * memory — a native bridge, an ingest worker (§5.1) — is the trigger to sweep this file whole.
 */
function weeklyOut(w: unknown): unknown {
  if (w === null || typeof w !== 'object' || Array.isArray(w)) return w;
  const e = w as { day?: unknown; open?: unknown; close?: unknown };
  return omitUndef({ day: e.day, open: e.open, close: e.close });
}

function hours(h: Place['hours']): unknown {
  const raw = h as unknown;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const o = raw as { weekly?: unknown; note?: unknown };
  const weekly: unknown = o.weekly;              // A-21: one read; `Array.isArray` and `.map` see
  return omitUndef({                             // the same value, so an export cannot throw here.
    weekly: Array.isArray(weekly) ? weekly.map(weeklyOut) : weekly,
    note: o.note,
  });
}

function place(p: Place) {
  return omitUndef({
    id: p.id,
    cityKey: p.cityKey,
    name: p.name,
    at: p.at ? { lat: p.at.lat, lng: p.at.lng } : null,
    category: p.category,
    note: p.note,
    links: p.links ? p.links.map((l) => ({ label: l.label, href: l.href })) : undefined,
    hours: p.hours === undefined ? undefined : hours(p.hours),
  });
}

function stop(s: Stop) {
  return omitUndef({
    id: s.id,
    placement:
      s.placement.kind === 'scheduled'
        ? { kind: 'scheduled', dayId: s.placement.dayId, time: s.placement.time, order: s.placement.order }
        : omitUndef({
            kind: 'pool',
            cityKey: s.placement.cityKey,
            hint: s.placement.hint
              ? omitUndef({
                  dayId: s.placement.hint.dayId,
                  time: s.placement.hint.time,
                  order: s.placement.hint.order,
                })
              : undefined,
          }),
    name: s.name,
    category: s.category,
    place: s.place,
    note: s.note,
    cost: s.cost
      ? omitUndef({
          amounts: s.cost.amounts.map((a) => ({ lo: a.lo, hi: a.hi, currency: a.currency, basis: a.basis })),
          display: s.cost.display,
          note: s.cost.note,
        })
      : null,
    arrival: s.arrival ? omitUndef({ mode: s.arrival.mode, mins: s.arrival.mins, label: s.arrival.label }) : null,
    travelRole: s.travelRole,
    bookingId: s.bookingId,
    flags: s.flags,
    provenance: provenance(s.provenance),
    durationMins: s.durationMins,
    links: s.links ? s.links.map((l) => ({ label: l.label, href: l.href })) : undefined,
    ticket: s.ticket ?? undefined,
  });
}

function provenance(p: Stop['provenance']) {
  return omitUndef({
    source: p.source,
    state: p.state,
    confidence: p.confidence,
    origin: p.origin
      ? omitUndef({
          mailAccountId: p.origin.mailAccountId,
          messageId: p.origin.messageId,
          friendUserId: p.origin.friendUserId,
          sourceTripId: p.origin.sourceTripId,
          sourceStopId: p.origin.sourceStopId,
          ruleId: p.origin.ruleId,
        })
      : undefined,
    addedAt: p.addedAt,
    acceptedAt: p.acceptedAt,
    actorUserId: p.actorUserId,
  });
}

function day(d: Day) {
  return omitUndef({
    id: d.id,
    date: d.date,
    primaryCity: d.primaryCity,
    cities: d.cities,
    title: d.title,
    subtitle: d.subtitle,
    stops: d.stops.map(stop),
    provenance: provenance(d.provenance),
    legacyFlag: d.legacyFlag,
    tzId: d.tzId,
  });
}

function booking(b: Booking) {
  return omitUndef({
    id: b.id,
    tripId: b.tripId,
    kind: b.kind,
    operator: b.operator,
    reference: b.reference,
    route: b.route ? { fromName: b.route.fromName, toName: b.route.toName } : undefined,
    startsAt: { date: b.startsAt.date, time: b.startsAt.time },
    endsAt: b.endsAt ? { date: b.endsAt.date, time: b.endsAt.time } : undefined,
    price: b.price
      ? omitUndef({
          amounts: b.price.amounts.map((a) => ({ lo: a.lo, hi: a.hi, currency: a.currency, basis: a.basis })),
          display: b.price.display,
          note: b.price.note,
        })
      : null,
    party: b.party,
    seat: b.seat,
    status: b.status,
    supersedesId: b.supersedesId,
    issuedAt: b.issuedAt,
    ticket: b.ticket,
    provenance: provenance(b.provenance),
    sourceDoc: b.sourceDoc,
  });
}

/** The plain-object form of a trip, key order fixed. Pure. */
export function toDoc(trip: Trip): Record<string, unknown> {
  return omitUndef({
    schemaVersion: trip.schemaVersion,
    id: trip.id,
    title: trip.title,
    ownerId: trip.ownerId,
    startDate: trip.startDate,
    endDate: trip.endDate,
    // §8.1. Always written (never omitted): the default is total, so writing it keeps the
    // round trip byte-identical from the first save on rather than only from the second.
    datePrecision: trip.datePrecision,
    homeCurrency: trip.homeCurrency,
    homeBase: trip.homeBase ? { name: trip.homeBase.name, at: { lat: trip.homeBase.at.lat, lng: trip.homeBase.at.lng } } : null,
    party: { adults: trip.party.adults, children: trip.party.children },
    cities: trip.cities.map(city),
    days: trip.days.map(day),
    pool: trip.pool.map(stop),
    places: trip.places.map(place),
    bookings: trip.bookings.map(booking),
    resolutions: trip.resolutions.map((r) =>
      omitUndef({ conflictId: r.conflictId, state: r.state, by: r.by, at: r.at, note: r.note, retiredAt: r.retiredAt ?? null }),
    ),
    revision: trip.revision,
    meta: trip.meta,
  });
}

/** JSON text for a trip, stable and diffable. Pure. */
export function toJSON(trip: Trip, indent = 2): string {
  return JSON.stringify(toDoc(trip), null, indent);
}
