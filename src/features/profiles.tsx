import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PROFILES, otherProfile, profileName, type ProfileId } from '../domain/types';
import { updateSettings } from '../db/repo';
import { Button, PixelHeart, Sheet, haptic } from '../ui/components';

/**
 * Profils : Zizou (vert) et Zuzu (rose), et personne d'autre.
 * Le profil est choisi une fois pour toutes sur chaque téléphone : chacun ne saisit
 * que ses propres dépenses, celles de l'autre n'arrivent que par import.
 */

export const PROFILE_COLORS: Record<ProfileId, string> = {
  zizou: 'var(--accent)',
  zuzu: 'var(--pink)',
};

/** Petite pastille au nom de la personne. */
export function ProfileTag({ profile }: { profile: ProfileId }) {
  return (
    <span className="profile-tag" style={{ background: PROFILE_COLORS[profile] }}>
      {profileName(profile)}
    </span>
  );
}

/** Choix entre les deux profils, sous forme de pastilles. */
export function ProfilePicker({
  value,
  onChange,
  label,
}: {
  value: ProfileId | undefined;
  onChange: (p: ProfileId) => void;
  label: string;
}) {
  return (
    <div className="row" role="group" aria-label={label} style={{ gap: 10 }}>
      {PROFILES.map((p) => (
        <button
          key={p.id}
          type="button"
          className="chip chip--pastel profile-chip"
          style={{ background: PROFILE_COLORS[p.id] }}
          aria-pressed={value === p.id}
          onClick={() => {
            haptic(5);
            onChange(p.id);
          }}
        >
          <span className="profile-avatar" aria-hidden="true">{p.name.slice(0, 2)}</span>
          {p.name}
        </button>
      ))}
    </div>
  );
}

/**
 * Au premier lancement : « Qui utilise ce téléphone ? », puis confirmation,
 * car le choix est définitif.
 */
export function ProfileOnboarding({ open }: { open: boolean }) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<ProfileId | undefined>();

  return (
    <Sheet open={open} onClose={() => {}} title={t('profile.welcome')} dismissible={false}>
      <p style={{ marginTop: 0 }}>{t('profile.question')}</p>
      <ProfilePicker value={choice} label={t('profile.label')} onChange={setChoice} />
      {choice ? (
        <div className="notice row" style={{ alignItems: 'flex-start', marginTop: 16 }}>
          <PixelHeart size={24} />
          <p className="grow" style={{ margin: 0 }}>
            {t('profile.confirmText', { name: profileName(choice), other: profileName(otherProfile(choice)) })}
          </p>
        </div>
      ) : (
        <p className="hint">{t('profile.hint')}</p>
      )}
      <Button variant="primary" block style={{ marginTop: 16 }} disabled={!choice} onClick={() => choice && void updateSettings({ profile: choice })}>
        {choice ? t('profile.confirm', { name: profileName(choice) }) : t('profile.pick')}
      </Button>
    </Sheet>
  );
}
