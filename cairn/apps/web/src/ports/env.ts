/**
 * The two ports that exist purely so core and the reducer never read ambient state.
 * `Date` and `crypto` are called HERE and nowhere below this line — that is what keeps the
 * golden files meaningful (ROADMAP, "no Date.now(), Math.random() or crypto.randomUUID()
 * inside core or the reducer").
 */
import type { ClockPort, IdPort } from '@cairn/client';

/** Impure by definition: reads the system clock. Local date, not UTC — §2.1 is wall-clock. */
export function systemClock(): ClockPort {
  return {
    today() {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    },
  };
}

/** Impure by definition: reads the platform RNG. */
export function browserIds(): IdPort {
  return {
    newId(kind: string) {
      const uuid =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      return `${kind}_${uuid.replace(/-/g, '').slice(0, 12)}`;
    },
  };
}
