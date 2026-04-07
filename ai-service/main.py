import json
import os
import re
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from scipy.stats import poisson
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

app = FastAPI(title="KickStats AI Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FEATURE_LABELS = {
    "goals": "Goal output",
    "assists": "Creative output",
    "minutes": "Match involvement",
    "yellow_cards": "Discipline profile",
    "red_cards": "Risk profile"
}

FACTUAL_QUERY_HINTS = [
    "top", "most", "least", "show", "list", "who has", "who is", "which", "how many",
    "goals", "assists", "minutes", "cards", "points", "position", "standings", "fixtures",
    "matches", "injuries", "transfers", "stadium", "referee", "manager", "player", "team",
    "oldest", "youngest", "highest", "lowest", "recent", "latest", "current", "tomorrow", "today",
    "weekend", "under ", "over ", "more than", "less than", "value", "market value",
    "transfer fee", "transfer fees", "fee", "fees", "capacity", "scorer", "scorers"
]

SYSTEM_PROMPT = """
### IDENTITY
You are Pulse AI Scout for the KickStats platform in 2026.
Your default job is not casual chat. Your job is to translate football questions into SQL so the database can answer them.
Assume the database is the source of truth.
If a football question can be answered from the schema, generate SQL instead of saying you cannot.
You must choose exactly one of two response modes:
1. DATA QUERY: return a valid MySQL SELECT query only.
2. NARRATIVE: only for subjective, conversational, opinion-based, or schema-unsupported questions, return a short plain-text response starting with NARRATIVE:

### ACTUAL DATABASE SCHEMA
- player (player_id, first_name, last_name, position, nationality, preferred_foot, height, weight, dob)
- team (team_id, team_name, home_city, founded_year, stadium_id, manager_id)
- matches (match_id, season_id, stadium_id, referee_id, match_date, stage, status)
- player_stats (player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played)
- team_match_stats (match_id, team_id, goals, possession, shots_on_target, total_shots, fouls, corners, yellow_cards, red_cards)
- team_standings (team_id, position, points, wins, draws, losses, goals_for, goals_against, matches_played)
- transfer_history (transfer_id, player_id, from_team_id, to_team_id, transfer_fee, transfer_date, contract_length)
- injuries (injury_id, player_id, type, return_date)
- stadium (stadium_id, stadium_name, city, country, capacity)
- referee (referee_id, first_name, last_name, nationality, experience_years)
- sponsor (sponsor_id, sponsor_name, industry, country)
- team_sponsor (team_id, sponsor_id, sponsorship_value, contract_start, contract_end)
- users (user_id, username, email, fav_team_id, created_at)
- manager (manager_id, first_name, last_name)

### RULES
1. For factual stats, standings, injuries, transfers, matches, sponsors, teams, players, managers, referees, or stadium questions, return ONLY the raw SQL query string.
2. For subjective prompts like "who is the king", chit-chat, opinions, predictions outside the supported data, or requests that cannot be answered from this schema, return ONLY a short response beginning with NARRATIVE:
3. For SQL mode, generate SELECT queries only.
4. Never use DROP, DELETE, UPDATE, INSERT, TRUNCATE, ALTER, GRANT, REPLACE, or CREATE.
5. Use exact table and column names from this schema.
6. Use explicit JOIN keys such as player.player_id = player_stats.player_id.
7. Use CONCAT(player.first_name, ' ', player.last_name) when the user asks for a full player name.
8. Use CONCAT(referee.first_name, ' ', referee.last_name) and CONCAT(manager.first_name, ' ', manager.last_name) for full names.
9. Append LIMIT 15 unless the user explicitly requests another limit.
10. Do not query tables outside the schema above.
11. Do not use markdown, comments, or explanations.
12. Never answer a factual football question with "I cannot" or "I do not know" if a query could be used to search the schema.
13. Today is Monday, April 6, 2026. Use that date context for words like current, recent, today, tomorrow, and weekend.
14. Player scoring, assists, cards, and minutes are stored in player_stats, not player.
15. For total goals, total assists, total cards, or total minutes by player, use SUM(...) from player_stats and GROUP BY player.player_id plus the selected player identity columns.
16. For conditions like "more than 5 goals" across a player's total output, use HAVING on the aggregated alias or SUM expression, not WHERE on player_stats.goals.
17. If a question asks for player stats together with age, nationality, or position, JOIN player with player_stats on player.player_id = player_stats.player_id.
18. The live schema does not expose player.market_value. For valuable, market value, expensive, or highest value player queries, use the latest transfer_history.transfer_fee as the valuation proxy.
19. To find a player's current valuation proxy, join transfer_history and use the most recent transfer_date per player.
20. transfer_fee is stored as a full numeric value, so 40 million means 40000000.
21. The player table does not store age directly. Derive age with TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) when age is requested.
22. Do not invent columns such as player.age or player.market_value if they are not listed in the schema. Use the closest real column or computed expression.
23. Be tolerant of football typos such as scrores, scorres, asists, or injuried. Infer the intended football stat when it is obvious.
24. For prompts like "who is the king" or similar legend/opinion questions, return NARRATIVE: While the database shows stats, the king is a matter of legend. Who is your pick?
25. When asked for goal involvements, contributions, or combined attacking output, use COALESCE(SUM(ps.goals), 0) + COALESCE(SUM(ps.assists), 0).
26. Always join player p and player_stats ps with p.player_id = ps.player_id when combining player identity with stats.
27. For filters on aggregated totals such as goals, assists, contributions, or minutes, use HAVING instead of WHERE.
28. Never invent aliases like total_contributions in WHERE. If you define an aggregate alias, only filter it in HAVING or repeat the aggregate expression.

### EXAMPLE AGGREGATION
SELECT p.player_id, p.first_name, p.last_name, SUM(ps.goals) AS total_goals
FROM player p
JOIN player_stats ps ON p.player_id = ps.player_id
GROUP BY p.player_id, p.first_name, p.last_name
HAVING SUM(ps.goals) > 5
LIMIT 15

### EXAMPLE VALUE PROXY
SELECT p.player_id, p.first_name, p.last_name, latest_transfer.transfer_fee AS valuation_proxy
FROM player p
JOIN (
    SELECT th1.player_id, th1.transfer_fee
    FROM transfer_history th1
    JOIN (
        SELECT player_id, MAX(transfer_date) AS latest_transfer_date
        FROM transfer_history
        GROUP BY player_id
    ) latest ON latest.player_id = th1.player_id AND latest.latest_transfer_date = th1.transfer_date
) latest_transfer ON latest_transfer.player_id = p.player_id
ORDER BY latest_transfer.transfer_fee DESC
LIMIT 15

### EXAMPLE CONTRIBUTIONS
SELECT
    p.player_id,
    p.first_name,
    p.last_name,
    COALESCE(SUM(ps.goals), 0) AS total_goals,
    COALESCE(SUM(ps.assists), 0) AS total_assists,
    COALESCE(SUM(ps.goals), 0) + COALESCE(SUM(ps.assists), 0) AS total_contributions
FROM player p
JOIN player_stats ps ON p.player_id = ps.player_id
GROUP BY p.player_id, p.first_name, p.last_name
HAVING COALESCE(SUM(ps.goals), 0) + COALESCE(SUM(ps.assists), 0) > 5
ORDER BY total_contributions DESC
LIMIT 15
"""

