import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSent(true);
      if (data?.dev_reset_link) setDevLink(data.dev_reset_link);
    } catch (e) {
      setError(e.response?.data?.error || 'Une erreur est survenue.');
    } finally { setLoading(false); }
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
          <p className="text-gray-500 text-sm mt-1.5">Saisissez votre email pour recevoir un lien de réinitialisation.</p>
        </div>

        <div className="card p-6 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-pine-50 text-pine-600 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-gray-700 font-medium">Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.</p>
              <p className="text-gray-500 text-sm mt-1">Pensez à vérifier vos spams. Le lien expire dans 1 heure.</p>
              {devLink && (
                <a href={devLink} className="inline-block mt-4 text-sm font-medium text-primary-600 underline underline-offset-2 break-all">
                  Lien de réinitialisation (mode test)
                </a>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse email</label>
                <input type="email" className="input" required placeholder="vous@exemple.com" dir="ltr"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          )}
          <div className="mt-5 text-center text-sm text-gray-500">
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">← Retour à la connexion</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
