# Arigatoo

A monorepo containing a Next.js web application and Chrome extension.

## Project Structure

```
arigatoo/
├── web-app/          # Next.js web application
├── extension/        # Chrome extension
├── shared/           # Shared code between web and extension
└── package.json      # Root workspace configuration
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

**Run web app:**
```bash
npm run dev:web
```
Visit http://localhost:3000

**Build extension:**
```bash
npm run dev:extension
```
The extension will be built in `extension/dist/`

### Building for Production

**Build web app:**
```bash
npm run build:web
```

**Build extension:**
```bash
npm run build:extension
```

**Build everything:**
```bash
npm run build
```

## Chrome Extension

### Loading the Extension

1. Build the extension: `npm run build:extension`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `extension/dist` folder

### Extension Structure

- `src/popup.ts` - Popup UI logic
- `src/background.ts` - Background service worker
- `src/content.ts` - Content script injected into pages
- `manifest.json` - Extension configuration

## Web App

Built with:
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- ESLint

## Shared Code

The `shared/` folder contains code that can be used by both the web app and extension.
