import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const PATHS = {
  id:      'M15 9h3m-3 3h3m-6 4h6a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h2m1-4a2 2 0 11-4 0 2 2 0 014 0zm-2 2a4 4 0 00-3.464 2',
  shield:  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  lock:    'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  star:    'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.977-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.196-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  phone:   'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
};

export default function TrustSafety() {
  const { t } = useTranslation();

  const items = [
    { p: PATHS.id,     title: t('trust.id_verify_title'), desc: t('trust.id_verify_desc'), color: 'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300',
      steps: t('trust.id_steps', { returnObjects: true }) },
    { p: PATHS.shield, title: t('trust.insurance_title'), desc: t('trust.insurance_desc'), color: 'bg-pine-50 dark:bg-pine-500/15 text-pine-600 dark:text-pine-300',
      steps: t('trust.ins_steps', { returnObjects: true }) },
    { p: PATHS.lock,   title: t('trust.escrow_title'), desc: t('trust.escrow_desc'), color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
      steps: t('trust.escrow_steps', { returnObjects: true }) },
    { p: PATHS.star,   title: t('trust.review_title'), desc: t('trust.review_desc'), color: 'bg-honey-50 dark:bg-honey-500/15 text-honey-600 dark:text-honey-400',
      steps: t('trust.review_steps', { returnObjects: true }) },
    { p: PATHS.phone,  title: t('trust.support_title'), desc: t('trust.support_desc'), color: 'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300',
      steps: t('trust.support_steps', { returnObjects: true }) },
  ];

  const Check = () => <svg className="w-4 h-4 text-pine-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;

  const coverage = [
    [t('trust.cov_liability'), true, true],
    [t('trust.cov_damage'), true, true],
    [t('trust.cov_theft'), false, true],
    [t('trust.cov_assist'), true, true],
    [t('trust.cov_franchise'), t('trust.franchise_std'), t('trust.franchise_prem')],
  ];
  const cell = (v) => v === true
    ? <svg className="w-4 h-4 text-pine-500 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
    : v === false ? <span className="text-gray-300">—</span> : v;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-pine-100 dark:bg-pine-500/15 text-pine-600 dark:text-pine-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d={PATHS.shield} /></svg>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-3">{t('trust.title')}</h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">{t('trust.subtitle')}</p>
      </div>

      {/* Trust score */}
      <div className="card p-6 mb-10 bg-pine-50 dark:bg-pine-500/10 border-pine-100 dark:border-pine-500/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-pine-500 text-white flex items-center justify-center shrink-0">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h2 className="font-display font-semibold text-xl text-pine-800 dark:text-pine-200">KriCar Trust Score</h2>
            <p className="text-pine-700 dark:text-pine-300/80 text-sm">{t('trust.score_desc')}</p>
          </div>
          <div className="ml-auto text-right shrink-0">
            <div className="font-display text-4xl font-semibold text-pine-600 dark:text-pine-300">4.9/5</div>
            <div className="text-xs text-pine-600 dark:text-pine-400">{t('trust.satisfaction')}</div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-6">
        {items.map((item, i) => (
          <div key={i} className="card p-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shrink-0`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d={item.p} /></svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{item.desc}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.steps.map((s, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check /><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Insurance details */}
      <div className="mt-10 card p-6">
        <h2 className="font-display font-semibold text-xl text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          {t('trust.coverage_title')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 text-gray-900 font-semibold">{t('trust.col_coverage')}</th>
                <th className="text-center py-2.5 text-gray-900 font-semibold">{t('trust.col_standard')}</th>
                <th className="text-center py-2.5 text-primary-700 font-semibold">{t('trust.col_premium')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              {coverage.map(([label, std, prem], i) => (
                <tr key={i}>
                  <td className="py-2.5">{label}</td>
                  <td className="py-2.5 text-center">{cell(std)}</td>
                  <td className="py-2.5 text-center font-medium">{cell(prem)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-10">
        <Link to="/register" className="btn-primary text-base px-8 py-3">
          {t('trust.cta_btn')}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </Link>
      </div>
    </div>
  );
}