FAST_SCOUT_PROMPT = (
    "You are Pulse AI Fast Scout. "
    "Reply in under 20 words, keep it sharp, football-focused, and helpful."
)

SUMMARY_PROMPT = (
    "You are Pulse AI, an elite football scout writing a concise Monday review for April 6, 2026. "
    "Read the result rows and give exactly one full sentence between 14 and 28 words. "
    "Do not just repeat a single name. "
    "Call out the main football insight, comparison, lead, gap, trend, or pressure point in natural language. "
    "Use at least one specific value or ranking relationship when the data supports it. "
    "Do not mention SQL, rows, tables, or JSON. "
    "Do not use bullet points or quotation marks."
)


def load_env_file() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")

SQL_MODEL = "llama3.1-8b"
SCOUT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


class SimilarityPoolRow(BaseModel):
    player_id: int
    player_name: str
    goals: float
    assists: float
    minutes: float
    yellow_cards: float
    red_cards: float


class SimilarityRequest(BaseModel):
    target_id: int
    pool: list[SimilarityPoolRow]


class OracleRequest(BaseModel):
    home_scored_avg: float
    home_conceded_avg: float
    away_scored_avg: float
    away_conceded_avg: float


class AssistantRequest(BaseModel):
    query: str


class SummaryRequest(BaseModel):
    query: str
    data: list[dict]


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/ai/player-similarity")
async def get_similarity(req: SimilarityRequest) -> list[dict]:
    if len(req.pool) < 2:
        return []

    df = pd.DataFrame([row.model_dump() for row in req.pool])
    features = list(FEATURE_LABELS.keys())

    if req.target_id not in df["player_id"].values:
        raise HTTPException(status_code=404, detail="Player not found in similarity pool")

    scaler = MinMaxScaler()
    df_norm = pd.DataFrame(scaler.fit_transform(df[features]), columns=features)

    target_idx = df.index[df["player_id"] == req.target_id].tolist()[0]
    target_vec = df_norm.iloc[target_idx].values.reshape(1, -1)

    scores = cosine_similarity(target_vec, df_norm)
    df["score"] = scores[0]

    top_5 = df[df["player_id"] != req.target_id].nlargest(5, "score")
    results = []

    for idx, row in top_5.iterrows():
        deltas = {
            feature: abs(df_norm.iloc[target_idx][feature] - df_norm.iloc[idx][feature])
            for feature in features
        }
        best_matches = sorted(deltas, key=deltas.get)[:3]
        explanations = [f"Similar {FEATURE_LABELS[feature]}" for feature in best_matches]

        results.append({
            "player_id": int(row["player_id"]),
            "score": float(row["score"]),
            "explanations": explanations
        })

    return results


