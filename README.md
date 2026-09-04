# Imagify - AI SaaS Image Generator

Imagify is a modern, premium full-stack AI-powered SaaS application that transforms textual prompts into beautiful, high-quality images. It includes a credit-based system, secure authentication, API rate-limiting via Redis, and a complete image history dashboard.

---

## 🚀 Key Features

- **🎨 Text-to-Image Generation:** Powered by advanced AI models to turn descriptive prompts into high-resolution visuals.
- **🔐 User Authentication:** Secure signup, login, and token-based API authorization.
- **💳 Credit-Based Usage:** Users consume credits to generate images, with real-time balance tracking.
- **⚡ Performance Caching & Rate Limiting:** Backend optimized with Redis to manage traffic and handle rate-limiting.
- **📜 Generation History:** A dedicated dashboard for users to review, search, and download their previously generated images.
- **📱 Responsive, Premium UI:** Built using React + TailwindCSS with sleek dark/light mode accents, glassmorphic UI elements, and modern typography.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React.js (Vite)
- **Styling:** TailwindCSS (with Vanilla CSS overrides)
- **Navigation:** React Router DOM
- **Notifications:** React Toastify
- **Icons:** Boxicons / Custom SVG icons

### Backend
- **Runtime Environment:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (using Mongoose ODM)
- **Caching & Rate Limiting:** Redis
- **Security & Utilities:** JSON Web Tokens (JWT) for authentication, CORS, dotenv for environment management.

---

## 📁 Repository Structure

```
├── client/                 # Frontend React application (Vite + TailwindCSS)
│   ├── src/
│   │   ├── assets/         # Images, logos, and graphic assets
│   │   ├── components/     # Reusable UI components (Navbar, Header, Footer, Steps, etc.)
│   │   ├── context/        # AppContext and global state management
│   │   ├── pages/          # Pages (Home, Result, BuyCredit, History)
│   │   └── main.jsx        # Entry point
│   └── package.json
│
├── server/                 # Backend Node.js / Express API
│   ├── config/             # Database (MongoDB) and cache (Redis) configurations
│   ├── controllers/        # Core business logic (userController, imageController)
│   ├── middlewares/        # Authentication & rate limiting middlewares
│   ├── models/             # Mongoose schemas (userModel, transactionModel)
│   ├── routes/             # API routes definition (userRoute, imageRoutes)
│   ├── utils/              # Helper utilities (historyManager)
│   └── server.js           # Server initialization
```

---

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v16.x or higher)
- MongoDB account (Atlas or Local Instance)
- Redis server (local or cloud-hosted)
- AI Image Generation API Key (e.g., Clipdrop/Stability AI)

### 1. Server Configuration
Navigate to the `server` directory:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory (reference `.env.example`):
```env
PORT=4000
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
JWT_SECRET=your_jwt_signing_key
CLIPDROP_API=your_clipdrop_api_key
# Optional: set to true in production to fail startup instead of using the in-memory fallback.
REQUIRE_REDIS=true
# Optional: defaults to 86400 (24 hours).
IMAGE_CACHE_TTL_SECONDS=86400
```

Start the backend server:
```bash
npm run dev
```

### 2. Client Configuration
Navigate to the `client` directory:
```bash
cd ../client
npm install
```

Create a `.env` file in the `client` directory (reference `.env.example`):
```env
VITE_BACKEND_URL=http://localhost:4000
```

Start the React development server:
```bash
npm run dev
```

---

## 📜 License

This project is licensed under the MIT License.
