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

function place(p: Place) {
  return omitUndef({
    id: p.id,
    cityKey: p.cityKey,
    name: p.name,
    at: p.at ? { lat: p.at.lat, lng: p.at.lng } : null,
    category: p.category,
    note: p.note,
    links: p.links ? p.links.map((l) => ({ label: l.label, href: l.href })) : undefined,
    hours: p.hours,
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
