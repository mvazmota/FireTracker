import { useState } from 'react'
import { Flame, Lock, User } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'

/**
 * Non-functional sign-in screen. No credentials are checked — submitting
 * simply calls `onLogin`, which reveals the app.
 */
export default function LoginPage({ onLogin }) {
  const { t, language, changeLanguage } = useI18n()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function submit(event) {
    event.preventDefault()
    onLogin(username.trim())
  }

  return <div className="login-page">
    <div className="login-language">
      <div className="language-switch" role="group" aria-label={t.language}>
        <button type="button" className={language === 'en' ? 'language-option selected-language' : 'language-option'} aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>EN</button>
        <button type="button" className={language === 'pt' ? 'language-option selected-language' : 'language-option'} aria-pressed={language === 'pt'} onClick={() => changeLanguage('pt')}>PT-PT</button>
      </div>
    </div>

    <section className="login-card" aria-labelledby="login-title">
      <span className="login-brand-mark"><Flame size={22} fill="currentColor" /></span>
      <h1 id="login-title">{t.loginTitle}<span>.</span></h1>
      <p>{t.loginSubtitle}</p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="login-username">{t.username}</label>
        <div className="login-input"><User size={16} /><input id="login-username" autoFocus autoComplete="username" placeholder={t.usernamePlaceholder} value={username} onChange={(event) => setUsername(event.target.value)} /></div>
        <label className="field-label" htmlFor="login-password">{t.password}</label>
        <div className="login-input"><Lock size={16} /><input id="login-password" type="password" autoComplete="current-password" placeholder={t.passwordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        <button className="submit-button" type="submit">{t.login}</button>
      </form>
      <p className="login-note">{t.loginNote}</p>
    </section>
  </div>
}
