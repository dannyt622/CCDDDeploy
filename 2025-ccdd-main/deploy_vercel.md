## Guide: Deploying to Vercel (Frontend React + Vite)

This project connects directly to the public HAPI FHIR server and is well-suited for deployment on Vercel. Below are the exact steps and key settings used so you can reproduce or migrate easily.

### 1) Prerequisites
- GitHub account (repository created and code pushed)
- Node.js 18+ (optional locally, only for build verification)
- Frontend directory: `front_end/`

### 2) Project Highlights (Deployment-related)
- Framework & build: Vite + React
- Build command: `npm run build`
- Output directory: `front_end/dist`
- Public FHIR server: `https://hapi.fhir.org/baseR4` (already configured in code; no extra Vercel config needed)
- Routing: Single Page App (handled by Vercel; no extra rewrite rules required)

### 3) Create & Link the Project in Vercel
1. Go to `https://vercel.com` and sign in with GitHub.
2. Click "New Project".
3. Select your GitHub repository that contains this project.
4. On the import screen, set:
   - Framework Preset: "Vite"
   - Root Directory: `front_end`
   - Build Command: default or `npm run build`
   - Output Directory: `dist`
   - Install Command: default (`npm install` / `npm ci`)
5. Click "Deploy" and wait 1–2 minutes to get a live URL (e.g., `https://xxxx.vercel.app`).

### 4) Automation & Branch Strategy
- After connecting GitHub, auto deployments are enabled by default:
  - Push to the default branch (main) → triggers Production deployment
  - Pull Requests → create Preview deployments for review
- To disable auto deployments, adjust in Vercel: `Settings → Git`.

### 5) Custom Domain (Optional)
1. In the Vercel project, open `Settings → Domains` to add a custom domain.
2. Follow the instructions to add A/AAAA or CNAME records at your DNS provider.
3. Wait for DNS propagation (typically 1–10 minutes).

### 6) Local Verification (Optional)
```bash
cd front_end
npm ci
npm run build
npm run preview    # preview the built dist locally
```

### 7) Troubleshooting
- Build failures:
  - Check Node version (18+) and lockfile
  - Review Vercel Build Logs for stack traces
- Blank page / 404 on routes:
  - Ensure the Vite preset is selected and `Root Directory` is `front_end`
  - Output directory must be `dist`
- API failures:
  - This app talks directly to the public HAPI FHIR server (no backend needed). Verify `https://hapi.fhir.org/baseR4` availability and inspect browser network requests

### 8) Key Files (already included)
- `front_end/vite.config.js`: Vite build settings (outputs to `dist`)
- `front_end/package.json`: includes `build` and `preview` scripts

