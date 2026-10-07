import { initialsForName } from '../../lib/image.js'
import AnimalAvatar, { animalId } from './AnimalAvatar.jsx'

export default function Avatar({ profile, className = 'avatar' }) {
  const avatar = profile?.avatar
  const animal = animalId(avatar)
  if (animal) return <span className={`${className} avatar-animal`} role="img" aria-label={profile?.name || 'Profile'}><AnimalAvatar id={animal} /></span>
  if (avatar) return <span className={`${className} avatar-photo`} style={{ backgroundImage: `url(${avatar})` }} role="img" aria-label={profile?.name || 'Profile'} />
  return <span className={className}>{initialsForName(profile?.name || '')}</span>
}
