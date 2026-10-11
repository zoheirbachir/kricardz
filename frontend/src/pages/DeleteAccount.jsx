import { Link } from 'react-router-dom';

const Section = ({ n, title, children }) => (
  <section className="mb-8">
    <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-3">
      <span className="text-primary-500">{n}.</span> {title}
    </h2>
    <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed text-[15px]">{children}</div>
  </section>
);

/* Public page required by Google Play: how a user requests deletion of their
   DzKricar account and associated data. Linked from the Play Store listing. */
export default function DeleteAccount() {
  const subject = encodeURIComponent('Suppression de compte DzKricar');
  const body = encodeURIComponent(
    "Bonjour,\n\nJe demande la suppression de mon compte DzKricar et des données associées.\n\nEmail du compte : \nNom : \nTéléphone : \n\nMerci."
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <p className="eyebrow mb-1.5">Compte & données</p>
      <h1 className="section-title mb-2">Supprimer mon compte DzKricar</h1>
      <p className="text-sm text-gray-400 mb-8">Suppression du compte et des données associées — application et site web (dz.kricar.app).</p>

      <Section n="1" title="Comment demander la suppression">
        <p>Vous pouvez demander la suppression de votre compte DzKricar et des données associées de deux façons :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Depuis l'application :</b> connectez-vous, ouvrez votre profil, puis « Supprimer mon compte ».</li>
          <li><b>Par email :</b> écrivez-nous depuis l'adresse email de votre compte en précisant votre nom et votre numéro de téléphone.</li>
        </ul>
        <div className="mt-4">
          <a href={`mailto:Kricar.services@gmail.com?subject=${subject}&body=${body}`}
            className="btn-primary text-sm inline-flex">
            Demander la suppression par email
          </a>
          <p className="text-xs text-gray-400 mt-2">
            Email : <a href="mailto:Kricar.services@gmail.com" className="text-primary-600 hover:underline">Kricar.services@gmail.com</a>
            {' '}· Tél. <a href="tel:+213673590224" className="text-primary-600 hover:underline">+213 673 59 02 24</a>
          </p>
        </div>
      </Section>

      <Section n="2" title="Données supprimées">
        <p>À la suppression de votre compte, nous effaçons :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>votre profil (nom, email, téléphone, photo de profil) ;</li>
          <li>vos documents de vérification d'identité (pièce d'identité, permis, selfie) ;</li>
          <li>vos annonces de véhicules et les photos associées ;</li>
          <li>vos avis, messages et préférences.</li>
        </ul>
      </Section>

      <Section n="3" title="Données conservées (obligations légales)">
        <p>Certaines données sont conservées pour une durée limitée lorsque la loi l'exige ou pour prévenir la fraude et régler d'éventuels litiges :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>les <b>contrats de location électroniques signés</b> et leurs preuves (cachets, consentements, relevés de l'état des lieux) ;</li>
          <li>les données strictement nécessaires au respect de nos obligations légales et comptables.</li>
        </ul>
        <p>Ces données sont supprimées à l'expiration des délais légaux de conservation.</p>
      </Section>

      <Section n="4" title="Délai de traitement">
        <p>Votre demande est traitée dans un délai maximal de <b>30 jours</b>. Vous recevrez une confirmation une fois la suppression effectuée.</p>
      </Section>

      <Section n="5" title="En savoir plus">
        <p>
          Voir aussi notre <Link to="/privacy" className="text-primary-600 hover:underline">Politique de confidentialité</Link>
          {' '}et nos <Link to="/terms" className="text-primary-600 hover:underline">Conditions générales d'utilisation</Link>.
        </p>
      </Section>
    </div>
  );
}
