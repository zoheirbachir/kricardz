import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../api';
import CarCard from '../components/CarCard';
import HowItWorksTutorial from '../components/HowItWorksTutorial';
import BgVideo from '../components/BgVideo';
import { useCountUp } from '../hooks/useCountUp';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { AnimatedHeading, fadeUp, staggerContainer, softSpring, StaggerGroup, Reveal } from '../lib/motion';
import { AGENCY_CATEGORIES } from '../lib/agencyTypes';

const CAR_TYPES = ['sedan','suv','van','sport','4x4'];
const CAT_VIDEOS = {
  sedan: '/hero/cat-sedan.mp4',
  suv:   '/hero/cat-suv.mp4',
  van:   '/hero/cat-van.mp4',
  sport: '/hero/cat-sport.mp4',
  '4x4': '/hero/cat-4x4.mp4',
};

/* Animated stat item */
function StatItem({ val, label, started }) {
  const display = useCountUp(val, 1600, started);
  return (
    <div className="text-center">
      <div className="font-display text-4xl font-semibold text-primary-300 drop-shadow">{display}</div>
      <div className="text-xs text-gray-300 mt-1">{label}</div>
    </div>
  );
}

/* Hero now uses a cinematic looping video background — see the Hero section below.
   Bundled video assets live in /public/hero (hero.mp4, city.mp4, drive.mp4, …). No poster images. */

/* ── Inline feature icons (brand palette, no emoji / no purple) ── */
const IcVerified = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const IcShield   = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const IcClock    = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IcTag      = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 11V6a3 3 0 013-3z" /></svg>;
const IcCar      = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M7.5 9h9" /></svg>;
const IcPin      = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IcSearchSm = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const IcKey      = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>;
const IcLock     = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
const IcCalendar = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IcBuilding = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m6-14h1m-1 4h1m4-4h1m-1 4h1m-5 6h4" /></svg>;
/* ── Agency-category icons (for "Parcourir les agences") ── */
const IcDiamond = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12l3 6-9 12L3 9l3-6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M9 3l3 18M15 3l-3 18" /></svg>;
const IcHeart   = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>;
const IcBus     = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M5 17V6a2 2 0 012-2h10a2 2 0 012 2v11M5 17h14M5 17v2a1 1 0 001 1h1a1 1 0 001-1v-2m8 0v2a1 1 0 001 1h1a1 1 0 001-1v-2M5 12h14M9 4v8m6-8v8" /><circle cx="8" cy="14.5" r="0.8" fill="currentColor" stroke="none" /><circle cx="16" cy="14.5" r="0.8" fill="currentColor" stroke="none" /></svg>;
const IcTruck   = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6a1 1 0 011-1h9a1 1 0 011 1v9H3V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 9h3.5l2.5 3v3h-6V9z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></svg>;
const IcCrane   = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M3 20h7v-7H3v7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.5 13V5h13M19.5 5v4M10 9h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 9v3" /><circle cx="5" cy="17" r="0.8" fill="currentColor" stroke="none" /><circle cx="8" cy="17" r="0.8" fill="currentColor" stroke="none" /></svg>;

const CAT_ICONS = { classic: IcCar, luxury: IcDiamond, wedding: IcHeart, bus: IcBus, construction: IcCrane, trucks: IcTruck };
const CAT_TINTS = [
  'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300',
  'bg-honey-50 dark:bg-honey-500/15 text-honey-600 dark:text-honey-400',
  'bg-pine-50 dark:bg-pine-500/15 text-pine-600 dark:text-pine-300',
  'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300',
  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  'bg-honey-50 dark:bg-honey-500/15 text-honey-600 dark:text-honey-400',
];

