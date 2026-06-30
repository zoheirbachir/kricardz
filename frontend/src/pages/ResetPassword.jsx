import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (e) {
      setError(e.response?.data?.error || 'Lien invalide ou expiré.');
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
          <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900 mt-6">Nouveau mot de passe</h1>
          <p className="text-gray-500 text-sm mt-1.5">Choisissez un nouveau mot de passe sécurisé.</p>
        </div>

        <div className="card p-6 shadow-sm">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-pine-50 text-pine-600 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-gray-700 font-medium">Mot de passe réinitialisé !</p>
              <p className="text-gray-500 text-sm mt-1">Redirection vers la connexion…</p>
            </div>
          ) : !token ? (
            <p className="text-center text-gray-500">Lien invalide. <Link to="/forgot-password" className="text-primary-600 font-semibold">Refaire une demande</Link></p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
                <input type="password" className="input" required minLength={8} placeholder="••••••••" dir="ltr"
                  value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                <input type="password" className="input" required minLength={8} placeholder="••••••••" dir="ltr"
                  value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
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
