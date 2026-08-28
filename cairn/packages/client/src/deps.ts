/**
 * The ONLY place `packages/client` reaches into `packages/core`.
 *
 * Imported by relative path rather than by package name so that `node --test` runs the
 * client's `.ts` files with no install step, no build and no path mapping — which is the
 * property the roadmap asks for ("attackable in plain Node").
 *
 * Dependency direction: client → core. Never the other way, and never client → web/mobile.
 */
export * from '../../core/src/index.ts';
