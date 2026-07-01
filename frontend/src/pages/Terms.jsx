import { Link } from 'react-router-dom';

const Section = ({ n, title, children }) => (
  <section className="mb-8">
    <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-3">
      <span className="text-primary-500">{n}.</span> {title}
    </h2>
    <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed text-[15px]">{children}</div>
  </section>
);

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <p className="eyebrow mb-1.5">Mentions légales</p>
      <h1 className="section-title mb-2">Conditions générales d'utilisation</h1>
      <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : 1 juillet 2026</p>

      <Section n="1" title="Objet">
        <p>Les présentes conditions régissent l'utilisation de la plateforme KriCar, service algérien de mise en relation pour la location de véhicules entre particuliers et agences. En créant un compte, vous acceptez ces conditions.</p>
      </Section>

      <Section n="2" title="Définitions">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>KriCar</b> : la plateforme (site et application) qui met en relation les parties.</li>
          <li><b>Propriétaire / Agence</b> : l'utilisateur qui propose un véhicule à la location.</li>
          <li><b>Locataire</b> : l'utilisateur qui réserve un véhicule.</li>
          <li><b>Contrat de location</b> : le contrat électronique conclu entre le locataire et le propriétaire / l'agence.</li>
        </ul>
      </Section>

      <Section n="3" title="Inscription et vérification d'identité">
        <p>L'inscription est gratuite. Chaque utilisateur doit fournir des informations exactes et confirmer son adresse email. La location exige une vérification d'identité (KYC) : pièce d'identité ou passeport, numéro d'identité nationale, selfie, et — pour les locataires — un permis de conduire valide (numéro et dates de validité). Toute fausse déclaration entraîne la suspension du compte.</p>
      </Section>

      <Section n="4" title="Rôle de KriCar">
        <p>KriCar est un intermédiaire technique de mise en relation. KriCar n'est pas partie au contrat de location conclu entre le locataire et le propriétaire / l'agence, et ne loue pas de véhicules en son nom propre. KriCar fournit les outils (annonces, réservations, contrats électroniques, cachets, suivi GPS) mais la location relève de la responsabilité des parties.</p>
      </Section>

      <Section n="5" title="Obligations du propriétaire / de l'agence">
        <p>Le propriétaire garantit être en droit de louer le véhicule, que celui-ci est en bon état, assuré et conforme à la réglementation algérienne. Les agences doivent fournir un registre de commerce valide. Les informations de l'annonce (état, prix, disponibilité) doivent être exactes.</p>
      </Section>

      <Section n="6" title="Obligations du locataire">
        <p>Le locataire doit détenir un permis de conduire valide, utiliser le véhicule en bon père de famille, respecter le code de la route et restituer le véhicule dans l'état et les délais convenus. Toute infraction ou dommage relève de sa responsabilité.</p>
      </Section>

      <Section n="7" title="Contrats électroniques et cachets">
        <p>À chaque location, un contrat électronique est généré automatiquement, scellé par les cachets électroniques de KriCar et de l'agence. Chaque contrat porte un numéro unique et un QR code permettant de vérifier son authenticité. Un document ne portant pas ces cachets est considéré comme non valide.</p>
      </Section>

      <Section n="8" title="Réservations, prix et caution">
        <p>Les prix sont affichés en dinars algériens (DA) et fixés par le propriétaire / l'agence. Une caution peut être exigée et restituée en l'absence de dommage. Les modalités de paiement sont convenues entre les parties.</p>
      </Section>

      <Section n="9" title="Programme partenaire fondateur">
        <p>Les agences qui rejoignent la Plateforme durant la phase de lancement bénéficient de 3 mois d'utilisation gratuite et d'une réduction permanente de 30% à l'ouverture du paiement électronique. Ces avantages sont formalisés dans le contrat de partenariat électronique.</p>
      </Section>

      <Section n="10" title="Responsabilité">
        <p>KriCar ne saurait être tenu responsable des litiges, dommages ou manquements liés à l'exécution du contrat de location entre les parties. KriCar met en œuvre des moyens raisonnables (vérification d'identité, contrats, support) pour sécuriser les transactions, sans garantie de résultat.</p>
      </Section>

      <Section n="11" title="Suspension et résiliation">
        <p>KriCar peut suspendre ou supprimer tout compte en cas de fraude, de fausse déclaration, de comportement abusif ou de violation des présentes conditions. Vous pouvez supprimer votre compte à tout moment.</p>
      </Section>

      <Section n="12" title="Données personnelles">
        <p>Le traitement de vos données est décrit dans notre <Link to="/privacy" className="text-primary-600 hover:underline">Politique de confidentialité</Link>.</p>
      </Section>

      <Section n="13" title="Droit applicable">
        <p>Les présentes conditions sont régies par le droit algérien. Tout litige relève de la compétence des juridictions algériennes. Pour toute question : <a href="mailto:Kricar.services@gmail.com" className="text-primary-600 hover:underline">Kricar.services@gmail.com</a>.</p>
      </Section>
    </div>
  );
}