@app.post("/ai/win-probability")
async def get_win_probability(req: OracleRequest) -> dict:
    h_lambda = (req.home_scored_avg + req.away_conceded_avg) / 2
    a_lambda = (req.away_scored_avg + req.home_conceded_avg) / 2

    max_goals = 6
    h_probs = [poisson.pmf(i, h_lambda) for i in range(max_goals)]
    a_probs = [poisson.pmf(i, a_lambda) for i in range(max_goals)]
    matrix = np.outer(h_probs, a_probs)

    home_win = float(np.sum(np.tril(matrix, -1)))
    draw = float(np.sum(np.diag(matrix)))
    away_win = float(np.sum(np.triu(matrix, 1)))
    projected_home, projected_away = np.unravel_index(matrix.argmax(), matrix.shape)
    delta = abs(home_win - away_win)
    total_expected_goals = round(h_lambda + a_lambda, 2)

    if delta >= 0.40:
        confidence_band = "HIGH_CONFIDENCE"
        narrative = "Dominant Projection"
    elif draw > 0.28 or total_expected_goals > 3.8:
        confidence_band = "VOLATILE"
        narrative = "Volatile Fixture"
    else:
        confidence_band = "BALANCED"
        narrative = "Balanced Match"

    return {
        "projected_score": f"{projected_home}-{projected_away}",
        "home_win": home_win,
        "draw": draw,
        "away_win": away_win,
        "home_lambda": round(h_lambda, 2),
        "away_lambda": round(a_lambda, 2),
        "confidence_band": confidence_band,
        "narrative": narrative,
        "total_expected_goals": total_expected_goals
    }


def sanitize_sql(raw_text: str) -> str:
    candidate = raw_text.strip()
    if candidate.startswith("```"):
        candidate = candidate.replace("```sql", "").replace("```", "").strip()
    return candidate


def is_query_safe(sql_string: str) -> bool:
    sql = sql_string.strip().upper()
    forbidden_keywords = [
        "DROP", "DELETE", "UPDATE", "INSERT", "TRUNCATE",
        "ALTER", "GRANT", "REPLACE", "CREATE"
    ]

    if not sql.startswith("SELECT"):
        return False

    if any(keyword in sql for keyword in forbidden_keywords):
        return False

    return ";" not in sql[:-1]


