# ♻️ Resiklo

**An AI-powered waste management app for Zamboanga City, Philippines.**  
Scan your trash, get recycling and reuse recommendations, and find the nearest e-waste drop-off points — all in one place.

> "Think before you throw."

---

## Features

- **AI Scan** — Take a photo of any item and get instant AI analysis: waste category, condition, reuse ideas, recycling instructions, and environmental impact (CO₂ saved).
- **E-Waste Map** — Interactive Mapbox map locked to Zamboanga City showing all verified e-waste drop-off locations (SM City Mindpro Cyberzone, Universidad de Zamboanga, local repair shops, OCENR).
- **Safe Disposal Guide** — Step-by-step disposal tips per item type with hazard level indicators.
- **YouTube Tutorials** — Auto-fetched DIY reuse and recycling video guides relevant to the scanned item.
- **Learn Page** — Educational resources on waste segregation and circular economy.

---

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Map | Mapbox GL JS via `react-map-gl` v8 |
| Animations | Framer Motion |
| Icons | Lucide React |

### Backend (`/server`)
| | |
|---|---|
| Runtime | Node.js + Express |
| AI Vision | Google Gemini (multi-model fallback chain) |
| AI Fallback | OpenRouter (free vision models) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (scan images) |
| Tutorials | YouTube Data API v3 |

---

## E-Waste Drop-off Locations (Zamboanga City)

| Location | Address | Accepted Items |
|---|---|---|
| SM City Mindpro | 4F Cyberzone, La Purisima St. | Phones, chargers, batteries, power banks, earphones, calculators |
| Universidad de Zamboanga | UZ Labs Building, Tetuan Campus | Computers, smartphones, small appliances |
| Ronworks Computer Repair | Tumaga Road, Sta. Maria | Computers, laptops, computer parts |
| Easyelectronyx | BCC Compound, San Jose Road | Electronics, components, phones, gadgets |
| WEEFIX I.T. CARE CENTER | Nuñez Extension St. | Phones, laptops, tablets, gadgets |
| OCENR | San Roque | Refrigerators, aircons, washing machines, large appliances |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Mapbox account (free) — [mapbox.com](https://mapbox.com)
- A Google AI Studio key (free) — [aistudio.google.com](https://aistudio.google.com)
- Optional: Supabase project, OpenRouter key, YouTube API key

---

### 1. Clone the repo

```bash
git clone https://github.com/bunsai090/Resikloooooo.git
cd Resikloooooo
```

### 2. Set up the frontend

```bash
npm install
```

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

```env
VITE_MAPBOX_TOKEN=your_mapbox_public_token
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Set up the server

```bash
cd server
npm install
```

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

SUPABASE_URL=https://your_project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

MAPBOX_ACCESS_TOKEN=your_mapbox_token
YOUTUBE_API_KEY=your_youtube_api_key
```

### 4. Run

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd server
node index.js
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

App runs at `http://localhost:5173`  
Server runs at `http://localhost:5000`

---

## Project Structure

```
Resikloooooo/
├── src/
│   ├── pages/
│   │   ├── Scan.tsx          # Camera scan + AI survey flow
│   │   ├── Analysis.tsx      # AI results, reuse/recycle/dispose guide
│   │   ├── MapPage.tsx       # Zamboanga City e-waste map (Mapbox)
│   │   ├── Learn.tsx         # Educational resources
│   │   └── Landing.tsx       # Landing page
│   ├── components/
│   │   ├── layout/           # TopNav, BottomNav, Footer, MainLayout
│   │   └── landing/          # Landing page sections
│   └── lib/
│       ├── api.ts            # Frontend API helpers
│       └── mockData.ts       # Fallback mock data
├── server/
│   ├── index.js              # Express API (scan, facilities, tutorials)
│   ├── .env.example          # Environment variable template
│   └── package.json
├── .env.example              # Frontend env template
└── package.json
```

---

## Environment Variables

### Frontend (`.env`)
| Variable | Description |
|---|---|
| `VITE_MAPBOX_TOKEN` | Mapbox public access token |
| `VITE_API_BASE_URL` | Backend server URL (default: `http://localhost:5000`) |

### Backend (`server/.env`)
| Variable | Description |
|---|---|
| `PORT` | Server port (default: `5000`) |
| `CLIENT_ORIGIN` | Frontend URL for CORS |
| `GEMINI_API_KEY` | Google Gemini AI key |
| `OPENROUTER_API_KEY` | OpenRouter key (free vision model fallback) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `MAPBOX_ACCESS_TOKEN` | Mapbox token (server-side geocoding) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |

> ⚠️ Never commit `.env` files. They are gitignored. Use the `.env.example` templates.

---

## License

MIT
