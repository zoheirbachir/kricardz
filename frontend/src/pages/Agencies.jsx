import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../api';
import { AGENCY_CATEGORIES } from '../lib/agencyTypes';

function Stars({ rating = 0 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-honey-500' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Agencies() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wilayas, setWilayas] = useState([]);
  const [f, setF] = useState({
    search: searchParams.get('search') || '',
    wilaya: searchParams.get('wilaya') || '',
    type: searchParams.get('type') || '',
    sort: 'vehicles',
  });

  useEffect(() => {
    api.get('/agencies').then(r => setAgencies(r.data)).finally(() => setLoading(false));
    api.get('/wilayas').then(r => setWilayas(r.data));
  }, []);

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const filtered = useMemo(() => {
    let list = agencies.filter(a =>
      (!f.search || a.name.toLowerCase().includes(f.search.toLowerCase())) &&
      (!f.wilaya || a.wilaya === f.wilaya) &&
      (!f.type || (a.agency_type || 'classic') === f.type)
    );
    const by = {
      recent: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      rating: (a, b) => (b.rating_avg || 0) - (a.rating_avg || 0),
      vehicles: (a, b) => (b.vehicle_count || 0) - (a.vehicle_count || 0),
    }[f.sort];
    return [...list].sort(by);
  }, [agencies, f]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">{t('agency.eyebrow')}</p>
        <h1 className="section-title mb-2">{t('agency.title')}</h1>
        <p className="text-gray-500">{t('agency.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
          <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.879a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          {t('agency.filters')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('agency.name_label')}</label>
            <input className="input text-sm" placeholder={t('agency.name_ph')} value={f.search} onChange={e => set('search', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('home.wilaya_label')}</label>
            <select className="input text-sm" value={f.wilaya} onChange={e => set('wilaya', e.target.value)}>
              <option value="">{t('home.all_wilayas')}</option>
              {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('agency.type_label')}</label>
            <select className="input text-sm" value={f.type} onChange={e => set('type', e.target.value)}>
              <option value="">{t('agency.all_types')}</option>
              {AGENCY_CATEGORIES.map(c => <option key={c.key} value={c.key}>{t(`agency_types.${c.key}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('agency.sort_label')}</label>
            <select className="input text-sm" value={f.sort} onChange={e => set('sort', e.target.value)}>
              <option value="vehicles">{t('agency.sort_vehicles')}</option>
              <option value="rating">{t('agency.sort_rating')}</option>
              <option value="recent">{t('agency.sort_recent')}</option>
            </select>
          </div>
        </div>
      </div>

      {!loading && (
        <p className="text-sm text-gray-500 mb-4">
          {t('agency.results', { count: filtered.length })}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-64 animate-pulse bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-4M5 21H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>
          </div>
          <p className="text-gray-500">{t('agency.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((agency, i) => (
            <motion.div key={agency.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}>
              <Link to={`/agencies/${agency.id}`}
                className="card overflow-hidden group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 block h-full">
                {/* Cover banner */}
                <div className="relative h-28 bg-gradient-to-br from-primary-500 to-honey-500 overflow-hidden">
                  {agency.cover && <img src={agency.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/10" />
                  {agency.verified && (
                    <span className="absolute top-3 right-3 badge bg-white/90 text-pine-700 text-xs">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      {t('agency.verified')}
                    </span>
                  )}
                  {/* Logo / initial */}
                  <div className="absolute -bottom-6 left-5 w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 shadow-md flex items-center justify-center overflow-hidden ring-1 ring-black/5">
                    {agency.logo ? (
                      <img src={agency.logo} alt={agency.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display font-semibold text-2xl text-primary-600 dark:text-primary-300">{agency.name[0]}</span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="pt-9 px-5 pb-5">
                  <h3 className="font-semibold text-gray-900 truncate">{agency.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {agency.city ? `${agency.city}, ` : ''}{agency.wilaya}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <Stars rating={agency.rating_avg || 0} />
                    <span className="text-sm font-semibold text-gray-800">{(agency.rating_avg || 0).toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({agency.rating_count || 0})</span>
                  </div>

                  {/* Type badge */}
                  <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mt-3">
                    {t(`agency_types.${agency.agency_type || 'classic'}`)}
                  </span>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="badge-clay">{t('agency.vehicles', { count: agency.vehicle_count })}</span>
                    <span className="text-xs text-primary-600 font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                      {t('agency.details')}
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