def looks_like_factual_query(user_query: str) -> bool:
    normalized = user_query.strip().lower()
    return any(hint in normalized for hint in FACTUAL_QUERY_HINTS)


def extract_requested_limit(user_query: str, default_limit: int = 15) -> int:
    patterns = [
        r"\btop\s+(\d+)\b",
        r"\bmost\s+(\d+)\b",
        r"\b(\d+)\s+(?:most|top)\b",
        r"\blimit\s+(\d+)\b"
    ]
    for pattern in patterns:
        match = re.search(pattern, user_query.lower())
        if match:
            return max(1, min(int(match.group(1)), 50))
    return default_limit


def build_value_proxy_query(user_query: str) -> str:
    limit_value = extract_requested_limit(user_query)
    normalized = user_query.lower()

    age_filter = ""
    if "u21" in normalized or "under 21" in normalized:
        age_filter = "WHERE TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) < 21"
    elif "u23" in normalized or "under 23" in normalized:
        age_filter = "WHERE TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) < 23"

    return f"""
SELECT
    p.player_id,
    p.first_name,
    p.last_name,
    TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) AS age,
    latest_transfer.transfer_fee AS latest_transfer_fee
FROM player p
JOIN (
    SELECT th1.player_id, th1.transfer_fee
    FROM transfer_history th1
    JOIN (
        SELECT player_id, MAX(transfer_date) AS latest_transfer_date
        FROM transfer_history
        GROUP BY player_id
    ) latest ON latest.player_id = th1.player_id AND latest.latest_transfer_date = th1.transfer_date
) latest_transfer ON latest_transfer.player_id = p.player_id
{age_filter}
ORDER BY latest_transfer.transfer_fee DESC
LIMIT {limit_value}
""".strip()


def has_value_proxy_intent(user_query: str) -> bool:
    normalized = user_query.lower()
    return any(term in normalized for term in [
        "valuable",
        "market value",
        "most valuable",
        "highest value",
        "transfer fee",
        "highest fee",
        "latest transfer fee",
        "fee",
        "cost"
    ])


def generated_sql_has_known_schema_errors(sql: str) -> bool:
    normalized = sql.lower()

    if "market_value" in normalized:
        return True

    if " where " in normalized and ("sum(" in normalized or "avg(" in normalized or "count(" in normalized):
        return True

    if "sum(ps.goals) + sum(ps.goals)" in normalized:
        return True

    return False


def get_groq_client() -> OpenAI:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing from ai-service/.env")
    return OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")


def get_cerebras_client() -> OpenAI:
    if not CEREBRAS_API_KEY:
        raise HTTPException(status_code=500, detail="CEREBRAS_API_KEY is missing from ai-service/.env")
    return OpenAI(api_key=CEREBRAS_API_KEY, base_url="https://api.cerebras.ai/v1")


