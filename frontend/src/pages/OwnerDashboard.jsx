import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';
import { StaggerGroup, fadeUp } from '../lib/motion';

const statusColors = {
  pending: 'bg-honey-50 text-honey-700',
  confirmed: 'bg-pine-50 text-pine-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-gray-100 text-gray-600',
};

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('cars');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // carId pending deletion
  const [gpsToken, setGpsToken] = useState(null); // { carId, token } to show

  useEffect(() => {
    Promise.all([api.get('/cars/my'), api.get('/bookings/owner')])
      .then(([c, b]) => { setCars(c.data); setBookings(b.data); })
      .finally(() => setLoading(false));
  }, []);

  const deleteCar = async (id) => {
    setDeleteConfirm(null);
    await api.delete(`/cars/${id}`);
    setCars(c => c.filter(x => x.id !== id));
    toast({ type: 'success', message: 'Annonce supprimée avec succès.' });
  };

  const generateGpsToken = async (carId) => {
    try {
      const res = await api.post(`/location/cars/${carId}/token`);
      setGpsToken({ carId, token: res.data.gps_token });
    } catch {
      toast({ type: 'error', message: 'Impossible de générer le token GPS.' });
    }
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(token).then(() =>
      toast({ type: 'success', message: 'Token copié dans le presse-papiers !' })
    );
  };

  const updateBooking = async (id, status) => {
    await api.put(`/bookings/${id}/status`, { status });
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
    const msgs = { confirmed: 'Réservation confirmée !', cancelled: 'Réservation annulée.', completed: 'Réservation marquée terminée.' };
    toast({ type: status === 'confirmed' ? 'success' : status === 'cancelled' ? 'error' : 'info', message: msgs[status] });
  };

  const [contractBusy, setContractBusy] = useState(false);
  const openPartnershipContract = async () => {
    setContractBusy(true);
    try {
      const res = await api.post('/contracts/partnership');
      navigate(`/contracts/${res.data.id}`);
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.error || 'Impossible de générer le contrat.' });
    } finally { setContractBusy(false); }
  };
  const openRentalContract = async (bookingId) => {
    try {
      const res = await api.post(`/contracts/rental/${bookingId}`);
      navigate(`/contracts/${res.data.id}`);
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.error || 'Impossible de générer le contrat.' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900">Tableau de bord propriétaire</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos annonces et réservations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openPartnershipContract} disabled={contractBusy} className="btn-secondary text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {contractBusy ? '…' : 'Contrat de partenariat'}
          </button>
          <Link to="/dashboard" className="btn-secondary text-sm">Mes réservations</Link>
          <Link to="/dashboard/owner/add" className="btn-primary text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nouvelle annonce
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" stagger={0.08}>
        {[
          { label: 'Annonces', val: cars.length, d: 'M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M7.5 9h9', tint: 'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300' },
          { label: 'Réservations', val: bookings.length, d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', tint: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
          { label: 'En attente', val: bookings.filter(b => b.status === 'pending').length, d: 'M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z', tint: 'bg-honey-50 dark:bg-honey-500/15 text-honey-600 dark:text-honey-400' },
          { label: 'Confirmées', val: bookings.filter(b => b.status === 'confirmed').length, d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', tint: 'bg-pine-50 dark:bg-pine-500/15 text-pine-600 dark:text-pine-300' },
        ].map(s => (
          <motion.div key={s.label} variants={fadeUp} whileHover={{ y: -4 }} className="card p-4 text-center">
            <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${s.tint} flex items-center justify-center`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={s.d} /></svg>
            </div>
            <div className="font-display text-2xl font-semibold text-gray-900">{s.val}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </motion.div>
        ))}
      </StaggerGroup>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[
          { val: 'cars', label: `Annonces (${cars.length})` },
          { val: 'bookings', label: `Réservations (${bookings.length})` },
        ].map(tb => (
          <button key={tb.val} onClick={() => setTab(tb.val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === tb.val ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Cars tab */}
      {tab === 'cars' && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-gray-100" />)}
          </div>
        ) : cars.length === 0 ? (
          <div className="text-center py-16 card">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M8 17h8M8 17v-2m8 2v-2" /></svg>
            </div>
            <p className="text-gray-500 mb-4">Aucune annonce publiée</p>
            <Link to="/dashboard/owner/add" className="btn-primary text-sm">Publier ma première annonce</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cars.map(car => (
              <div key={car.id} className="card p-4 flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                  {car.images?.[0] ? <img src={car.images[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M8 17h8M8 17v-2m8 2v-2" /></svg></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{car.title}</p>
                  <p className="text-xs text-gray-500">{car.wilaya} · {car.year}</p>
                  <p className="text-primary-600 font-semibold text-sm mt-1">{car.price_per_day?.toLocaleString()} DA/j</p>
                  <span className={`badge mt-1 ${car.available ? 'bg-pine-50 text-pine-700' : 'bg-red-50 text-red-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${car.available ? 'bg-pine-500' : 'bg-red-500'}`} />
                    {car.available ? 'Disponible' : 'Indisponible'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Link to={`/cars/${car.id}`} className="btn-ghost text-xs py-1 px-2">{t('common.see_all')}</Link>
                  <Link to={`/track/${car.id}`} className="flex items-center justify-center gap-1 text-xs text-primary-600 hover:text-primary-700 py-1 px-2 border border-primary-200 rounded-lg text-center">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                    GPS
                  </Link>
                  <button onClick={() => generateGpsToken(car.id)} className="flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 py-1 px-2 border border-gray-200 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    Token
                  </button>
                  {deleteConfirm === car.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => deleteCar(car.id)} className="text-xs text-white bg-red-500 hover:bg-red-600 py-1 px-2 rounded-lg transition-colors">Oui</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:text-gray-700 py-1 px-2 border border-gray-200 rounded-lg transition-colors">Non</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(car.id)} className="text-xs text-red-500 hover:text-red-700 py-1 px-2 transition-colors">{t('common.delete')}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Bookings tab */}
      {tab === 'bookings' && (
        loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 card">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-gray-500">Aucune demande de réservation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{b.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Locataire : <span className="font-medium">{b.renter_name}</span> · {b.renter_phone || b.renter_email}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(b.start_date).toLocaleDateString('fr-DZ')} → {new Date(b.end_date).toLocaleDateString('fr-DZ')}
                  </p>
                  {b.message && <p className="text-xs text-gray-500 italic mt-1">"{b.message}"</p>}
                </div>
                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <span className={`badge ${statusColors[b.status]} text-xs`}>{t(`booking.${b.status}`)}</span>
                  <p className="font-bold text-gray-900">{b.total_price?.toLocaleString()} DA</p>
                  {b.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateBooking(b.id, 'confirmed')} className="btn-primary text-xs py-1.5 px-3">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Confirmer
                      </button>
                      <button onClick={() => updateBooking(b.id, 'cancelled')} aria-label="Refuser" className="text-xs text-red-500 hover:text-red-700 py-1.5 px-3 border border-red-200 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => updateBooking(b.id, 'completed')} className="btn-secondary text-xs py-1.5 px-3">Marquer terminée</button>
                  )}
                  {(b.status === 'confirmed' || b.status === 'completed') && (
                    <button onClick={() => openRentalContract(b.id)} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 py-1.5 px-3 border border-primary-200 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Contrat de location
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {/* GPS Token Modal */}
      {gpsToken && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setGpsToken(null)}>
          <div className="card max-w-md w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  Token GPS généré
                </h3>
                <p className="text-sm text-gray-500 mt-1">Configurez ce token dans votre traceur GPS</p>
              </div>
              <button onClick={() => setGpsToken(null)} aria-label="Fermer" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm text-gray-800 break-all select-all border border-gray-200">
              {gpsToken.token}
            </div>
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <p className="font-semibold text-gray-900 dark:text-white">Configuration du traceur GPS :</p>
              <p>Header HTTP : <code className="bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 px-1 rounded">X-GPS-Token: {gpsToken.token.slice(0, 16)}...</code></p>
              <p>Endpoint POST : <code className="bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 px-1 rounded">/api/location/cars/{gpsToken.carId}</code></p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => copyToken(gpsToken.token)} className="flex-1 btn-primary text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copier le token
              </button>
              <button onClick={() => setGpsToken(null)} className="flex-1 btn-secondary text-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
