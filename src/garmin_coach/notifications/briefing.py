"""
Automated morning briefing engine for Garmin Coach AI.
Formats daily physiological status, today's workout, and Garmin watch sync status,
and dispatches it via Telegram Bot API or in-app channels.
"""
import os
from datetime import date
from typing import Any, Dict, Optional
import requests
from garmin_coach.database.repository import WorkoutRepository
from garmin_coach.physiology import calculate_acwr


def generate_morning_briefing_text(
    today_iso: Optional[str] = None,
    athlete_name: str = "Louis",
    biometrics: Optional[Dict[str, Any]] = None,
) -> str:
    """Constructs a personal, high-level morning coach debrief."""
    target_date = today_iso or date.today().isoformat()
    plan = WorkoutRepository.get_all()
    today_session = plan.get(target_date)

    bio = biometrics or {}
    readiness = bio.get("readiness_score", 95)
    body_battery = bio.get("body_battery", 73)
    resting_hr = bio.get("resting_hr", 56)
    sleep_hours = bio.get("sleep_hours", 7.5)

    acwr = calculate_acwr()
    acwr_ratio = acwr.get("acwr_ratio", 1.0)
    acwr_label = acwr.get("zone_label", "Optimale")

    if today_session:
        sport = today_session.get("sport", "")
        sport_icon = "🏃‍♂️" if sport == "running" else ("🥏" if sport == "ultimate" else ("🚴" if sport == "cycling" else "🧘"))
        session_title = f"{sport_icon} {today_session.get('type')} ({today_session.get('duration')})"
        focus_str = f"• Focus : {today_session.get('focus')}" if today_session.get('focus') else ""
    else:
        session_title = "🧘 Repos complet ou séance libre"
        focus_str = ""

    briefing = (
        f"🏃‍♂️ *Bonjour {athlete_name} ! Ton Briefing Garmin Coach du jour*\n\n"
        f"📊 *État Physiologique :*\n"
        f"• Préparation physique : *{readiness}/100*\n"
        f"• Body Battery : *{body_battery}%* | FC repos : *{resting_hr} bpm*\n"
        f"• Sommeil : *{sleep_hours}h* réparatrices\n"
        f"• Charge ACWR : *{acwr_ratio}* ({acwr_label})\n\n"
        f"🎯 *Au programme aujourd'hui :*\n"
        f"• {session_title}\n"
    )
    if focus_str:
        briefing += f"{focus_str}\n"

    briefing += (
        f"\n⚡ *Statut Montre :* Vérifie que la montre est synchronisée. "
        f"Bonne séance et n'oublie pas de bien t'hydrater !"
    )
    return briefing


def send_telegram_briefing(
    bot_token: Optional[str] = None,
    chat_id: Optional[str] = None,
    message: Optional[str] = None,
) -> Dict[str, Any]:
    """Sends the morning briefing to a specified Telegram Chat ID."""
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN")
    target_chat = chat_id or os.environ.get("TELEGRAM_CHAT_ID")

    text_to_send = message or generate_morning_briefing_text()

    if not token or not target_chat:
        return {
            "status": "dry_run",
            "message": "Variables TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID non configurées dans .env.",
            "preview_text": text_to_send,
        }

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": target_chat,
        "text": text_to_send,
        "parse_mode": "Markdown",
    }

    try:
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            return {"status": "success", "message": "Briefing Telegram envoyé avec succès !"}
        else:
            return {
                "status": "error",
                "message": f"Erreur API Telegram (HTTP {resp.status_code}): {resp.text}",
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}
