# Doctrine Duo Pacing Crossover : Synchronisation d'Allures en Couple

## Principe de Croisement d'Allures (Endurance Partagée)
- **Vendredi et Dimanche (Footing Foncier & Sortie Longue) :**
  - L'allure d'endurance fondamentale de Clara (~5:45 - 6:00 min/km) correspond à une allure de récupération Z1/Z2 très douce pour Louis (< 140 bpm).
  - Ce croisement est bénéfique pour les deux :
    - Clara bénéficie d'une régularité métronomique pour consolider son moteur aérobie vers son objectif sub-50.
    - Louis est contraint de brider sa vitesse, ce qui protège ses tendons après les accélérations lactiques de l'Ultimate Frisbee et développe son endurance fondamentale stricte sans dérive cardiaque.

## Synchronisation Temporelle pour les Séances Qualitatives (Mercredi)
- **Partage Spécifique :**
  - Échauffement commun de 15 minutes à allure douce Z1/Z2 (6:00/km) + gammes et éducatifs.
  - Fractions rapides individualisées : privilégier le **fractionné sur base temporelle** plutôt que kilométrique sur piste ou boucle fermée (ex : 6 fractions de 3 minutes chacun).
    - Pendant ces 3 minutes, Louis parcourt ~750m à son allure I (3:50-4:00/km).
    - Clara parcourt ~600m à son allure I (4:40-4:50/km).
    - Ils se retrouvent ensemble sur les temps de récupération au trot lent !
  - Retour au calme partagé : 10 minutes en trot très lent et étirements doux.

## Résolution des Conflits d'Agenda et Créneau Commun Unique
- **Identification mathématique de l'intersection :**
  - Lorsque les emplois du temps du couple divergent (ex : Louis disponible mardi et jeudi soir, Clara disponible mercredi et jeudi soir), le coach recherche immédiatement l'unique créneau commun d'intersection (ici : le jeudi soir).
  - Ce créneau commun est réservé à la séance de synergie Duo (Footing partagé Z2 ou sortie rythmée collective).
  - Les séances individuelles sont réparties de manière harmonieuse sur les autres créneaux disponibles (Louis le mardi, Clara le mercredi), en veillant à ne pas empiler deux séances d'intensité consécutives.

## Gestion des Tensions de Rythme et Discipline du Lièvre (Duo Synergy Logs)
- **Le rôle de lièvre protecteur :**
  - Si lors d'une sortie commune l'athlète le plus rapide (Louis) accélère inconsciemment au-dessus de l'allure prévue, forçant son partenaire (Clara) à dépasser son seuil et finir épuisée (ex: FC moyenne en Zone 3/4 au lieu de Zone 2), le coach doit intervenir avec fermeté et bienveillance.
  - L'incident et le delta de tempo doivent être immédiatement consignés dans la table `duo_synergy_logs` avec l'écart constaté (`pacing_delta_sec`).
  - Le coach rappelle à Louis que son rôle de lièvre exige de se caler strictement sur la respiration et le cardio de Clara. Si Clara ne peut plus parler, Louis va trop vite. Courir au rythme de Clara est un entraînement d'humilité et de discipline aérobie pour Louis.
