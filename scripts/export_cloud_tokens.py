#!/usr/bin/env python3
"""Helper script to export Garmin Duo OAuth tokens and LLM config as environment variables for Cloud deployment."""

import os
import base64
from pathlib import Path


def load_local_env():
    """Simple parser to load .env if present without extra dependencies."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


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
    load_local_env()

    print("=" * 70)
    print("🔑 VARIABLES D'ENVIRONNEMENT GARMIN DUO POUR DÉPLOIEMENT CLOUD 24/7")
    print("=" * 70)
    print("Ces variables permettent à votre application hébergée dans le Cloud")
    print("(Render, Railway, Fly.io, VPS) de fonctionner de manière 100% autonome.\n")

    louis_b64 = get_token_b64("louis")
    clara_b64 = get_token_b64("clara")

    if not louis_b64:
        print("⚠️  Tokens de Louis introuvables. Lancez d'abord : uv run garmin-coach --auth-louis")
    if not clara_b64:
        print("⚠️  Tokens de Clara introuvables. Lancez d'abord : uv run garmin-coach --auth-clara")

    # LLM configuration (Priority to your own custom API)
    llm_base = os.getenv("COACH_LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL") or "https://llm.ilaas.fr/v1"
    llm_key = os.getenv("COACH_LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or "076679b2-82f3-4b9b-a966-1aee659a7f14"
    llm_model = os.getenv("COACH_LLM_MODEL") or os.getenv("OPENAI_MODEL") or "qwen-3.6-35b-instruct"

    print("📋 COPIEZ-COLLEZ CES VARIABLES DANS VOTRE HÉBERGEUR CLOUD :")
    print("-" * 70)
    if louis_b64:
        print(f"GARMIN_TOKENS_BASE64={louis_b64}")
    if clara_b64:
        print(f"GARMIN_CLARA_TOKENS_BASE64={clara_b64}")
    print("HOST=0.0.0.0")
    print("PORT=5050")
    print()
    print("# Configuration de votre propre API LLM (OpenAI-compatible / vLLM / LiteLLM) :")
    print(f"COACH_LLM_BASE_URL={llm_base}")
    print(f"COACH_LLM_API_KEY={llm_key}")
    print(f"COACH_LLM_MODEL={llm_model}")
    print()
    print("# Code PIN secret à 4 chiffres pour protéger l'accès public du couple :")
    print("COACH_AUTH_PIN=2027")
    print("-" * 70)
    print("\n✓ Vous utilisez votre propre API LLM sans dépendre de Gemini !")


if __name__ == "__main__":
    main()
