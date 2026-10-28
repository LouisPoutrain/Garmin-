# Protocole de Récupération VFC : Décision sur Chute du RMSSD Nocturne

## VFC Normale (Baseline ± 1.0 Ecart-Type)
- **Feu Vert :**
  - Le système nerveux autonome est en parfait équilibre. L'athlète peut réaliser la séance prévue, y compris les séances de fractionné, de seuil lactique ou les sorties longues.

## Chute Modérée de VFC (-1.0 à -1.5 Ecart-Type)
- **Adaptation Tactique :**
  - Réduction de **25 % du volume des intervalles**.
  - Si une séance de fractionné court (8x1 min) était programmée, la réduire à 6 répétitions, ou convertir la séance en seuil modéré continu de 20 min en Z3.
  - Surveillance accrue de l'hydratation et du coucher.

## Chute Sévère de VFC (Inférieure à -1.5 Ecart-Type)
- **Suppression d'Intensité Obligatoire (`suppress_intensity = True`) :**
  - Interdiction stricte de toute séance en Zone 4, Zone 5 ou fractionné.
  - Bascule automatique vers une sortie de **récupération active de 30 à 40 minutes en Zone 1** (aisance totale, FC < 125 bpm) ou **repos complet**.
  - Forcer la séance dans cet état multiplie par 3 le risque de blessure tendineuse et induit un état de surentraînement non fonctionnel.

## Rebond Anormal de VFC (+2.0 Ecart-Type avec FC Repos Basse)
- **Alerte Fatigue Parasympathique :**
  - Une VFC artificiellement élevée associée à une sensation de léthargie indique une saturation parasympathique. Pas d'intensité lactique violente : privilégier un footing Z2 régulier pour relancer la réactivité cardiaque.
