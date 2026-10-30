"""CLI runner for Garmin Coach."""

import sys
import argparse
from datetime import date
from garmin_coach.profile import AthleteProfile
from garmin_coach.analyzer import CoachAnalyzer
from garmin_coach.planner import CoachPlanner


def main():
    parser = argparse.ArgumentParser(description="Garmin Adaptive Coach CLI")
    parser.add_argument("--check-profile", action="store_true", help="Vérifie le profil athlète")
    parser.add_argument("--athlete", type=str, default="louis", choices=["louis", "clara"], help="Choix de l'athlète (louis ou clara)")
    parser.add_argument("--weekly-plan", action="store_true", help="Affiche le canevas de la semaine")
    parser.add_argument("--auth-clara", action="store_true", help="Authentification interactive Garmin Connect pour Clara")
    parser.add_argument("--auth-louis", action="store_true", help="Authentification interactive Garmin Connect pour Louis")
    parser.add_argument("--web", action="store_true", help="Lance l'interface Web du Coach")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Adresse d'écoute du serveur (défaut: 0.0.0.0 pour accès réseau local / Wi-Fi)")
    parser.add_argument("--port", type=int, default=5050, help="Port d'écoute pour l'interface Web (défaut: 5050)")
    args = parser.parse_args()

    if args.auth_clara or args.auth_louis:
        target_athlete = "clara" if args.auth_clara else "louis"
        from garmin_mcp.auth_cli import authenticate
        from garmin_mcp.token_utils import get_athlete_token_path, get_athlete_token_base64_path
        print(f"\n🔐 === Authentification Garmin Connect pour {target_athlete.capitalize()} ===")
        success = authenticate(
            token_path=get_athlete_token_path(target_athlete),
            token_base64_path=get_athlete_token_base64_path(target_athlete),
        )
        if success:
            print(f"\n🎉 Compte Garmin de {target_athlete.capitalize()} connecté avec succès !")
        sys.exit(0 if success else 1)

    if args.web:
        from garmin_coach.web.app import run_web
        run_web(host=args.host, port=args.port)
        return

    profile = AthleteProfile.load(args.athlete)
    analyzer = CoachAnalyzer(profile)
    planner = CoachPlanner(profile)

    if args.weekly_plan:
        print(f"\n=== Canevas d'Entraînement Polarisé pour {profile.name} ===")
        print(f"Objectif : {profile.primary_goal}\n")
        plan = planner.generate_weekly_template()
        for s in plan:
            print(f"• {s['day']:<10} | {s['type']:<35} | {s['duration']:<10} -> {s['focus']}")
        print()
        return

    print(f"\nGarmin Adaptive Coach initialisé pour : {profile.name}")
    print(f"• Sports principaux : {', '.join(profile.primary_sports)}")
    print(f"• Objectif : {profile.primary_goal}")
    print(f"• Seuil FC Z2 : {profile.hr_zones.get('Z2_endurance', [])} bpm")
    print("\nAstuce : Demandez directement à votre agent Gemini dans l'IDE :")
    print("  - 'Coach, fais mon check-in du jour'")
    print("  - 'Coach, analyse ma dernière séance'")
    print("  - 'Coach, planifie ma semaine'\n")


if __name__ == "__main__":
    main()
