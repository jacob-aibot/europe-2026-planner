import { useState } from 'react';
import type { LocalIdentityV1 } from '../localIdentity.ts';

export function ProfileSetup({ identity, onSave, onCancel, headingLevel = 'h2' }: {
  identity: LocalIdentityV1;
  onSave: (next: LocalIdentityV1) => boolean;
  onCancel: () => void;
  headingLevel?: 'h1' | 'h2';
}) {
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [homeCity, setHomeCity] = useState(identity.homeCity);
  const [bio, setBio] = useState(identity.bio);
  const [failed, setFailed] = useState(false);
  const Heading = headingLevel;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) return;
    setFailed(!onSave({ version: 1, displayName, homeCity, bio, welcomeDismissed: true }));
  };
  return <form className="identity-form" onSubmit={submit} aria-label="Set up your profile">
    <div className="identity-form__intro"><Heading>Make Cairn feel like yours.</Heading><p>This is a small personal profile, stored only in this browser.</p></div>
    <label>Your name<input autoFocus required maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jacob Miller" /></label>
    <label>Home city <span>optional</span><input maxLength={120} value={homeCity} onChange={(e) => setHomeCity(e.target.value)} placeholder="Phoenix, Arizona" /></label>
    <label>A little about you <span>optional</span><textarea maxLength={240} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="The places, food, landscapes or stories you travel for." /></label>
    <p className="local-note">Stored on this device. This is not an account and is not included in trip backups.</p>
    {failed && <p role="alert">Your profile could not be saved. Your changes are still here; try saving again.</p>}
    <div className="first-run__buttons"><button className="world-primary" type="submit" disabled={!displayName.trim()}>Save my profile</button><button className="world-text-button" type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}
