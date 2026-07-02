import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [method, setMethod] = useState('email'); // 'email' | 'phone'

  /* email flow */
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState(null);

  /* phone (SMS) flow */
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMethod = (m) => { setMethod(m); setError(''); setSent(false); setStep('request'); };

  const submitEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSent(true);
      if (data?.dev_reset_link) setDevLink(data.dev_reset_link);
    } catch (e) { setError(e.response?.data?.error || 'Une erreur est survenue.'); }
    finally { setLoading(false); }
  };

  const requestSms = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/forgot-password-sms', { phone });
      setStep('verify');
      if (data?.dev_code) setDevCode(data.dev_code);
    } catch (e) { setError(e.response?.data?.error || 'Une erreur est survenue.'); }
    finally { setLoading(false); }
  };

  const submitSms = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password-sms', { phone, code, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (e) { setError(e.response?.data?.error || 'Code invalide ou expiré.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-clay"><span className="text-white font-bold">K</span></div>
            <span className="font-display font-semibold text-2xl text-gray-900">Kri<span className="text-primary-500">Car</span></span>
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900 mt-6">Mot de passe oublié</h1>
          <p className="text-gray-500 text-sm mt-1.5">Réinitialisez votre mot de passe par email ou par SMS.</p>
        </div>

        <div className="card p-6 shadow-sm">
          {/* Method toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-5">
            {[['email', 'Par email'], ['phone', 'Par SMS']].map(([m, label]) => (
              <button key={m} onClick={() => switchMethod(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${method === m ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── EMAIL ── */}
          {method === 'email' && (sent ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-pine-50 text-pine-600 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-gray-700 font-medium">Si un compte existe pour cet email, un lien vient d'être envoyé.</p>
              <p className="text-gray-500 text-sm mt-1">Vérifiez vos spams. Le lien expire dans 1 heure.</p>
              {devLink && <a href={devLink} className="inline-block mt-4 text-sm font-medium text-primary-600 underline underline-offset-2 break-all">Lien de réinitialisation (mode test)</a>}
            </div>
          ) : (
            <form onSubmit={submitEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse email</label>
                <input type="email" className="input" required placeholder="vous@exemple.com" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? 'Envoi…' : 'Envoyer le lien'}</button>
            </form>
          ))}

          {/* ── SMS ── */}
          {method === 'phone' && (done ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-pine-50 text-pine-600 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-gray-700 font-medium">Mot de passe réinitialisé !</p>
              <p className="text-gray-500 text-sm mt-1">Redirection vers la connexion…</p>
            </div>
          ) : step === 'request' ? (
            <form onSubmit={requestSms} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro de téléphone</label>
                <input type="tel" className="input" required placeholder="05XX XXX XXX" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Le numéro utilisé lors de votre inscription.</p>
              </div>
              {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? 'Envoi…' : 'Recevoir le code par SMS'}</button>
            </form>
          ) : (
            <form onSubmit={submitSms} className="space-y-4">
              <p className="text-sm text-gray-600">Un code à 6 chiffres a été envoyé au <span className="font-medium">{phone}</span>.</p>
              {devCode && <div className="bg-honey-50 border border-honey-100 text-honey-800 text-sm px-4 py-2.5 rounded-xl">Code (mode test) : <span className="font-mono font-bold tracking-widest">{devCode}</span></div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Code de vérification</label>
                <input type="text" inputMode="numeric" maxLength={6} className="input tracking-[0.4em] text-center font-mono text-lg" required placeholder="000000" dir="ltr"
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
                <input type="password" className="input" required minLength={8} placeholder="••••••••" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                <input type="password" className="input" required minLength={8} placeholder="••••••••" dir="ltr" value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}</button>
              <button type="button" onClick={() => { setStep('request'); setError(''); }} className="w-full text-sm text-gray-500 hover:text-gray-700">← Changer de numéro</button>
            </form>
          ))}

          <div className="mt-5 text-center text-sm text-gray-500">
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">← Retour à la connexion</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
