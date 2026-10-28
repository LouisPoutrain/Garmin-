"""Sports science web search provider using DuckDuckGo Lite.

Only triggers for genuine sports science, physiology, biomechanics,
nutrition, or recovery questions. Explicitly ignores planning, scheduling,
personal status, and routine check-ins to prevent prompt pollution.
"""

import re
import urllib.parse
from typing import List, Dict, Any
import requests

# Science & physiology keywords that warrant web retrieval
SCIENCE_KEYWORDS = [
    "vo2", "vo2max", "seuil", "lactat", "vma", "filière aérobie", "anaérobie",
    "polarisé", "80/20", "seuil anaérobie", "seuil aérobie", "clairance",
    "cadence", "foulée", "médio-pied", "chaussures carbone", "drop chaussure",
    "tendinite", "fasciite", "périostite", "aponévrose", "essuie-glace",
    "nutrition", "glucides", "glycogène", "bain froid", "cryothérapie",
    "mitochondrie", "capillarisation", "hrv", "variabilité cardiaque",
    "science", "étude", "scientifique", "recherche sur le web", "cherche sur internet",
]

# Blacklisted intents: planning, schedule, personal feedback, greetings
IGNORE_INTENTS = [
    "planning", "semaine", "calendrier", "prévu", "programme", "prochaine séance",
    "séance du jour", "qu'est-ce qu'on fait", "que fait-on", "emploi du temps",
    "demain", "aujourd'hui", "hier", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
    "rappel", "rappelle", "check-in", "salut", "bonjour", "merci", "ça va",
    "fatigué", "courbature", "body battery", "readiness", "score", "montre",
    "garmin", "mon record", "mes stats", "comment je vais"
]


def is_sports_science_query(query: str) -> bool:
    """Returns True ONLY if the query genuinely asks for sports science / physiology knowledge."""
    lower = query.lower().strip()
    if not lower:
        return False

    # 1. Never search web for planning, scheduling, or routine conversation
    if any(intent in lower for intent in ["planning", "semaine", "calendrier", "programme", "prévu", "emploi du temps", "prochaine séance"]):
        return False

    # 2. Check for explicit web research intent
    if any(explicit in lower for explicit in ["cherche sur", "recherche sur le web", "d'après la science", "études scientifiques", "que dit la recherche"]):
        return True

    # 3. Check for specific sports science keywords
    match_count = sum(1 for kw in SCIENCE_KEYWORDS if kw in lower)
    return match_count >= 1


def build_expert_search_query(user_query: str) -> str:
    """Transforms a conversational query into a targeted sports science search query."""
    clean = re.sub(r'[?!.,;:]', ' ', user_query)
    lower = clean.lower()
    
    # Extract matching scientific terms
    found_keywords = [kw for kw in SCIENCE_KEYWORDS if kw in lower]
    if found_keywords:
        return f"course à pied entrainement {' '.join(found_keywords[:3])}"
    
    # Fallback to cleaned sentence with sports context
    words = [w for w in clean.split() if len(w) > 3 and w.lower() not in IGNORE_INTENTS]
    return f"course à pied {' '.join(words[:4])}"


def search_sports_science(query: str, max_results: int = 3) -> List[Dict[str, str]]:
    """Performs a targeted sports science web search if relevant, otherwise returns empty list."""
    if not is_sports_science_query(query):
        return []

    expert_query = build_expert_search_query(query)
    print(f"🔎 Recherche scientifique web déclenchée : '{expert_query}'")

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    }
    
    try:
        response = requests.post(
            "https://lite.duckduckgo.com/lite/",
            data={"q": expert_query},
            headers=headers,
            timeout=7,
        )
        if response.status_code not in (200, 202):
            return []

        html = response.text
        a_tags = re.findall(r'(<a[^>]+class=[\'\"][^\'\"]*result-link[^\'\"]*[\'\"][^>]*>.*?</a>)', html)
        snippets = re.findall(r'<td class=[\'\"]result-snippet[\'\"]>(.*?)</td>', html, re.DOTALL)

        results = []
        for i in range(min(len(a_tags), len(snippets), max_results)):
            tag = a_tags[i]
            href_m = re.search(r'href=[\'\"]([^\'\"]+)[\'\"]', tag)
            raw_url = href_m.group(1) if href_m else ""
            
            # Clean URL
            url = urllib.parse.unquote(raw_url).strip()
            if "uddg=" in url:
                match = re.search(r'uddg=([^&]+)', url)
                if match:
                    url = urllib.parse.unquote(match.group(1))

            title = re.sub(r'<.*?>', '', tag).strip()
            title = title.replace("&#x27;", "'").replace("&quot;", '"').replace("&amp;", "&")
            
            snippet = re.sub(r'<.*?>', '', snippets[i]).strip()
            snippet = snippet.replace("&#x27;", "'").replace("&quot;", '"').replace("&amp;", "&")

            if title and snippet and len(snippet) > 20:
                results.append({
                    "title": title,
                    "snippet": snippet,
                    "url": url,
                })

        return results

    except Exception as e:
        print(f"Web search warning: {e}")
        return []
