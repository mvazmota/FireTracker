import { initialsForName } from '../../lib/image.js'

export default function Avatar({ profile, className = 'avatar' }) {
  if (profile?.avatar) return <span className={`${className} avatar-photo`} style={{ backgroundImage: `url(${profile.avatar})` }} role="img" aria-label={profile.name || 'Profile'} />
  return <span className={className}>{initialsForName(profile?.name || '')}</span>
}
