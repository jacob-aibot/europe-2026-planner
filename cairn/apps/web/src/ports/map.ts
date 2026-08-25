/**
 * `MapPort` over Leaflet.
 *
 * This file is where CLAUDE.md's two shipped map bugs are made structurally impossible:
 *
 *  1. **Leaflet cannot fit a hidden container.** Given a `display:none` element it computes
 *     a nonsense zoom and never recovers — that is how the Aug 8 map once opened onto empty
 *     Bavarian farmland. So `setVisible(handle, true)` re-fits, `mount` refuses to fit while
 *     the container has zero size, and a `ResizeObserver` fits the moment it gains one. The
 *     pending-fit flag is what makes a mount-while-hidden recoverable rather than permanent.
 *
 *  2. **A day spanning two cities must not fit the whole rectangle.** That decision is not
 *     made here. Core's `focusCluster` and `fitSpanKm` produce the bounds and the port only
 *     applies them — §4.4, "the client never computes bounds".
 */
import L from 'leaflet';
import type { MapBoundsLike, MapHandle, MapPoint, MapPort } from '@cairn/client';
import { COLORS } from '@cairn/tokens';

type Entry = {
  map: L.Map;
  layer: L.LayerGroup;
  el: HTMLElement;
  bounds: MapBoundsLike;
  observer: ResizeObserver;
  /** A fit was asked for while the container had no size; apply it when one appears. */
  pendingFit: boolean;
};

const entries = new Map<string, Entry>();
let seq = 0;

const hasSize = (el: HTMLElement) => el.offsetWidth > 0 && el.offsetHeight > 0;

function toLatLngBounds(b: MapBoundsLike): L.LatLngBounds {
  return L.latLngBounds([b.south, b.west], [b.north, b.east]);
}

function fit(entry: Entry): void {
  const { map, el, bounds } = entry;
  if (!hasSize(el)) {
    entry.pendingFit = true;
    return;
  }
  entry.pendingFit = false;
  map.invalidateSize({ animate: false });
  if (bounds.empty) {
    map.setView([bounds.centre.lat, bounds.centre.lng], 12, { animate: false });
    return;
  }
  map.fitBounds(toLatLngBounds(bounds), { padding: [28, 28], animate: false, maxZoom: 16 });
}

function marker(p: MapPoint, index: number): L.Marker {
  const color = COLORS[p.category] ?? '#5c6570';
  const icon = L.divIcon({
    className: 'cairn-pin',
    html:
      `<span class="cairn-pin__dot" style="background:${color}">${index + 1}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
  return L.marker([p.lat, p.lng], { icon, title: p.label, keyboard: true, alt: p.label });
}

function draw(entry: Entry, points: MapPoint[]): void {
  entry.layer.clearLayers();
  const latlngs: L.LatLngExpression[] = [];
  points.forEach((p, i) => {
    latlngs.push([p.lat, p.lng]);
    marker(p, i).bindTooltip(`${i + 1}. ${p.label}`, { direction: 'top' }).addTo(entry.layer);
  });
  if (latlngs.length > 1) {
    L.polyline(latlngs, { color: '#5c6570', weight: 2, opacity: 0.55, dashArray: '5 6' }).addTo(entry.layer);
  }
}

/** Impure: owns Leaflet map instances keyed by handle id. */
export function leafletMap(): MapPort {
  return {
    mount(el: unknown, points: MapPoint[], bounds: MapBoundsLike): MapHandle {
      const node = el as HTMLElement;
      const id = `map-${++seq}`;
      const map = L.map(node, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      const layer = L.layerGroup().addTo(map);

      const entry: Entry = { map, layer, el: node, bounds, observer: null as unknown as ResizeObserver, pendingFit: false };
      entry.observer = new ResizeObserver(() => {
        if (entry.pendingFit && hasSize(node)) fit(entry);
        else if (hasSize(node)) map.invalidateSize({ animate: false });
      });
      entry.observer.observe(node);
      entries.set(id, entry);

      draw(entry, points);
      fit(entry);
      return { id };
    },

    update(handle: MapHandle, points: MapPoint[], bounds: MapBoundsLike): void {
      const entry = entries.get(handle.id);
      if (!entry) return;
      entry.bounds = bounds;
      draw(entry, points);
      fit(entry);
    },

    refit(handle: MapHandle, bounds: MapBoundsLike): void {
      const entry = entries.get(handle.id);
      if (!entry) return;
      entry.bounds = bounds;
      fit(entry);
    },

    /** MUST no-op while the container has zero size and re-fit when it gains one — §4.4. */
    setVisible(handle: MapHandle, visible: boolean): void {
      const entry = entries.get(handle.id);
      if (!entry) return;
      if (!visible) return;
      fit(entry);
    },

    destroy(handle: MapHandle): void {
      const entry = entries.get(handle.id);
      if (!entry) return;
      entry.observer.disconnect();
      entry.map.remove();
      entries.delete(handle.id);
    },
  };
}
