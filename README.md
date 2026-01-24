# Arigatoo

> AI-powered resume analyzer that helps job seekers optimize their resumes against job descriptions

Arigatoo is a comprehensive monorepo application that analyzes resumes against job descriptions using AI, providing actionable feedback and match scores. Available as both a web application and Chrome extension.

## 🎯 Features

- **Resume Analysis**: Upload resumes (PDF, DOCX, TXT) and get AI-powered analysis
- **Job Description Matching**: Compare resumes against job postings with detailed scoring
- **Chrome Extension**: Extract job descriptions directly from job listing pages
- **Smart Suggestions**: Get actionable recommendations to improve your resume
- **Keyword Optimization**: Identify matched and missing keywords
- **Multi-Provider AI**: Supports OpenRouter and Google Gemini for analysis
- **Caching**: Redis-based caching for fast repeated analyses
- **Secure Authentication**: Firebase-based user authentication

## 📁 Project Structure

```
arigatoo/
├── backend/           # NestJS API server
│   ├── src/
│   │   ├── analyze/   # Resume analysis service (AI integration)
│   │   ├── auth/      # Firebase authentication
│   │   ├── cache/     # Redis caching layer
│   │   ├── parse/     # Resume & JD parsing (PDF, DOCX, URL scraping)
│   │   └── resume/    # Resume management
│   └── package.json
├── web-app/           # Next.js web application
│   ├── src/
│   │   ├── app/       # Next.js App Router pages
│   │   ├── components/ # React components
│   │   └── lib/       # Utilities and API client
│   └── package.json
├── extension/         # Chrome extension
│   ├── src/
│   │   ├── popup.ts   # Extension popup UI
│   │   ├── background.ts # Service worker
│   │   └── content.ts # Page content extraction
│   ├── manifest.json
│   └── package.json
├── shared/            # Shared TypeScript types and utilities
└── package.json       # Root workspace configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- (Optional) Firebase project for authentication
- (Optional) Redis instance for caching
- (Optional) OpenRouter or Google Gemini API key for AI analysis

### Installation

```bash
# Install all workspace dependencies
npm install
```

### Environment Setup

Create a `.env` file in the `backend/` directory:

```bash
# API Keys (at least one required for AI analysis)
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_API_KEY=your_gemini_key

# Firebase Admin SDK (optional, for authentication)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Redis (optional, for caching)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Server Configuration
PORT=3001
```

### Development

**Start the backend API:**
```bash
npm run dev:backend
```
API runs at http://localhost:3001

**Start the web app:**
```bash
npm run dev:web
```
Web app runs at http://localhost:3000

**Build the extension:**
```bash
npm run dev:extension
# or for production build
npm run build:extension
```
Extension built to `extension/dist/`

### Testing

```bash
# Run backend tests
npm run test:backend
```

## 🔧 Building for Production

```bash
# Build all components
npm run build

# Or build individually
npm run build:backend
npm run build:web
npm run build:extension
```

## 🌐 Chrome Extension

### Installation

1. Build the extension:
   ```bash
   npm run build:extension
   ```

2. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `extension/dist/` folder

### Usage

1. Navigate to any job listing page (LinkedIn, Indeed, etc.)
2. Click the Arigatoo extension icon
3. Upload your resume (or log in to use saved resume)
4. Click "Extract from page" to capture the job description
5. Click "Analyze Match" to get your compatibility score

### Supported Job Sites

- LinkedIn
- Indeed
- Glassdoor
- Monster
- ZipRecruiter
- Dice
- And many more (generic job page detection)

## 🏗️ Architecture

### Backend (NestJS)

**Tech Stack:**
- NestJS framework
- Firebase Admin SDK for authentication
- Redis (Upstash) for caching
- OpenAI SDK for OpenRouter
- Google Generative AI for Gemini
- pdf-parse, mammoth, cheerio for parsing

**API Endpoints:**
- `POST /api/auth/verify` - Verify Firebase ID token
- `POST /api/resume/upload` - Upload and parse resume
- `GET /api/resume` - Get user's saved resume
- `POST /api/analyze/quick` - Quick analysis (no auth required)
- `POST /api/analyze` - Full analysis with caching
- `POST /api/parse/job` - Parse job description from text/URL

### Web App (Next.js)

**Tech Stack:**
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Shadcn UI components
- Firebase Authentication

**Pages:**
- `/` - Home page with resume upload and analysis
- `/extension/auth` - Extension authentication bridge

### Extension (Chrome MV3)

**Components:**
- **Popup**: User interface for analysis
- **Background Service Worker**: Message routing and badge management
- **Content Script**: Job description extraction from pages

## 🔒 Security

This project follows security best practices:

- Input validation and sanitization
- CORS with origin validation
- XSS prevention with safe DOM manipulation
- Request timeouts to prevent hanging
- Error message sanitization
- Firebase token verification

For detailed security information, see [SECURITY.md](./SECURITY.md).

For code review findings, see [CODE_REVIEW_SUMMARY.md](./CODE_REVIEW_SUMMARY.md).

## 📝 API Usage

### Quick Analysis (No Auth)

```javascript
const response = await fetch('http://localhost:3001/api/analyze/quick', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resumeText: 'Your resume text...',
    jobText: 'Job description text...',
    geminiApiKey: 'optional-user-api-key'
  })
});

const { success, data } = await response.json();
// data.analysis contains score and suggestions
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- NestJS for the excellent backend framework
- Next.js for the powerful React framework
- OpenRouter and Google for AI capabilities
- Firebase for authentication services

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in `/docs`

---

Built with ❤️ by the Arigatoo team