const TYPE_TINTS = [
  'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300',
  'bg-pine-50 dark:bg-pine-500/15 text-pine-600 dark:text-pine-300',
  'bg-honey-50 dark:bg-honey-500/15 text-honey-600 dark:text-honey-400',
  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300',
];
const DEFAULT_WILAYAS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Sétif', 'Tlemcen', 'Béjaïa'];
const ARROW = 'M14 5l7 7m0 0l-7 7m7-7H3';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [wilayas, setWilayas] = useState([]);
  const [featuredCars, setFeaturedCars] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [search, setSearch] = useState({ wilaya: '', type: '', max_price: '' });
  const [searchMode, setSearchMode] = useState('car');   // 'car' | 'agency' — hero search tabs
  const [agencySearch, setAgencySearch] = useState({ search: '', wilaya: '', type: '' });
  const [statsStarted, setStatsStarted] = useState(false);
  const statsRef = useRef(null);
  const [whyRef, whyVisible] = useScrollReveal();
  const [agRef, agVisible] = useScrollReveal();
  const [testRef, testVisible] = useScrollReveal();

  useEffect(() => {
    api.get('/wilayas').then(r => setWilayas(r.data));
    api.get('/cars?limit=8').then(r => setFeaturedCars(r.data.cars));
    api.get('/agencies').then(r => setAgencies(r.data));

    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStatsStarted(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.wilaya) params.set('wilaya', search.wilaya);
    if (search.type) params.set('type', search.type);
    if (search.max_price) params.set('max_price', search.max_price);
    navigate(`/search?${params.toString()}`);
  };

  const handleAgencySearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (agencySearch.search) params.set('search', agencySearch.search);
    if (agencySearch.wilaya) params.set('wilaya', agencySearch.wilaya);
    if (agencySearch.type) params.set('type', agencySearch.type);
    navigate(`/agencies?${params.toString()}`);
  };

  const agencyCounts = useMemo(() => agencies.reduce((m, a) => {
    const k = a.agency_type || 'classic';
    m[k] = (m[k] || 0) + 1;
    return m;
  }, {}), [agencies]);

  const whyItems = [
    { Icon: IcVerified, title: t('home.why_verified'),  desc: t('home.why_verified_desc'),  tint: 'bg-pine-50 dark:bg-pine-500/15 text-pine-600 dark:text-pine-300' },
    { Icon: IcShield,   title: t('home.why_insurance'), desc: t('home.why_insurance_desc'), tint: 'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300' },
    { Icon: IcClock,    title: t('home.why_support'),   desc: t('home.why_support_desc'),   tint: 'bg-honey-50 dark:bg-honey-500/15 text-honey-600 dark:text-honey-400' },
    { Icon: IcTag,      title: t('home.why_price'),     desc: t('home.why_price_desc'),     tint: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' },
  ];

  return (
    <div className="relative">
      {/* ── Hero (cinematic video background + original content) ── */}
      <section className="relative text-white overflow-hidden min-h-screen flex items-center">
        {/* Looping muted video background (plays only while on-screen) */}
        <BgVideo className="absolute inset-0 w-full h-full object-cover" src="/hero/hero.mp4" />
        {/* Readability overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/25 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <motion.div className="max-w-2xl" initial="hidden" animate="show" variants={staggerContainer(0.12, 0.05)}>
            <motion.span variants={fadeUp} className="inline-flex items-center gap-2 text-xs font-semibold mb-6 px-3.5 py-1.5 rounded-full bg-primary-500/20 text-primary-200 ring-1 ring-primary-400/30 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              {t('home.badge')}
            </motion.span>
            <AnimatedHeading
              text={t('home.hero_title')}
              className="font-display text-5xl md:text-6xl font-semibold leading-[1.05] mb-5 tracking-tight drop-shadow-xl"
            />
            <motion.p variants={fadeUp} className="text-lg text-gray-200 mb-10 leading-relaxed max-w-lg drop-shadow-lg">
              {t('home.hero_subtitle')}
            </motion.p>

            {/* Animated stats */}
            <motion.div ref={statsRef} variants={staggerContainer(0.1)} className="flex flex-wrap gap-x-10 gap-y-6 mb-12">
              {[
                { val: '500+', label: t('home.stats_cars') },
                { val: '58',   label: t('home.stats_wilayas') },
                { val: '2000', label: t('home.stats_users') },
                { val: '1200', label: t('home.stats_bookings') },
              ].map(s => (
                <motion.div key={s.label} variants={fadeUp}>
                  <StatItem val={s.val} label={s.label} started={statsStarted} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Search card */}
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...softSpring, delay: 0.35 }}
            className="bg-white dark:bg-[#211C14] rounded-2xl shadow-xl ring-1 ring-black/5 p-5 max-w-3xl">
            {/* Tabs: search a car / browse agencies (mirrors kricar-dz.com) */}
            <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
              {[
                { key: 'car', label: t('home.tab_car'), Icon: IcCar },
                { key: 'agency', label: t('home.tab_agency'), Icon: IcBuilding },
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => setSearchMode(tab.key)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${searchMode === tab.key ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                  <tab.Icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>

            {searchMode === 'car' ? (
              <>
                <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('home.wilaya_label')}</label>
                    <select className="input text-sm" value={search.wilaya} onChange={e => setSearch({...search, wilaya: e.target.value})}>
                      <option value="">{t('home.all_wilayas')}</option>
                      {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('home.type_label')}</label>
                    <select className="input text-sm" value={search.type} onChange={e => setSearch({...search, type: e.target.value})}>
                      <option value="">{t('types.all')}</option>
                      {CAR_TYPES.map(tp => <option key={tp} value={tp}>{t(`types.${tp}`)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('home.price_label')}</label>
                    <div className="flex gap-2">
                      <input type="number" className="input text-sm" placeholder="Ex: 10000" value={search.max_price}
                        onChange={e => setSearch({...search, max_price: e.target.value})} />
                      <button type="submit" className="btn-primary shrink-0 px-4" aria-label={t('nav.search')}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Quick type pills */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {CAR_TYPES.map(tp => (
                    <button key={tp} type="button"
                      onClick={() => { setSearch(s => ({...s, type: tp})); navigate(`/search?type=${tp}`); }}
                      className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary-100 hover:text-primary-700 cursor-pointer transition-colors py-1 px-2.5">
                      {t(`types.${tp}`)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={handleAgencySearch} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('home.agency_name_label')}</label>
                    <input type="text" className="input text-sm" placeholder={t('home.agency_name_ph')} value={agencySearch.search}
                      onChange={e => setAgencySearch({ ...agencySearch, search: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('home.wilaya_label')}</label>
                    <select className="input text-sm" value={agencySearch.wilaya} onChange={e => setAgencySearch({ ...agencySearch, wilaya: e.target.value })}>
                      <option value="">{t('home.all_wilayas')}</option>
                      {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('home.agency_type_label')}</label>
                    <select className="input text-sm" value={agencySearch.type} onChange={e => setAgencySearch({ ...agencySearch, type: e.target.value })}>
                      <option value="">{t('home.all_agency_types')}</option>
                      {AGENCY_CATEGORIES.map(c => <option key={c.key} value={c.key}>{t(`agency_types.${c.key}`)}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-3 justify-center text-sm gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  {t('home.search_now')}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="py-8 bg-white dark:bg-[#16130D] border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-5" stagger={0.08} amount={0.3}>
            {[
              { Icon: IcShield,   title: t('home.trust_insurance'), sub: t('home.trust_insurance_sub'), tint: 'bg-pine-50 dark:bg-pine-500/15 text-pine-600 dark:text-pine-300' },
              { Icon: IcVerified, title: t('home.trust_verified'), sub: t('home.trust_verified_sub'), tint: 'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300' },
              { Icon: IcClock,    title: t('home.trust_support'), sub: t('home.trust_support_sub'), tint: 'bg-honey-50 dark:bg-honey-500/15 text-honey-600 dark:text-honey-400' },
              { Icon: IcLock,     title: t('home.trust_payment'), sub: t('home.trust_payment_sub'), tint: 'bg-pine-50 dark:bg-pine-500/15 text-pine-600 dark:text-pine-300' },
            ].map(it => (
              <motion.div key={it.title} variants={fadeUp} className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${it.tint}`}><it.Icon className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{it.title}</p>
                  <p className="text-xs text-gray-500">{it.sub}</p>
                </div>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── Browse by category ── */}
      <section className="py-20 bg-gray-50 dark:bg-[#120F0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <p className="eyebrow justify-center mb-3">{t('home.categories_eyebrow')}</p>
            <h2 className="section-title mb-3">{t('home.categories_title')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t('home.categories_sub')}</p>
          </Reveal>
          <StaggerGroup className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" stagger={0.07}>
            {CAR_TYPES.map((tp) => (
              <motion.div key={tp} variants={fadeUp} whileHover={{ y: -6 }} transition={softSpring}>
                <Link
                  to={`/search?type=${tp}`}
                  className="card group block overflow-hidden hover:shadow-lg"
                  onMouseEnter={(e) => { const v = e.currentTarget.querySelector('video'); if (v) v.play().catch(() => {}); }}
                  onMouseLeave={(e) => { const v = e.currentTarget.querySelector('video'); if (v) { v.pause(); v.currentTime = 0; } }}
                >
                  <div className="relative h-28 overflow-hidden bg-gray-900">
                    <video className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" muted loop playsInline preload="metadata" src={CAT_VIDEOS[tp]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-3 text-white font-semibold text-sm drop-shadow">{t(`types.${tp}`)}</span>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <span className="text-xs text-primary-600 font-semibold inline-flex items-center gap-1">
                      {t('home.see')} <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={ARROW} /></svg>
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── Why KriCar ── */}
      <section className="py-20 bg-white dark:bg-[#16130D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={whyRef} className={`reveal ${whyVisible ? 'visible' : ''} text-center mb-12`}>
            <p className="eyebrow justify-center mb-3">{t('home.why_title')}</p>
            <h2 className="section-title mb-3">{t('home.why_subtitle')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t('home.why_sub2')}</p>
          </div>
          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" stagger={0.09}>
            {whyItems.map((item) => (
              <motion.div key={item.title} variants={fadeUp}
                whileHover={{ y: -6 }} transition={softSpring}
                className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#211C14] hover:shadow-lg">
                <div className={`w-14 h-14 rounded-2xl ${item.tint} flex items-center justify-center mb-4`}>
                  <item.Icon className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── Featured cars ── */}
      <section className="py-20 bg-gray-50 dark:bg-[#120F0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="eyebrow mb-2">{t('home.featured_title')}</p>
              <h2 className="section-title">{t('home.featured_subtitle')}</h2>
            </div>
            <Link to="/search" className="text-primary-600 hover:text-primary-700 text-sm font-semibold flex items-center gap-1 transition-colors shrink-0">
              {t('common.see_all')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link>
          </div>
          {featuredCars.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden">
                  <div className="skeleton h-44 w-full" />
                  <div className="p-4 space-y-2.5">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" stagger={0.07}>
              {featuredCars.map(car => <CarCard key={car.id} car={car} />)}
            </StaggerGroup>
          )}
        </div>
      </section>

      {/* ── Popular destinations ── */}
      <section className="relative py-20 overflow-hidden text-white">
        <BgVideo className="absolute inset-0 w-full h-full object-cover" src="/hero/city.mp4" />
        <div className="absolute inset-0 bg-gray-950/80 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10">
            <p className="eyebrow mb-2">{t('home.destinations_eyebrow')}</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-white">{t('home.destinations_title')}</h2>
            <p className="text-white/70 mt-2">{t('home.destinations_sub')}</p>
          </Reveal>
          <StaggerGroup className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" stagger={0.05}>
            {(wilayas.length ? wilayas : DEFAULT_WILAYAS).slice(0, 8).map(w => (
              <motion.div key={w} variants={fadeUp} whileHover={{ y: -4 }} transition={softSpring}>
                <Link to={`/search?wilaya=${encodeURIComponent(w)}`} className="card group flex items-center gap-3 p-4 hover:shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <IcPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{w}</p>
                    <p className="text-xs text-gray-500">{t('home.see_cars')}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── Agencies ── */}
      {agencies.length > 0 && (
        <section className="py-20 bg-white dark:bg-[#16130D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div ref={agRef} className={`reveal ${agVisible ? 'visible' : ''}`}>
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="eyebrow mb-2">{t('home.agencies_title')}</p>
                  <h2 className="section-title">{t('home.agencies_partners')}</h2>
                </div>
                <Link to="/agencies" className="text-primary-600 hover:text-primary-700 text-sm font-semibold flex items-center gap-1 shrink-0">
                  {t('common.see_all')}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Link>
              </div>
            </div>
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 stagger ${agVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              {agencies.slice(0, 4).map(agency => (
                <Link key={agency.id} to={`/agencies/${agency.id}`}
                  className="card p-5 hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-center group">
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-300 font-display font-semibold text-xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    {agency.name[0]}
                  </div>
                  <h3 className="font-semibold text-sm mb-1 truncate">{agency.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{agency.wilaya}</p>
                  <span className="badge-clay">{t('agency.vehicles', { count: agency.vehicle_count })}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="py-20 bg-gray-50 dark:bg-[#120F0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <p className="eyebrow justify-center mb-3">{t('home.how_eyebrow')}</p>
            <h2 className="section-title mb-3">{t('home.how_title')}</h2>
          </Reveal>
          <Reveal className="mb-6">
            <HowItWorksTutorial />
          </Reveal>
          <div className="text-center mt-8">
            <Link to="/how-it-works" className="btn-secondary text-sm">{t('home.learn_more')}</Link>
          </div>
        </div>
      </section>

      {/* ── Cinematic drive band ── */}
      <section className="relative h-[58vh] min-h-[380px] flex items-center justify-center text-white overflow-hidden">
        <BgVideo className="absolute inset-0 w-full h-full object-cover" src="/hero/drive.mp4" />
        <div className="absolute inset-0 bg-black/45 pointer-events-none" />
        <Reveal className="relative text-center px-6 max-w-2xl">
          <h2 className="font-display text-3xl md:text-5xl font-semibold drop-shadow-lg">{t('home.drive_title')}</h2>
          <p className="mt-4 text-lg text-white/85 drop-shadow">{t('home.drive_sub')}</p>
        </Reveal>
      </section>

      {/* ── CTA Owner ── */}
      <section className="py-20 bg-white dark:bg-[#16130D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl text-white px-8 py-12 md:px-12">
            <BgVideo className="absolute inset-0 w-full h-full object-cover" src="/hero/owner.mp4" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 via-primary-700/85 to-primary-800/80 pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl md:text-4xl font-semibold mb-3">{t('home.cta_owner')}</h2>
                <p className="text-primary-50/90 leading-relaxed">{t('home.cta_owner_desc')}</p>
                <ul className="mt-5 space-y-2.5 text-sm text-primary-50">
                  {[t('home.cta_li1'), t('home.cta_li2'), t('home.cta_li3')].map(li => (
                    <li key={li} className="flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {li}
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/register?role=owner"
                className="bg-white text-primary-700 hover:bg-primary-50 font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 shrink-0 animate-scale-in inline-flex items-center gap-2">
                {t('home.cta_start')}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative py-20 overflow-hidden text-white">
        <BgVideo className="absolute inset-0 w-full h-full object-cover" src="/hero/testimonials.mp4" />
        <div className="absolute inset-0 bg-gray-950/80 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={testRef} className={`reveal ${testVisible ? 'visible' : ''} text-center mb-12`}>
            <p className="eyebrow justify-center mb-3">{t('home.testimonials_eyebrow')}</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-white">{t('home.testimonials_title')}</h2>
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 stagger ${testVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            {[
              { name: 'Yacine B.', role: t('home.role_renter'), text: t('home.testi1'), rating: 5, wilaya: 'Alger' },
              { name: 'Fatima A.', role: t('home.role_owner'), text: t('home.testi2'), rating: 5, wilaya: 'Oran' },
              { name: 'Riadh M.', role: t('home.role_renter'), text: t('home.testi3'), rating: 4, wilaya: 'Constantine' },
            ].map((t2, i) => (
              <div key={i} className="card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-0.5 text-honey-500 mb-3">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} className={`w-4 h-4 ${s <= t2.rating ? 'text-honey-500' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5">"{t2.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold">{t2.name[0]}</div>
                  <div>
                    <p className="font-semibold text-sm">{t2.name}</p>
                    <p className="text-xs text-gray-500">{t2.role} · {t2.wilaya}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
