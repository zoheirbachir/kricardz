import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/* ── Mini UI icons ── */
const Check = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const Pin = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const Key = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>;
const CarMini = (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M7.5 9h9" /></svg>;

const bar = (w) => <div className={`h-2 rounded-full bg-gray-200 ${w}`} />;

/* ── Phone screens ── */
function AccountScreen() {
  const { t } = useTranslation();
  return (
    <div className="p-4 space-y-3">
      <p className="text-[13px] font-semibold text-gray-900">{t('tutorial.create_account')}</p>
      {[t('tutorial.full_name'), t('tutorial.phone'), t('tutorial.password')].map((l, i) => (
        <div key={l}>
          <div className="text-[9px] text-gray-400 mb-1">{l}</div>
          <div className="h-7 rounded-lg bg-gray-100 ring-1 ring-gray-200" />
        </div>
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        className="flex items-center gap-2 rounded-lg bg-pine-50 ring-1 ring-pine-200 px-2.5 py-2">
        <span className="w-6 h-6 rounded-full bg-pine-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></span>
        <div>
          <p className="text-[10px] font-semibold text-pine-700 leading-tight">{t('tutorial.id_verified')}</p>
          <p className="text-[8px] text-pine-600 leading-tight">{t('tutorial.id_validated')}</p>
        </div>
      </motion.div>
      <div className="h-8 rounded-lg bg-primary-600 text-white text-[10px] font-semibold flex items-center justify-center">{t('tutorial.create_my_account')}</div>
    </div>
  );
}

function SearchScreen() {
  const { t } = useTranslation();
  const cars = [
    { n: 'Citroën C3', w: 'Alger', p: '9 000' },
    { n: 'Renault Mégane', w: 'Oran', p: '9 000' },
    { n: 'Seat Cupra', w: 'Oran', p: '9 000' },
  ];
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 h-8 rounded-lg bg-gray-100 ring-1 ring-gray-200 px-2.5">
        <Pin className="w-3.5 h-3.5 text-primary-500" />
        <span className="text-[10px] text-gray-500">{t('tutorial.search_ph')}</span>
      </div>
      {cars.map((c, i) => (
        <motion.div key={c.n}
          initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.12 }}
          className="flex items-center gap-2.5 rounded-xl ring-1 ring-gray-200 p-2">
          <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shrink-0">
            <CarMini className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-gray-900 truncate">{c.n}</p>
            <p className="text-[8px] text-gray-400">{c.w}</p>
          </div>
          <div className="text-[10px] font-bold text-primary-600 shrink-0">{c.p}<span className="text-[7px] text-gray-400"> {t('tutorial.per_day')}</span></div>
        </motion.div>
      ))}
    </div>
  );
}

function BookScreen() {
  const { t } = useTranslation();
  return (
    <div className="p-4 space-y-3">
      <div className="h-20 rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white">
        <CarMini className="w-9 h-9" />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[9px]"><span className="text-gray-400">{t('tutorial.from')}</span><span className="font-semibold text-gray-700">12/06</span></div>
        <div className="flex justify-between text-[9px]"><span className="text-gray-400">{t('tutorial.to')}</span><span className="font-semibold text-gray-700">15/06</span></div>
        <div className="flex justify-between text-[10px] pt-1 border-t border-gray-100"><span className="text-gray-500">{t('tutorial.total')}</span><span className="font-bold text-primary-600">27 000 DA</span></div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="flex items-center gap-2 rounded-lg bg-pine-50 ring-1 ring-pine-200 px-2.5 py-2">
        <span className="w-6 h-6 rounded-full bg-pine-500 text-white flex items-center justify-center"><Key className="w-3.5 h-3.5" /></span>
        <p className="text-[10px] font-semibold text-pine-700">{t('tutorial.booking_confirmed')}</p>
      </motion.div>
    </div>
  );
}

const STEPS = [
  { n: '01', labelKey: 'tutorial.s1_label', descKey: 'tutorial.s1_desc', Screen: AccountScreen },
  { n: '02', labelKey: 'tutorial.s2_label', descKey: 'tutorial.s2_desc', Screen: SearchScreen },
  { n: '03', labelKey: 'tutorial.s3_label', descKey: 'tutorial.s3_desc', Screen: BookScreen },
];

export default function HowItWorksTutorial() {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const id = setInterval(() => { if (!paused.current) setI(p => (p + 1) % STEPS.length); }, 3600);
    return () => clearInterval(id);
  }, []);

  const Active = STEPS[i].Screen;

  return (
    <div
      className="grid md:grid-cols-2 gap-10 items-center max-w-4xl mx-auto"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      {/* Phone mockup */}
      <div className="flex justify-center order-1 md:order-none">
        <div className="relative w-[228px] rounded-[2.4rem] bg-gray-900 p-2.5 shadow-2xl ring-1 ring-black/10">
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-gray-900 rounded-b-2xl z-10" />
          <div className="relative h-[420px] rounded-[1.9rem] bg-white overflow-hidden">
            {/* status bar */}
            <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[8px] text-gray-400">
              <span>9:41</span><span className="font-semibold text-primary-600">KriCar</span><span>▮▮▮</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Active />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-3">
        {STEPS.map((s, idx) => {
          const active = idx === i;
          return (
            <button
              key={s.n}
              onClick={() => setI(idx)}
              className={`w-full text-left flex gap-4 rounded-2xl p-4 transition-all duration-300 ${
                active ? 'bg-primary-50 dark:bg-primary-500/10 ring-1 ring-primary-200 dark:ring-primary-500/30' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-display font-semibold transition-colors ${
                active ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>{s.n}</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{t(s.labelKey)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(s.descKey)}</p>
              </div>
            </button>
          );
        })}
        {/* progress dots */}
        <div className="flex gap-1.5 pl-4 pt-1">
          {STEPS.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? 'w-6 bg-primary-600' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
