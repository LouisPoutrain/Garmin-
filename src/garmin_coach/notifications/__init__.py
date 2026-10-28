"""Notifications package for Garmin Coach AI."""
from garmin_coach.notifications.briefing import (
    generate_morning_briefing_text,
    send_telegram_briefing,
)

__all__ = ["generate_morning_briefing_text", "send_telegram_briefing"]
