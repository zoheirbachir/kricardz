import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import CarCard from '../components/CarCard';

export default function AgencyDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/agencies/${id}`)
      .then(r => setAgency(r.data))
      .catch(() => navigate('/agencies'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="h-40 bg-gray-200 rounded-2xl mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-2xl" />)}
      </div>
    </div>
  );

  if (!agency) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/agencies" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 mb-6 transition-colors rtl:flex-row-reverse">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Retour aux agences
      </Link>

      {/* Agency header */}
      <div className="card p-6 mb-8">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-300 font-display font-semibold text-3xl shrink-0">
            {agency.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{agency.name}</h1>
              {agency.verified && (
                <span className="badge-pine">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Agence vérifiée
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {agency.city ? `${agency.city}, ` : ''}{agency.wilaya}
            </p>
            {agency.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-3 leading-relaxed">{agency.description}</p>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-gray-500 dark:text-gray-400">
              {agency.phone && (
                <a href={`tel:${agency.phone}`} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors">
                  <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {agency.phone}
                </a>
              )}
              {agency.email && (
                <a href={`mailto:${agency.email}`} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors">
                  <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {agency.email}
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M7.5 9h9" /></svg>
                {agency.vehicle_count} véhicule{agency.vehicle_count !== 1 ? 's' : ''} disponible{agency.vehicle_count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cars */}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-gray-900 dark:text-white mb-5">
        Véhicules de cette agence
      </h2>

      {!agency.cars?.length ? (
        <div className="text-center py-16 card">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M8 17h8M8 17v-2m8 2v-2" /></svg>
          </div>
          <p className="text-gray-500">Aucun véhicule disponible pour le moment.</p>
          <Link to="/search" className="btn-primary mt-4 inline-block text-sm">
            Voir tous les véhicules
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger animate-slide-up">
          {agency.cars.map(car => <CarCard key={car.id} car={car} />)}
        </div>
      )}
    </div>
  );
}
