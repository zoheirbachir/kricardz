import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

/* Shown to a logged-in user whose email isn't confirmed yet. */
export default function EmailVerifyBanner() {
  const { user } = useAuth();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const devLink = sessionStorage.getItem('kc_dev_verify_link');

  if (!user || user.email_verified) return null;

  const resend = async () => {
    setSending(true);
    try {
      const { data } = await api.post('/auth/resend-verification', { email: user.email });
      if (data?.dev_verify_link) sessionStorage.setItem('kc_dev_verify_link', data.dev_verify_link);
      toast({ type: 'success', message: 'Email de confirmation renvoyé. Vérifiez votre boîte de réception.' });
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.error || "Impossible d'envoyer l'email." });
    } finally { setSending(false); }
  };

  return (
    <div className="mb-6 rounded-2xl border border-honey-200 bg-honey-50 dark:bg-honey-500/10 dark:border-honey-500/30 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-honey-100 dark:bg-honey-500/20 flex items-center justify-center text-honey-700 dark:text-honey-200 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-honey-700 dark:text-honey-200">Confirmez votre adresse email</p>
          <p className="text-sm text-honey-700/80 dark:text-honey-200/70 mt-0.5">
            Un email de confirmation a été envoyé à <span className="font-medium">{user.email}</span>. Cliquez sur le lien qu'il contient pour activer entièrement votre compte.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <button onClick={resend} disabled={sending} className="btn-secondary text-xs py-1.5 px-3">
              {sending ? 'Envoi…' : "Renvoyer l'email"}
            </button>
            {devLink && (
              <a href={devLink} className="text-xs font-medium text-honey-800 dark:text-honey-200 underline underline-offset-2 break-all">
                Lien de confirmation (mode test)
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
