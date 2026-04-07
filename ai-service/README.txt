AI service startup

1. Open a terminal in `ai-service`
2. Install dependencies:
   pip install -r requirements.txt
3. Start the service:
   uvicorn main:app --host 0.0.0.0 --port 8001

Endpoints:
- GET `/health`
- POST `/ai/player-similarity`
