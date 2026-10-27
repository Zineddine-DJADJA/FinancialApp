import { useTranslation } from 'react-i18next';
import { PROFILES, profileName, type ProfileId } from '../domain/types';
import { updateSettings } from '../db/repo';
import { Sheet, haptic } from '../ui/components';

/**
 * Profils : Zizou (vert) et Zuzu (rose), et personne d'autre.
 * Le profil du téléphone est proposé par défaut à chaque saisie.
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

/** Au premier lancement : « Qui utilise ce téléphone ? ». */
export function ProfileOnboarding({ open }: { open: boolean }) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onClose={() => {}} title={t('profile.welcome')} dismissible={false}>
      <p style={{ marginTop: 0 }}>{t('profile.question')}</p>
      <ProfilePicker value={undefined} label={t('profile.label')} onChange={(profile) => void updateSettings({ profile })} />
      <p className="hint">{t('profile.hint')}</p>
    </Sheet>
  );
}
