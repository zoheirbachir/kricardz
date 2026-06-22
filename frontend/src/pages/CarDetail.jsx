import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Lightbox from '../components/Lightbox';

const MapView = lazy(() => import('../components/MapView'));

function Stars({ rating, size = 'sm' }) {
  const s = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`${s} ${i <= Math.round(rating) ? 'text-honey-500' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* Normalize an Algerian phone number to international digits for wa.me links */
function waNumber(phone) {
  const d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('213')) return d;
  if (d.startsWith('0')) return '213' + d.slice(1);
  return d;
}

/* Resolve a video URL into either a YouTube embed or a direct file source */
function resolveVideo(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` };
  return { type: 'file', src: url };
}

export default function CarDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [booking, setBooking] = useState({ start_date: '', end_date: '', message: '', pickup: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [carLocation, setCarLocation] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.get(`/cars/${id}`)
      .then(r => { setCar(r.data); setFavorited(r.data.is_favorite); })
      .catch(() => navigate('/search'))
      .finally(() => setLoading(false));
    /* Try to load last GPS position (non-critical) */
    api.get(`/location/cars/${id}`).then(r => setCarLocation(r.data)).catch(() => {});
  }, [id]);

  const days = booking.start_date && booking.end_date
    ? Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / 86400000) : 0;

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setBookingLoading(true); setBookingError('');
    try {
      const message = [booking.pickup ? `Lieu de prise en charge : ${booking.pickup}` : '', booking.message]
        .filter(Boolean).join('\n');
      await api.post('/bookings', { car_id: id, start_date: booking.start_date, end_date: booking.end_date, message });
      setBookingSuccess(true);
      toast({ type: 'success', message: 'Demande de réservation envoyée avec succès !' });
    } catch (err) {
      const msg = err.response?.data?.error || t('common.error');
      setBookingError(msg);
      toast({ type: 'error', message: msg });
    } finally { setBookingLoading(false); }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    try {
      const res = await api.post('/reviews', { car_id: id, ...review });
      setCar(c => ({ ...c, reviews: [res.data, ...(c.reviews || [])] }));
      setReviewSuccess(true);
      toast({ type: 'success', message: 'Merci pour votre avis !' });
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.error || t('common.error') });
    }
  };

  const toggleFav = async () => {
    if (!user) return navigate('/login');
    try {
      const res = await api.post(`/cars/${id}/favorite`);
      setFavorited(res.data.favorited);
    } catch {
      toast({ type: 'error', message: 'Impossible de mettre à jour les favoris' });
    }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-80 bg-gray-200 rounded-2xl" />
          <div className="h-8 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
  if (!car) return null;

  const imgs = car.images?.length ? car.images : [null];
  // Null-filtered list for the Lightbox (index stays aligned with gallery since car.images has no nulls)
  const lightboxImgs = imgs.filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/search" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors rtl:flex-row-reverse">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        {t('common.back')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: images + details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="card overflow-hidden">
            <div className="relative h-72 md:h-96 bg-gray-100 group cursor-zoom-in"
              onClick={() => imgs[activeImg] && setLightboxIndex(activeImg)}>
              {imgs[activeImg] ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.img key={activeImg} src={imgs[activeImg]} alt={car.title}
                      initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 w-full h-full object-cover" />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 text-white/0 group-hover:text-white/90 text-sm font-medium transition-all duration-200 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm scale-90 group-hover:scale-100">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Agrandir
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <svg className="w-24 h-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M8 17h8M8 17v-2m8 2v-2" /></svg>
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); toggleFav(); }}
                aria-label="Favori"
                className={`absolute top-4 right-4 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110 ${favorited ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'}`}>
                <svg className="w-5 h-5" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
              {imgs.length > 1 && (
                <div className="absolute bottom-4 left-4 bg-black/40 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {activeImg + 1} / {imgs.length}
                </div>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {imgs.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    onDoubleClick={() => setLightboxIndex(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${activeImg === i ? 'border-primary-500 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">{car.title}</h1>
                <p className="text-gray-500 mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {car.city ? `${car.city}, ` : ''}{car.wilaya}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-3xl font-semibold text-primary-600">{car.price_per_day?.toLocaleString()} DA</div>
                <div className="text-sm text-gray-400">{t('car.per_day')}</div>
                {car.weekly_price ? <div className="text-xs text-gray-400 mt-1">{car.weekly_price.toLocaleString()} DA {t('car.per_week')}</div> : null}
                {car.monthly_price ? <div className="text-xs text-gray-400">{car.monthly_price.toLocaleString()} DA {t('car.per_month')}</div> : null}
              </div>
            </div>

            {/* Rating summary + views */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-sm">
              {car.rating_count > 0 && (
                <span className="flex items-center gap-2">
                  <Stars rating={car.rating_avg} />
                  <span className="font-semibold text-gray-800">{car.rating_avg}</span>
                  <span className="text-gray-500">({car.rating_count} avis)</span>
                </span>
              )}
              {car.rating_count > 0 && <span className="text-gray-300">·</span>}
              <span className="inline-flex items-center gap-1 text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {(car.views || 0).toLocaleString()} {t('car.views')}
              </span>
              <span className={`badge ${car.available ? 'badge-pine' : 'bg-gray-100 text-gray-500'}`}>
                {car.available ? t('car.available') : t('car.unavailable')}
              </span>
            </div>
          </div>

          {/* Specs */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">{t('car.details')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: t('car.carrosserie'), value: t(`types.${car.type}`) },
                { label: t('car.year'), value: car.year },
                { label: t('car.seats'), value: `${car.seats} ${t('car.seats')}` },
                { label: t('car.transmission'), value: t(`car.${car.transmission}`) },
                { label: t('car.fuel'), value: t(`car.${car.fuel}`) },
                { label: t('car.driver'), value: car.with_driver ? t('car.with_driver') : t('car.without_driver') },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="font-semibold text-gray-900 text-sm">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rental conditions — caution & mileage */}
          {(car.caution || car.km_per_day) && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">{t('car.rental_conditions')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {car.caution != null && (
                  <div className="flex items-start gap-3 bg-honey-50 dark:bg-honey-500/10 rounded-xl p-4">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-honey-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('car.caution')}</p>
                      <p className="font-display font-semibold text-gray-900 text-lg leading-tight">{car.caution.toLocaleString()} DA</p>
                      <p className="text-xs text-pine-600 mt-0.5">{t('car.caution_refund')}</p>
                    </div>
                  </div>
                )}
                {car.km_per_day != null && (
                  <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center text-primary-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('car.mileage')}</p>
                      <p className="font-display font-semibold text-gray-900 text-lg leading-tight">{car.km_per_day.toLocaleString()} {t('car.km_per_day_unit')}</p>
                      {car.extra_km_price != null && (
                        <p className="text-xs text-gray-500 mt-0.5">{t('car.extra_km')} : {car.extra_km_price.toLocaleString()} DA {t('car.per_km')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features */}
          {car.features?.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">{t('car.features')}</h2>
              <div className="flex flex-wrap gap-2">
                {car.features.map(f => (
                  <span key={f} className="badge bg-gray-100 text-gray-700 py-1.5 px-3">
                    <svg className="w-3.5 h-3.5 text-pine-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {car.description && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed text-sm">{car.description}</p>
            </div>
          )}

          {/* Vehicle video */}
          {resolveVideo(car.video_url) && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                {t('car.video')}
              </h2>
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                {resolveVideo(car.video_url).type === 'youtube' ? (
                  <iframe className="w-full h-full" src={resolveVideo(car.video_url).src} title={car.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                ) : (
                  <video className="w-full h-full" src={resolveVideo(car.video_url).src} controls preload="metadata" />
                )}
              </div>
            </div>
          )}

          {/* GPS Location map */}
          <div className="space-y-2">
            <div className="card p-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Position GPS
              </h2>
              {carLocation && (
                <Link to={`/track/${id}`}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                  Suivi en direct
                </Link>
              )}
            </div>
            {carLocation ? (
              <Suspense fallback={<div className="h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />}>
                {/* Plain wrapper — .card has overflow:hidden which breaks Leaflet tiles */}
                <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                  <MapView
                    center={[carLocation.lat, carLocation.lng]}
                    zoom={14}
                    height="240px"
                    markers={[{
                      lat: carLocation.lat,
                      lng: carLocation.lng,
                      popup: car?.title,
                      label: `Mis à jour ${new Date(carLocation.updated_at).toLocaleTimeString('fr-DZ')}`,
                    }]}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Dernière position connue · {new Date(carLocation.updated_at).toLocaleString('fr-DZ')}
                </p>
              </Suspense>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400">
                <svg className="w-7 h-7 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                <p className="text-sm">GPS non encore activé sur ce véhicule</p>
              </div>
            )}
          </div>

          {/* Owner */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Propriétaire</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-300 font-display font-semibold text-xl">
                {car.owner_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">{car.owner_name}</p>
                  {car.owner_verified && (
                    <span className="badge-pine">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      {t('car.verified_owner')}
                    </span>
                  )}
                  {car.owner_id_verified && (
                    <span className="badge-clay">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3m-3 3h3m-6 4h6a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h2m1-4a2 2 0 11-4 0 2 2 0 014 0zm-2 2a4 4 0 00-3.464 2" /></svg>
                      {t('car.verified_id')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">Membre depuis {new Date(car.created_at).getFullYear()}</p>
              </div>
            </div>

            {/* Contact buttons */}
            {car.owner_phone && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2.5">
                <a href={`tel:${car.owner_phone}`}
                  className="btn-secondary text-sm py-2.5 justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {t('car.call')}
                </a>
                <a href={`https://wa.me/${waNumber(car.owner_phone)}`} target="_blank" rel="noopener noreferrer"
                  className="btn-primary text-sm py-2.5 justify-center bg-[#25D366] hover:bg-[#1ebe5d] border-transparent">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z"/></svg>
                  {t('car.whatsapp')}
                </a>
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-5">{t('car.reviews')} ({car.reviews?.length || 0})</h2>
            {car.reviews?.length === 0 ? (
              <p className="text-gray-400 text-sm">{t('car.no_reviews')}</p>
            ) : (
              <div className="space-y-4">
                {car.reviews?.map(r => (
                  <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm">
                        {r.reviewer_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{r.reviewer_name}</p>
                        <Stars rating={r.rating} />
                      </div>
                      <span className="text-xs text-gray-400 ml-auto">{new Date(r.created_at).toLocaleDateString('fr-DZ')}</span>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 ml-12">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Add review */}
            {user && !reviewSuccess && (
              <form onSubmit={handleReview} className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                <h3 className="font-medium text-gray-900 text-sm">{t('car.add_review')}</h3>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(i => (
                    <button key={i} type="button" onClick={() => setReview(r => ({...r, rating: i}))} aria-label={`${i} étoiles`}
                      className={`transition-transform hover:scale-110 ${i <= review.rating ? 'text-honey-500' : 'text-gray-300'}`}>
                      <svg className="w-7 h-7" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </button>
                  ))}
                </div>
                <textarea className="input resize-none text-sm" rows={2} placeholder="Votre commentaire (optionnel)"
                  value={review.comment} onChange={e => setReview(r => ({...r, comment: e.target.value}))} />
                <button type="submit" className="btn-primary text-sm py-2">Publier mon avis</button>
              </form>
            )}
            {reviewSuccess && (
              <p className="mt-4 text-pine-600 text-sm font-medium flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Avis publié, merci !
              </p>
            )}
          </div>
        </div>

        {/* Right: Booking card */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-20">
            <h2 className="font-semibold text-gray-900 mb-4">{t('booking.title')}</h2>

            {bookingSuccess ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-pine-50 text-pine-600 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-semibold text-gray-900 mb-1">Demande envoyée !</p>
                <p className="text-sm text-gray-500">Le propriétaire vous contactera sous peu.</p>
                <Link to="/dashboard" className="btn-primary mt-4 block text-center text-sm">Voir mes réservations</Link>
              </div>
            ) : (
              <form onSubmit={handleBook} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('booking.start')}</label>
                  <input type="date" className="input text-sm" required min={new Date().toISOString().split('T')[0]}
                    value={booking.start_date} onChange={e => setBooking(b => ({...b, start_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('booking.end')}</label>
                  <input type="date" className="input text-sm" required min={booking.start_date || new Date().toISOString().split('T')[0]}
                    value={booking.end_date} onChange={e => setBooking(b => ({...b, end_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('booking.pickup')}</label>
                  <input className="input text-sm" placeholder={car.city ? `${car.city}, ${car.wilaya}` : car.wilaya}
                    value={booking.pickup} onChange={e => setBooking(b => ({...b, pickup: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('booking.message')}</label>
                  <textarea className="input resize-none text-sm" rows={2}
                    value={booking.message} onChange={e => setBooking(b => ({...b, message: e.target.value}))} />
                </div>

                {days > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
                    <div className="flex justify-between text-gray-600">
                      <span>{car.price_per_day?.toLocaleString()} DA × {days} {t('booking.days')}</span>
                      <span>{(car.price_per_day * days).toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                      <span>{t('booking.total')}</span>
                      <span className="text-primary-600">{(car.price_per_day * days).toLocaleString()} DA</span>
                    </div>
                    {car.caution != null && (
                      <div className="flex justify-between text-gray-500 text-xs pt-1.5 border-t border-dashed border-gray-200">
                        <span>{t('booking.caution_label')}</span>
                        <span>{car.caution.toLocaleString()} DA</span>
                      </div>
                    )}
                  </div>
                )}

                {bookingError && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{bookingError}</p>}

                <button type="submit" disabled={bookingLoading || !car.available}
                  className="btn-primary w-full text-sm">
                  {bookingLoading ? t('common.loading') : car.available ? t('booking.confirm') : t('car.unavailable')}
                </button>

                <p className="text-xs text-gray-400 text-center">Gratuit jusqu'à la confirmation du propriétaire</p>
              </form>
            )}

            {/* Trust badges */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
              {[
                { d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', text: 'Assurance incluse dans chaque location' },
                { d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', text: 'Propriétaire vérifié' },
                { d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', text: 'Paiement 100% sécurisé' },
              ].map(b => (
                <p key={b.text} className="text-xs text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4 text-pine-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={b.d} /></svg>
                  {b.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImgs}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
