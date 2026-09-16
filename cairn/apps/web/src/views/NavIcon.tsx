export function NavIcon({ kind }: { kind: 'map' | 'trips' | 'profile' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
    {kind === 'map' ? <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/></>
      : kind === 'trips' ? <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16"/></>
      : <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>}
  </svg>;
}
