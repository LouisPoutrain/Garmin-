#!/usr/bin/env python3
"""Helper script to export Garmin Duo OAuth tokens as base64 environment variables for Cloud deployment."""

import os
import base64
from pathlib import Path


def get_token_b64(athlete: str) -> str:
    home = Path.home()
    if athlete == "louis":
        b64_file = home / ".garminconnect_base64"
        dir_file = home / ".garminconnect" / "garmin_tokens.json"
    else:
        b64_file = home / f".garminconnect_{athlete}_base64"
        dir_file = home / f".garminconnect_{athlete}" / "garmin_tokens.json"

    if b64_file.exists():
        return b64_file.read_text(encoding="utf-8").strip()

    if dir_file.exists():
        raw_json = dir_file.read_text(encoding="utf-8")
        return base64.b64encode(raw_json.encode("utf-8")).decode("utf-8")

    return ""


def main():
    print("=" * 68)
    print("🔑 EXPORT DES TOKENS GARMIN DUO POUR DÉPLOIEMENT CLOUD 24/7")
    print("=" * 68)
    print("Ces variables permettent à votre application hébergée dans le Cloud")
    print("(Render, Railway, Fly.io, VPS) de se connecter automatiquement sans")
    print("aucune saisie de mot de passe ni MFA.\n")

    louis_b64 = get_token_b64("louis")
    clara_b64 = get_token_b64("clara")

    if not louis_b64:
        print("⚠️  Tokens de Louis introuvables. Lancez d'abord : uv run garmin-coach --auth-louis")
    if not clara_b64:
        print("⚠️  Tokens de Clara introuvables. Lancez d'abord : uv run garmin-coach --auth-clara")

    print("📋 COPIEZ-COLLEZ CES VARIABLES DANS VOTRE HÉBERGEUR CLOUD :")
    print("-" * 68)
    if louis_b64:
        print(f"GARMIN_TOKENS_BASE64={louis_b64}")
    if clara_b64:
        print(f"GARMIN_CLARA_TOKENS_BASE64={clara_b64}")
    print("HOST=0.0.0.0")
    print("PORT=5050")
    print("LLM_PROVIDER=gemini")
    print("# Clé API du LLM (ex: Google AI Studio pour Gemini) :")
    print("GEMINI_API_KEY=votre_cle_gemini_ici")
    print("# Code PIN secret à 4 chiffres pour protéger l'accès public du couple :")
    print("COACH_AUTH_PIN=2027")
    print("-" * 68)
    print("\n✓ Tout est prêt pour un déploiement 100% autonome !")


if __name__ == "__main__":
    main()
