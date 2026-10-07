/**
 * A small set of minimal, flat animal avatars.
 *
 * A chosen preset is stored on the profile as the compact string
 * `animal:<id>`, so it stays tiny next to an uploaded photo data URL. Each
 * artwork is full-bleed; the surrounding element clips it to a circle.
 */

export const ANIMAL_PRESETS = ['fox', 'cat', 'owl', 'panda', 'bear', 'penguin']

const PREFIX = 'animal:'

export function isAnimalAvatar(value) {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export function animalId(value) {
  return isAnimalAvatar(value) ? value.slice(PREFIX.length) : null
}

export function animalAvatarValue(id) {
  return `${PREFIX}${id}`
}

const ART = {
  fox: <>
    <rect width="64" height="64" fill="#f0a35e" />
    <path d="M13 27 L9 9 L27 17 Z" fill="#dd7f3c" />
    <path d="M51 27 L55 9 L37 17 Z" fill="#dd7f3c" />
    <ellipse cx="32" cy="37" rx="18" ry="17" fill="#fbe7d2" />
    <circle cx="25" cy="33" r="2.7" fill="#3b2a1f" />
    <circle cx="39" cy="33" r="2.7" fill="#3b2a1f" />
    <path d="M32 41 l-3.2 3.2 h6.4 Z" fill="#3b2a1f" />
  </>,
  cat: <>
    <rect width="64" height="64" fill="#8fb8d6" />
    <path d="M14 26 L12 8 L29 17 Z" fill="#6d9cbe" />
    <path d="M50 26 L52 8 L35 17 Z" fill="#6d9cbe" />
    <ellipse cx="32" cy="37" rx="18" ry="17" fill="#eef5fa" />
    <circle cx="25" cy="33" r="2.7" fill="#31465a" />
    <circle cx="39" cy="33" r="2.7" fill="#31465a" />
    <path d="M32 40 l-2.6 2.8 h5.2 Z" fill="#e07f9a" />
  </>,
  owl: <>
    <rect width="64" height="64" fill="#a894d6" />
    <path d="M14 22 L10 8 L24 15 Z" fill="#8a74c0" />
    <path d="M50 22 L54 8 L40 15 Z" fill="#8a74c0" />
    <circle cx="32" cy="36" r="18" fill="#f2edff" />
    <circle cx="24" cy="33" r="7" fill="#ffffff" />
    <circle cx="40" cy="33" r="7" fill="#ffffff" />
    <circle cx="24" cy="33" r="3.2" fill="#3a2f52" />
    <circle cx="40" cy="33" r="3.2" fill="#3a2f52" />
    <path d="M32 39 l-3 4 h6 Z" fill="#f0b45e" />
  </>,
  panda: <>
    <rect width="64" height="64" fill="#eef1f4" />
    <circle cx="15" cy="16" r="8" fill="#2f3437" />
    <circle cx="49" cy="16" r="8" fill="#2f3437" />
    <circle cx="32" cy="36" r="18" fill="#ffffff" />
    <ellipse cx="23" cy="34" rx="6.5" ry="8" fill="#2f3437" transform="rotate(-18 23 34)" />
    <ellipse cx="41" cy="34" rx="6.5" ry="8" fill="#2f3437" transform="rotate(18 41 34)" />
    <circle cx="23" cy="34" r="2.6" fill="#ffffff" />
    <circle cx="41" cy="34" r="2.6" fill="#ffffff" />
    <ellipse cx="32" cy="45" rx="3.4" ry="2.4" fill="#2f3437" />
  </>,
  bear: <>
    <rect width="64" height="64" fill="#b98b63" />
    <circle cx="15" cy="16" r="8" fill="#96694a" />
    <circle cx="49" cy="16" r="8" fill="#96694a" />
    <circle cx="32" cy="36" r="18" fill="#c99a70" />
    <ellipse cx="32" cy="43" rx="10" ry="7.5" fill="#ecd6bd" />
    <circle cx="24" cy="32" r="2.7" fill="#3f2d20" />
    <circle cx="40" cy="32" r="2.7" fill="#3f2d20" />
    <ellipse cx="32" cy="41" rx="3.2" ry="2.4" fill="#3f2d20" />
  </>,
  penguin: <>
    <rect width="64" height="64" fill="#6b7fa8" />
    <ellipse cx="32" cy="34" rx="18" ry="19" fill="#f4f7fa" />
    <circle cx="25" cy="30" r="2.8" fill="#2b3346" />
    <circle cx="39" cy="30" r="2.8" fill="#2b3346" />
    <path d="M32 36 l-4 4.5 h8 Z" fill="#f2a04a" />
  </>,
}

export default function AnimalAvatar({ id, className = '' }) {
  const art = ART[id]
  if (!art) return null
  return (
    <svg className={`animal-avatar ${className}`.trim()} viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" focusable="false">
      {art}
    </svg>
  )
}
