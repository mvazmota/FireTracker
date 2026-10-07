import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
export default function PlatformSelector({ id, label, value, onChange }) {
  const { platforms } = useSettings()
  const { t, locale, language } = useI18n()
  const [creating, setCreating] = useState(false)
  const extra = value && !platforms.includes(value) ? [value] : []
  if (creating) return <div className="platform-field"><label className="field-label" htmlFor={`${id}-custom`}>{label}</label><div className="platform-add-row"><input className="platform-custom-input" id={`${id}-custom`} autoFocus placeholder={t.platformPlaceholder} value={value} onChange={(event) => onChange(event.target.value)} /><button className="icon-button" type="button" onClick={() => { setCreating(false); onChange('') }} aria-label={t.noPlatform}><X size={16} /></button></div></div>
  return <div className="platform-field"><label className="field-label" htmlFor={id}>{label}</label><div className="select-wrap"><select id={id} value={value} onChange={(event) => { if (event.target.value === '__add_platform__') { setCreating(true); onChange('') } else onChange(event.target.value) }}><option value="">{t.noPlatform}</option>{extra.map((platform) => <option key={platform} value={platform}>{platform}</option>)}{platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}<option value="__add_platform__">{t.addPlatform}</option></select><ChevronDown size={16} /></div></div>
}
