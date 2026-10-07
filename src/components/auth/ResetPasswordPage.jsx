import { useState } from 'react'
import { Check, Flame, Lock } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { authClient } from '../../lib/auth-client.js'

/** Reads what Better Auth appended when it redirected back from the email. */
export function readResetParams() {
  const params = new URLSearchParams(window.location.search)
  return { token: params.get('token') || '', error: params.get('error') || '' }
}

/** The page the reset email links to: choose a new password. */
export default function ResetPasswordPage() {
  const { t, language, changeLanguage } = useI18n()
  const [{ token, error: linkError }] = useState(readResetParams)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const linkInvalid = !token || Boolean(linkError)
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = !linkInvalid && password.length >= 8 && password === confirm && !busy

  async function submit(event) {
    event.preventDefault()
    if (password !== confirm) return setError(t.passwordsDiffer)
    setBusy(true)
    setError('')
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result?.error) setError(result.error.message || t.resetInvalid)
      else setDone(true)
    } catch {
      setError(t.resetInvalid)
    } finally {
      setBusy(false)
    }
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

      {linkInvalid ? <>
        <h1 id="login-title">{t.resetInvalidTitle}<span>.</span></h1>
        <p>{t.resetInvalid}</p>
        <a className="submit-button login-link-button" href="/">{t.requestNewLink}</a>
      </> : done ? <>
        <h1 id="login-title">{t.resetDoneTitle}<span>.</span></h1>
        <p>{t.resetDone}</p>
        <a className="submit-button login-link-button" href="/">{t.backToSignIn}</a>
      </> : <>
        <h1 id="login-title">{t.resetTitle}<span>.</span></h1>
        <p>{t.resetSubtitle}</p>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="reset-password">{t.newPassword}</label>
          <div className="login-input"><Lock size={16} /><input id="reset-password" type="password" autoFocus autoComplete="new-password" placeholder={t.passwordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <label className="field-label" htmlFor="reset-confirm">{t.confirmPassword}</label>
          <div className="login-input"><Lock size={16} /><input id="reset-confirm" type="password" autoComplete="new-password" placeholder={t.passwordPlaceholder} value={confirm} onChange={(event) => setConfirm(event.target.value)} /></div>
          <p className="login-hint">{t.passwordHint}</p>
          {mismatch && <p className="form-error">{t.passwordsDiffer}</p>}
          {error && <p className="form-error">{error}</p>}
          <button className="submit-button" type="submit" disabled={!canSubmit}>{busy ? t.loading : <><Check size={15} /> {t.resetSubmit}</>}</button>
        </form>
        <a className="login-toggle" href="/">{t.backToSignIn}</a>
      </>}
    </section>
  </div>
}
