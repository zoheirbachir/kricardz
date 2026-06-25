import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import CarCard from '../components/CarCard';
import PriceSlider from '../components/PriceSlider';

const MapView = lazy(() => import('../components/MapView'));
const TYPES = ['citadine','sedan','coupe','minivan','sport'];

/* FiltersPanel defined OUTSIDE Search so React doesn't treat it as a
   new component type on every render (which would remount PriceSlider). */
function FiltersPanel({ t, filters, wilayas, update, reset }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('home.wilaya_label')}</label>
        <select className="input text-sm" value={filters.wilaya} onChange={e => update('wilaya', e.target.value)}>
          <option value="">{t('types.all')}</option>
          {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('home.type_label')}</label>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map(tp => (
            <button key={tp} onClick={() => update('type', filters.type === tp ? '' : tp)}
              className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${filters.type === tp ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'}`}>
              {t(`types.${tp}`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('search.max_price')}</label>
        <PriceSlider
          value={Number(filters.max_price) || 30000}
          onChange={val => update('max_price', val === 30000 ? '' : String(val))}
        />
      </div>
      <button onClick={reset} className="w-full btn-secondary text-sm">{t('search.reset')}</button>
    </div>
  );
}

export default function Search() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wilayas, setWilayas] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [mapKey, setMapKey] = useState(0);   // increment to force Leaflet remount
  const [mapCars, setMapCars] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState({
    wilaya: searchParams.get('wilaya') || '',
    type: searchParams.get('type') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    search: searchParams.get('search') || '',
  });

  useEffect(() => { api.get('/wilayas').then(r => setWilayas(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('include_unavailable', '1');   // show unavailable cars too, like the live catalog
    setError('');
    api.get(`/cars?${params.toString()}`)
      .then(r => { setCars(r.data.cars); setTotal(r.data.total); })
      .catch(() => setError('Impossible de contacter le serveur. Vérifiez votre connexion ou réessayez dans quelques secondes.'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    if (viewMode === 'map') {
      api.get('/location/cars').then(r => setMapCars(r.data)).catch(() => setMapCars([]));
    }
  }, [viewMode]);

  const update = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const reset = () => setFilters({ wilaya: '', type: '', min_price: '', max_price: '', search: '' });

  const switchToMap = () => {
    setMapKey(k => k + 1);   // force fresh Leaflet init each time
    setViewMode('map');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">{t('search.catalog')}</p>
        <h1 className="section-title">{t('search.title')}</h1>
      </div>
      {/* Search bar + controls */}
      <div className="mb-6 flex gap-3">
        <input type="text" placeholder={t('home.search_placeholder')} className="input flex-1"
          value={filters.search} onChange={e => update('search', e.target.value)} />
        {/* Grid / Map toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
          <button onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            {t('search.grid')}
          </button>
          <button onClick={switchToMap}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            {t('search.map')}
          </button>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden btn-secondary flex items-center gap-2 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
          {t('search.filters')}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0`}>
          <div className="card p-5 sticky top-20">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('search.filters')}</h3>
            <FiltersPanel t={t} filters={filters} wilayas={wilayas} update={update} reset={reset} />
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mb-5">
            {loading ? t('common.loading') : t('search.results', { count: total })}
          </p>

          {/* MAP VIEW */}
          {viewMode === 'map' && (
            <Suspense fallback={<div className="h-[500px] bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />}>
              {/* Plain div — no overflow:hidden so Leaflet gestures work freely */}
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                <MapView
                  key={mapKey}
                  height="500px"
                  center={[28.0339, 1.6596]}
                  zoom={5}
                  markers={mapCars.map(c => ({
                    lat: c.lat, lng: c.lng,
                    popup: c.title,
                    label: `${c.price_per_day?.toLocaleString()} DA/j`,
                  }))}
                />
              </div>
              {mapCars.length === 0 && (
                <p className="flex items-center justify-center gap-2 text-center text-gray-400 text-sm py-6">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                  {t('search.map_empty')}
                </p>
              )}
            </Suspense>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-44 bg-gray-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-6 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center text-red-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-gray-600 text-base font-medium mb-1">Serveur inaccessible</p>
                <p className="text-gray-400 text-sm mb-4">{error}</p>
                <button onClick={() => setFilters(f => ({...f}))} className="btn-primary">Réessayer</button>
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <p className="text-gray-500 text-lg">{t('common.no_results')}</p>
                <button onClick={reset} className="mt-4 btn-primary">{t('search.clear')}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {cars.map(car => <CarCard key={car.id} car={car} />)}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
