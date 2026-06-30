import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Lien invalide.'); return; }
    api.post('/auth/verify-email', { token })
      .then(() => {
        setStatus('ok');
        sessionStorage.removeItem('kc_dev_verify_link');
        refreshUser();
      })
      .catch(e => { setStatus('error'); setMessage(e.response?.data?.error || 'Lien invalide ou expiré.'); });
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center card p-8">
        {status === 'loading' && <p className="text-gray-400">Confirmation en cours…</p>}
        {status === 'ok' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pine-50 text-pine-600 flex items-center justify-center">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="font-display text-2xl font-semibold text-gray-900">Email confirmé !</h1>
            <p className="text-gray-500 text-sm mt-1">Votre adresse email a bien été vérifiée. Votre compte est maintenant pleinement actif.</p>
            <Link to="/dashboard" className="btn-primary mt-6 inline-flex">Aller au tableau de bord</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h1 className="font-display text-2xl font-semibold text-gray-900">Confirmation impossible</h1>
            <p className="text-gray-500 text-sm mt-1">{message}</p>
            <Link to="/dashboard" className="btn-secondary mt-6 inline-flex">Retour</Link>
          </>
        )}
      </div>
    </div>
  );
}
