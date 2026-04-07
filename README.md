# KickStats

Smart Football Statistics Dashboard

KickStats is a full-stack football analytics platform with:
- React + Vite frontend
- Spring Boot backend API
- FastAPI AI service

For full publishing and deployment instructions, see:
[PUBLISH_GUIDE.txt](/C:/Users/mohit/Desktop/football-analytics-platform/PUBLISH_GUIDE.txt)

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
mvn spring-boot:run
```

### AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## GitHub Pages Deploy

```bash
cd frontend
npm run deploy
```

Expected URL:
`https://mohit-0717.github.io/KickStats/`

