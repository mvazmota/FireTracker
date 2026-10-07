import { useState } from 'react'
import { Flame, Lock, Mail, User } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useAuth } from '../../context/AuthProvider.jsx'
import { REMEMBERED_EMAIL_KEY } from '../../lib/constants.js'

/** The email saved by "remember me" on this browser, if any. */
function readRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || ''
  } catch {
    return ''
  }
}

/** Sign-in / sign-up screen backed by Better Auth (email + password). */
export default function LoginPage() {
  const { t, language, changeLanguage } = useI18n()
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signIn')
  const [name, setName] = useState('')
  // Prefilled from a previous "remember me" when signing in — never for a new account.
  const [rememberedEmail] = useState(readRememberedEmail)
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => Boolean(rememberedEmail))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isSignUp = mode === 'signUp'

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = isSignUp ? await signUp(name.trim(), email.trim(), password) : await signIn(email.trim(), password)
      if (result?.error) {
        setError(result.error.message || t.authError)
      } else if (!isSignUp) {
        // Signing up never touches the remembered address.
        try {
          if (remember) localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim())
          else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
        } catch {
          // Remembering the email is a convenience; ignore storage failures.
        }
      }
    } catch {
      setError(t.authError)
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    const nextIsSignUp = !isSignUp
    setMode(nextIsSignUp ? 'signUp' : 'signIn')
    setError('')
    // A new account must not inherit the remembered address.
    setEmail(nextIsSignUp ? '' : rememberedEmail)
  }

  return <div className="login-page">
    <div className="login-language">
      <div className="language-switch" role="group" aria-label={t.language}>
        <button type="button" className={language === 'en' ? 'language-option selected-language' : 'language-option'} aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>EN</button>
        <button type="button" className={language === 'pt' ? 'language-option selected-language' : 'language-option'} aria-pressed={language === 'pt'} onClick={() => changeLanguage('pt')} aria-label="Português (Portugal)" title="Português (Portugal)">PT</button>
      </div>
    </div>

    <section className="login-card" aria-labelledby="login-title">
      <span className="login-brand-mark"><Flame size={22} fill="currentColor" /></span>
      <h1 id="login-title">{isSignUp ? t.signUp : t.loginTitle}<span>.</span></h1>
      <p>{t.loginSubtitle}</p>
      <form onSubmit={submit}>
        {isSignUp && <>
          <label className="field-label" htmlFor="login-name">{t.yourName}</label>
          <div className="login-input"><User size={16} /><input id="login-name" autoComplete="name" placeholder={t.namePlaceholder} value={name} onChange={(event) => setName(event.target.value)} /></div>
        </>}
        <label className="field-label" htmlFor="login-email">{t.email}</label>
        <div className="login-input"><Mail size={16} /><input id="login-email" type="email" autoFocus autoComplete="email" placeholder={t.emailPlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        <label className="field-label" htmlFor="login-password">{t.password}</label>
        <div className="login-input"><Lock size={16} /><input id="login-password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder={t.passwordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        {isSignUp && <p className="login-hint">{t.passwordHint}</p>}
        {error && <p className="form-error">{error}</p>}
        <button className="submit-button" type="submit" disabled={busy}>{busy ? t.loading : isSignUp ? t.signUp : t.login}</button>
        {!isSignUp && <label className="remember-toggle">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          <span className="remember-box" aria-hidden="true" />
          <span>{t.rememberMe}</span>
        </label>}
      </form>
      <button type="button" className="login-toggle" onClick={switchMode}>{isSignUp ? t.toggleToSignIn : t.toggleToSignUp}</button>
    </section>
  </div>
}
