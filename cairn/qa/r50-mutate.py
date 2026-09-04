#!/usr/bin/env python3
"""QA round 50 — the source mutants `qa/r50-recut-vacuity.sh` injects.

One file rather than five heredocs, because a heredoc nested inside another heredoc is how a
control script quietly stops running the mutant it claims to run — which is R49-2's shape in the
control layer.

    python3 qa/r50-mutate.py <mutant> <path-to-store.ts>

Every mutant asserts its anchor and exits non-zero if it cannot find it, so a mutant that no longer
applies is loud rather than a probe that came out green for free.
"""
import sys


def nest_supersede(s: str) -> str:
    """A-68 Part 5a undone: `removePhoto`'s hoisted `supersede` goes back inside R45-4's value
    guard, which is R48-1's own defect and A-69 Part 6 item 2's explicit warning."""
    i = s.index('async removePhoto(photoId: string)')
    head, tail = s[:i], s[i:]
    sup = "          guard.supersede('photoAvailability');\n"
    guard = "          if (state.photos.available !== null) {\n"
    assert sup in tail, 'no hoisted supersede in removePhoto'
    assert guard in tail, "no R45-4 value guard in removePhoto"
    tail = tail.replace(sup, '', 1)
    tail = tail.replace(guard, guard + "            guard.supersede('photoAvailability');\n", 1)
    return head + tail


def skip_one_method(s: str) -> str:
    """A method added carelessly, outside the settling boundary — the hazard site S1 exists for."""
    old = "      if (typeof value !== 'function') { out[key] = value; continue; }"
    assert old in s, "could not find `settling`'s type test"
    return s.replace(old, old + "\n      if (key === 'importPhotos') { out[key] = value; continue; }", 1)


def restore_conjunct(s: str) -> str:
    """A-70 Part 6 G26's published fault: the second disjunct deleted, i.e. A-69's predicate."""
    old = "    return !guard.current('photoAvailability', availabilityAt);"
    assert old in s, 'could not find the A-70 disjunct'
    return s.replace(old, "    return false;   // A-69's predicate: `availabilityError === null` as a conjunct", 1)


def fourth_writer(s: str) -> str:
    """A fourth incremental writer of the availability triple, outside `setAvailability`."""
    old = "      if (state.photos.failures.length > 0) setPhotos({ failures: [] });"
    assert old in s, 'could not find dismissPhotoFailures'
    return s.replace(old, old + "\n      set({ ...state, photos: { ...state.photos, available: null, availabilityError: null } });", 1)


MUTANTS = {
    'nest-supersede': nest_supersede,
    'skip-one-method': skip_one_method,
    'restore-conjunct': restore_conjunct,
    'fourth-writer': fourth_writer,
}

if __name__ == '__main__':
    name, path = sys.argv[1], sys.argv[2]
    src = open(path).read()
    out = MUTANTS[name](src)
    assert out != src, f'mutant {name} changed nothing'
    open(path, 'w').write(out)
