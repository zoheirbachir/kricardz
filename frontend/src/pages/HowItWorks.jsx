import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HowItWorksTutorial from '../components/HowItWorksTutorial';

const Ic = {
  key:    'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  car:    'M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M7.5 9h9',
  user:   'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  doc:    'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  cash:   'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
};

export default function HowItWorks() {
  const { t } = useTranslation();

  const renterSteps = [
    { step: '01', title: t('how.step1_title'), desc: t('how.step1_desc'), d: Ic.user },
    { step: '02', title: t('how.step2_title'), desc: t('how.step2_desc'), d: Ic.search },
    { step: '03', title: t('how.step3_title'), desc: t('how.step3_desc'), d: Ic.car },
  ];
  const ownerSteps = [
    { step: '01', text: t('how.owner_step1'), d: Ic.doc },
    { step: '02', text: t('how.owner_step2'), d: Ic.calendar },
    { step: '03', text: t('how.owner_step3'), d: Ic.cash },
  ];
  const faqs = [
    { q: "Y a-t-il une assurance ?", a: "Oui, chaque location est couverte par notre partenaire assurance. En cas d'accident, notre équipe vous accompagne dans toutes les démarches." },
    { q: "Comment fonctionne le paiement ?", a: "Le paiement est sécurisé et retenu jusqu'à la fin de la location. Le propriétaire est payé uniquement après votre confirmation de réception du véhicule." },
    { q: "Comment les propriétaires sont-ils vérifiés ?", a: "Chaque propriétaire doit fournir une pièce d'identité valide, un selfie et un justificatif de domicile. Notre équipe vérifie chaque dossier manuellement." },
    { q: "Que faire en cas de problème ?", a: "Notre support est disponible 24h/24 et 7j/7. Contactez-nous par téléphone, email ou chat directement depuis l'application." },
    { q: "Y a-t-il des frais pour les propriétaires ?", a: "La publication d'une annonce est 100% gratuite. KriCar prend une petite commission sur chaque location réussie." },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-14">
        <p className="eyebrow justify-center mb-3">Mode d'emploi</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-3">{t('how.title')}</h1>
        <p className="text-xl text-gray-500">{t('how.subtitle')}</p>
      </div>

      {/* Interactive app walkthrough */}
      <div className="mb-16">
        <HowItWorksTutorial />
      </div>

      {/* For renters */}
      <div className="mb-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-gray-900 mb-8 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={Ic.key} /></svg>
          </span>
          Je cherche à louer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renterSteps.map((s, i) => (
            <div key={i} className="relative">
              {i < 2 && <div className="hidden md:block absolute top-8 left-full h-0.5 bg-gray-200 z-0" style={{width: 'calc(100% - 2rem)', marginLeft: '1rem'}} />}
              <div className="card p-6 relative z-10 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-display font-semibold text-sm">{s.step}</div>
                  <span className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d={s.d} /></svg>
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* For owners */}
      <div className="mb-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-gray-900 mb-8 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-pine-100 dark:bg-pine-500/15 flex items-center justify-center text-pine-600 dark:text-pine-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={Ic.car} /></svg>
          </span>
          {t('how.owner_title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ownerSteps.map((s, i) => (
            <div key={i} className="card p-5 flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-pine-500 text-white flex items-center justify-center font-display font-semibold text-sm shrink-0">{s.step}</div>
              <div>
                <span className="inline-flex w-9 h-9 rounded-xl bg-gray-100 items-center justify-center text-gray-500 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d={s.d} /></svg>
                </span>
                <p className="text-sm text-gray-700 font-medium">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-gray-900 mb-8">Questions fréquentes</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="card group">
              <summary className="p-4 font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between gap-3 hover:bg-gray-50 rounded-2xl transition-colors">
                {faq.q}
                <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden text-center bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl p-10 text-white">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative">
          <h2 className="font-display text-2xl md:text-3xl font-semibold mb-2">Prêt à commencer ?</h2>
          <p className="text-primary-50/90 mb-6">Créez votre compte gratuit en moins de 2 minutes.</p>
          <Link to="/register" className="bg-white text-primary-700 hover:bg-primary-50 font-semibold px-8 py-3 rounded-xl transition-colors inline-block">
            S'inscrire gratuitement
          </Link>
        </div>
      </div>
    </div>
  );
}
