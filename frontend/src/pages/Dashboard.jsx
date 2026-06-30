import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';
import { Reveal, StaggerGroup, fadeUp } from '../lib/motion';

const statusColors = {
  pending: 'bg-honey-50 text-honey-700',
  confirmed: 'bg-pine-50 text-pine-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-gray-100 text-gray-600',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  const openRentalContract = async (bookingId) => {
    try {
      const res = await api.post(`/contracts/rental/${bookingId}`);
      navigate(`/contracts/${res.data.id}`);
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.error || 'Impossible de générer le contrat.' });
    }
  };

  useEffect(() => {
    api.get('/bookings/my').then(r => setBookings(r.data)).finally(() => setLoading(false));
  }, []);

  const cancel = async (id) => {
    setCancelConfirm(null);
    await api.put(`/bookings/${id}/status`, { status: 'cancelled' });
    setBookings(b => b.map(x => x.id === id ? { ...x, status: 'cancelled' } : x));
    toast({ type: 'info', message: 'Réservation annulée.' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900">Bonjour, {user?.name?.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('nav.myBookings')}</p>
        </div>
        {(user?.role === 'owner') && (
          <Link to="/dashboard/owner" className="btn-primary text-sm">Mes annonces
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </Link>
        )}
      </div>

      {/* KYC verification status banner */}
      {user?.kyc_status === 'pending' && (
        <Reveal>
          <div className="mb-6 rounded-2xl border border-honey-200 bg-honey-50 dark:bg-honey-500/10 dark:border-honey-500/30 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-honey-100 dark:bg-honey-500/20 flex items-center justify-center text-honey-700 dark:text-honey-200 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-honey-700 dark:text-honey-200">Vérification d'identité en cours</p>
              <p className="text-sm text-honey-700/80 dark:text-honey-200/70 mt-0.5">Vos documents ont bien été reçus. Notre équipe les examine — votre compte sera vérifié sous peu.</p>
            </div>
          </div>
        </Reveal>
      )}
      {user?.kyc_status === 'rejected' && (
        <Reveal>
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-300 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3l-6.93-12a2 2 0 00-3.48 0l-6.93 12a2 2 0 001.74 3z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-red-700 dark:text-red-300">Vérification d'identité refusée</p>
              <p className="text-sm text-red-600/90 dark:text-red-300/80 mt-0.5">
                {user?.kyc_rejection_reason
                  ? <>Motif : {user.kyc_rejection_reason}</>
                  : 'Vos documents n\'ont pas pu être validés.'}
              </p>
              <Link to="/contact" className="inline-block mt-2 text-sm font-medium text-red-700 dark:text-red-300 underline underline-offset-2">Contacter le support</Link>
            </div>
          </div>
        </Reveal>
      )}
      {user?.kyc_status === 'approved' && (
        <Reveal>
          <div className="mb-6 rounded-2xl border border-pine-200 bg-pine-50 dark:bg-pine-500/10 dark:border-pine-500/30 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pine-100 dark:bg-pine-500/20 flex items-center justify-center text-pine-700 dark:text-pine-200 shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-pine-700 dark:text-pine-200">Identité vérifiée</p>
              <p className="text-sm text-pine-700/80 dark:text-pine-200/70 mt-0.5">Votre compte est entièrement vérifié. Merci !</p>
            </div>
          </div>
        </Reveal>
      )}

      {/* Profile card */}
      <div className="card p-5 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-300 font-display font-semibold text-2xl">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            {user?.verified ? (
              <span className="badge-pine">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Compte vérifié
              </span>
            ) : (
              <span className="badge-honey">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3l-6.93-12a2 2 0 00-3.48 0l-6.93 12a2 2 0 001.74 3z" /></svg>
                Non vérifié
              </span>
            )}
            <span className="badge bg-gray-100 text-gray-600 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Bookings */}
      <h2 className="font-semibold text-gray-900 mb-4">{t('nav.myBookings')}</h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <p className="text-gray-500 mb-4">Aucune réservation pour l'instant</p>
          <Link to="/search" className="btn-primary text-sm">Trouver une voiture</Link>
        </div>
      ) : (
        <StaggerGroup className="space-y-3">
          {bookings.map(b => (
            <motion.div key={b.id} variants={fadeUp} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                {b.images?.[0] ? <img src={b.images[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300"><svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M8 17h8M8 17v-2m8 2v-2" /></svg></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{b.title}</p>
                <p className="text-sm text-gray-500">{b.wilaya}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(b.start_date).toLocaleDateString('fr-DZ')} → {new Date(b.end_date).toLocaleDateString('fr-DZ')}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <span className={`badge ${statusColors[b.status] || 'bg-gray-100 text-gray-600'} text-xs`}>
                  {t(`booking.${b.status}`)}
                </span>
                <p className="font-semibold text-gray-900">{b.total_price?.toLocaleString()} DA</p>
                {b.status === 'confirmed' && (
                  <Link to={`/track/${b.car_id}`}
                    className="text-xs font-medium text-primary-600 border border-primary-200 hover:bg-primary-50 py-1 px-3 rounded-lg flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse inline-block" />
                    Suivre en direct
                  </Link>
                )}
                {(b.status === 'confirmed' || b.status === 'completed') && (
                  <button onClick={() => openRentalContract(b.id)}
                    className="text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 py-1 px-3 rounded-lg flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Mon contrat
                  </button>
                )}
                {b.status === 'pending' && (
                  cancelConfirm === b.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => cancel(b.id)} className="text-xs text-white bg-red-500 hover:bg-red-600 py-1 px-2.5 rounded-lg transition-colors">Oui, annuler</button>
                      <button onClick={() => setCancelConfirm(null)} className="text-xs text-gray-500 hover:text-gray-700 py-1 px-2 border border-gray-200 rounded-lg transition-colors">Non</button>
                    </div>
                  ) : (
                    <button onClick={() => setCancelConfirm(b.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">{t('common.cancel')}</button>
                  )
                )}
              </div>
            </motion.div>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