def generate_sql_with_router(user_query: str) -> str:
    sql_client = get_cerebras_client()

    normalized_query = (
        user_query.replace("scrores", "scorers")
        .replace("scrore", "score")
        .replace("scorres", "scorers")
        .replace("asists", "assists")
        .replace("injuried", "injured")
    )

    if has_value_proxy_intent(normalized_query):
        return build_value_proxy_query(normalized_query)

    try:
        response = sql_client.chat.completions.create(
            model=SQL_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": normalized_query}
            ],
            temperature=0.0,
            max_tokens=300
        )
    except Exception as request_error:
        raise HTTPException(status_code=502, detail=f"Cerebras API error: {request_error}") from request_error

    raw_text = (response.choices[0].message.content or "").strip()

    candidate = sanitize_sql(raw_text)

    factual_query = looks_like_factual_query(normalized_query)

    if candidate.upper().startswith("NARRATIVE:") and not factual_query:
        return candidate

    if is_query_safe(candidate) and not generated_sql_has_known_schema_errors(candidate):
        return candidate

    try:
        retry_response = sql_client.chat.completions.create(
            model=SQL_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "The previous answer did not follow the rules. "
                        "For this football request, return ONLY one valid MySQL SELECT query if the schema can answer it. "
                        "Do not apologize. Do not explain. Do not chat. "
                        "If age is requested, compute it from p.dob using TIMESTAMPDIFF(YEAR, p.dob, CURDATE()). "
                        "If totals are requested from player_stats, use SUM(...) with GROUP BY and HAVING when needed. "
                        "Only if the request is truly subjective or impossible from the schema, return NARRATIVE: followed by one short sentence.\n"
                        f"Original user question: {normalized_query}"
                    )
                }
            ],
            temperature=0.0,
            max_tokens=300
        )
    except Exception as request_error:
        raise HTTPException(status_code=502, detail=f"Cerebras API error: {request_error}") from request_error

    retry_text = (retry_response.choices[0].message.content or "").strip()
    retried_candidate = sanitize_sql(retry_text)

    if retried_candidate.upper().startswith("NARRATIVE:") and not factual_query:
        return retried_candidate

    if is_query_safe(retried_candidate) and not generated_sql_has_known_schema_errors(retried_candidate):
        return retried_candidate

    if has_value_proxy_intent(normalized_query):
        return build_value_proxy_query(normalized_query)

    return "NARRATIVE: I could not safely compile that football request into the live schema. Try a clearer phrasing around goals, assists, standings, fixtures, injuries, or latest transfer fee."


def generate_summary_with_router(user_query: str, result_rows: list[dict]) -> str:
    groq_client = get_groq_client()
    try:
        response = groq_client.chat.completions.create(
            model=SCOUT_MODEL,
            messages=[
                {"role": "system", "content": SUMMARY_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"User question: {user_query}\n"
                        f"Result rows: {json.dumps(result_rows, ensure_ascii=True)}"
                    )
                }
            ],
            temperature=0.2,
            max_tokens=120
        )
    except Exception as request_error:
        raise HTTPException(status_code=502, detail=f"Groq API error: {request_error}") from request_error

    cleaned = sanitize_sql((response.choices[0].message.content or "").strip())

    if len(cleaned.split()) < 6:
        first_row = result_rows[0]
        highlighted_bits = [f"{key} {value}" for key, value in first_row.items()][:2]
        return "Pulse AI flags the standout line as " + ", ".join(highlighted_bits) + "."

    return cleaned


def generate_narrative_with_router(user_query: str) -> str:
    groq_client = get_groq_client()

    try:
        response = groq_client.chat.completions.create(
            model=SCOUT_MODEL,
            messages=[
                {"role": "system", "content": FAST_SCOUT_PROMPT},
                {"role": "user", "content": user_query}
            ],
            temperature=0.4,
            max_tokens=80
        )
    except Exception as request_error:
        raise HTTPException(status_code=502, detail=f"Groq API error: {request_error}") from request_error

    return sanitize_sql((response.choices[0].message.content or "").strip())


@app.post("/ai/pulse-assistant")
async def generate_sql(request_payload: AssistantRequest) -> dict:
    if looks_like_factual_query(request_payload.query):
        payload = generate_sql_with_router(request_payload.query)
    else:
        payload = "NARRATIVE: " + generate_narrative_with_router(request_payload.query)

    if payload.upper().startswith("NARRATIVE:"):
        return {
            "query": request_payload.query,
            "type": "narrative",
            "response_type": "narrative",
            "payload": payload[len("NARRATIVE:"):].strip()
        }

    if not is_query_safe(payload):
        raise HTTPException(status_code=403, detail="Unsafe query blocked.")

    return {
        "query": request_payload.query,
        "type": "sql",
        "response_type": "sql",
        "payload": payload,
        "generated_sql": payload,
        "status": "APPROVED"
    }


@app.post("/ai/summarize-results")
async def summarize_results(request_payload: SummaryRequest) -> dict:
    if not request_payload.data:
        return {"summary": "No matching football records were returned for that question."}

    return {
        "summary": generate_summary_with_router(
            request_payload.query,
            request_payload.data[:8]
        )
    }
