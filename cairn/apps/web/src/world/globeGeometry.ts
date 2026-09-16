/** Web-only spherical rendering. Pure; never changes Cairn's attribution geometry. */
import { geoArea, geoOrthographic, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import type { CountryIndex } from '@cairn/core';

export type GlobePose = { longitude: number; latitude: number; zoom: number };
export const INITIAL_POSE: GlobePose = { longitude: 12, latitude: 24, zoom: 1 };
export const GLOBE_RADIUS = 174;
export const GLOBE_SIZE = 390;

/** Clamp tilt/scale and wrap longitude; callers only supply finite interaction values. */
export function constrainPose(pose: GlobePose): GlobePose {
  return {
    longitude: ((pose.longitude + 180) % 360 + 360) % 360 - 180,
    latitude: Math.max(-70, Math.min(70, pose.latitude)),
    zoom: Math.max(1, Math.min(2.8, pose.zoom)),
  };
}

export function globeProjection(pose: GlobePose) {
  const p = constrainPose(pose);
  return geoOrthographic().rotate([-p.longitude, -p.latitude, 0])
    .translate([GLOBE_SIZE / 2, GLOBE_SIZE / 2])
    .scale(GLOBE_RADIUS * p.zoom).clipAngle(90).precision(0.5);
}

export type GlobeShape = { code: string; key: string; geometry: GeoPermissibleObjects };

/**
 * Every index entry keeps its own even-odd rings (including holes). Entries sharing a code
 * remain separate, preserving the index's union, and smaller entries paint last. D3's spherical
 * winding is normalized per ring on COPIES; SVG evenodd composes the rings just as the atlas does.
 */
export function globeShapes(index: CountryIndex): GlobeShape[] {
  return index.countries.map((entry, index) => ({
    code: entry.code,
    key: `${entry.code}-${index}`,
    geometry: {
      type: 'GeometryCollection' as const,
      geometries: entry.rings.map((ring) => {
        const coordinates: number[][] = [];
        for (let i = 0; i < ring.length; i += 2) coordinates.push([ring[i], ring[i + 1]]);
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        if (first && (first[0] !== last[0] || first[1] !== last[1])) coordinates.push([...first]);
        const polygon = { type: 'Polygon' as const, coordinates: [coordinates] };
        if (geoArea(polygon) > 2 * Math.PI) coordinates.reverse();
        return polygon;
      }),
    },
  })).reverse();
}

export function globePaths(shapes: GlobeShape[], pose: GlobePose) {
  const path = geoPath(globeProjection(pose));
  return shapes.map((shape) => ({ code: shape.code, key: shape.key, d: path(shape.geometry) ?? '' }));
}
