# AI Travel Planner

An AI-powered travel planning web application that generates personalized trip itineraries, visualizes destinations on interactive maps, and manages travel plans — all in one place.

🌍 **Live Demo:** [travelplanner-ai.netlify.app](https://travelplanner-ai.netlify.app)

## Features

- **AI Trip Generation** — generates full itineraries using OpenAI API
- **Interactive Maps** — visualize destinations with MapTiler
- **User Authentication** — JWT-based login and registration
- **Trip Management** — create, save, update, and delete trips
- **PDF Export** — download your itinerary as a PDF
- **Email Notifications** — contact form with Mailjet integration
- **Multi-language Support** — i18n with English and Arabic
- **Admin Panel** — manage users and trips

## Tech Stack

**Frontend:**
- React 19 + Vite
- Tailwind CSS
- MapTiler SDK
- React Router DOM
- i18next

**Backend:**
- Node.js + Express 5
- MongoDB + Mongoose
- OpenAI API
- JWT + bcryptjs
- Mailjet
- PDFKit

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- OpenAI API key
- MapTiler API key
- Mailjet API key

### 1. Clone the repo
```bash
git clone https://github.com/Saher-15/ai-travel-planner.git
cd ai-travel-planner
```

### 2. Setup Backend
```bash
cd backend
cp .env.example .env
```

Fill in your `.env`:
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
MAPTILER_API_KEY=your_maptiler_key
MAILJET_API_KEY=your_mailjet_key
MAILJET_SECRET_KEY=your_mailjet_secret
```

```bash
npm install
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
cp .env.example .env
```

Fill in your `.env`:
```
VITE_API_URL=http://localhost:5000
VITE_MAPTILER_API_KEY=your_maptiler_key
```

```bash
npm install
npm run dev
```

## Architecture

```
Frontend (React + Vite)
        ↓
Backend (Express REST API)
        ↓
MongoDB + OpenAI API + MapTiler
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/trips` | Get all trips |
| POST | `/api/trips/generate` | Generate AI trip |
| POST | `/api/trips/generate-and-save` | Generate and save trip |
| POST | `/api/contact` | Send contact message |
