import { Link } from 'react-router-dom';

const IcCalendar = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IcMap = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
const IcFlag = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" /></svg>;

export default function About() {
  const stats = [
    { title: '2023', desc: 'Année de création de KriCar', Icon: IcCalendar },
    { title: '58', desc: 'Wilayas couvertes à travers l\'Algérie', Icon: IcMap },
    { title: '100%', desc: 'Algérien, fait par et pour des Algériens', Icon: IcFlag },
  ];
  const team = [
    { name: 'Amine B.', role: 'CEO & Co-fondateur' },
    { name: 'Meriem K.', role: 'CTO & Co-fondatrice' },
    { name: 'Yacine A.', role: 'Responsable produit' },
    { name: 'Sara M.', role: 'Responsable confiance' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <p className="eyebrow justify-center mb-3">Notre histoire</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-3">À propos de KriCar</h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          La première plateforme algérienne de location de voitures entre particuliers.
        </p>
      </div>

      <div className="card p-8 mb-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-gray-900 mb-4">Notre mission</h2>
        <p className="text-gray-600 leading-relaxed text-lg">
          KriCar est né d'un constat simple : en Algérie, louer une voiture est souvent compliqué,
          cher et peu transparent. Nous avons créé une plateforme qui met en relation directement
          les propriétaires de véhicules avec les personnes qui en ont besoin, dans un cadre
          sécurisé, transparent et à des prix accessibles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map(s => (
          <div key={s.title} className="card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300 flex items-center justify-center">
              <s.Icon className="w-6 h-6" />
            </div>
            <div className="font-display text-3xl font-semibold text-primary-600 mb-1">{s.title}</div>
            <p className="text-sm text-gray-500">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="card p-8 mb-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-gray-900 mb-6">Notre équipe</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {team.map(m => (
            <div key={m.name} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-300 font-display font-semibold text-xl mx-auto mb-2">
                {m.name[0]}
              </div>
              <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
              <p className="text-xs text-gray-500">{m.role}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden text-center bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl p-10 text-white">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative">
          <h2 className="font-display text-2xl md:text-3xl font-semibold mb-2">Rejoignez notre communauté</h2>
          <p className="text-primary-50/90 mb-6">Plus de 2000 utilisateurs nous font déjà confiance.</p>
          <Link to="/register" className="bg-white text-primary-700 hover:bg-primary-50 font-semibold px-8 py-3 rounded-xl transition-colors inline-flex items-center gap-2">
            S'inscrire gratuitement
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
