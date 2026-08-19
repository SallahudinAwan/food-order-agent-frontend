# Food Order Agent Frontend

Production React/Vite client for the Food Order Agent. The browser handles speech recognition and playback while the LangChain ordering runtime, Gemini credentials, and ordering logic remain in the Django backend.

## Render deployment

The repository includes a `render.yaml` Blueprint for a Render Static Site. Create a new Blueprint from this repository. Render will install locked dependencies, build the Vite application, publish `dist`, configure SPA rewrites, and add baseline security headers.

The production API URL is configured at build time:

```env
VITE_API_BASE_URL=https://food-order-agent-backend.onrender.com/api
```

If Render assigns a different backend URL, update this variable and redeploy the static site. Never add the Gemini API key or database connection string to the frontend environment.

## Local verification

```powershell
npm.cmd test
npm.cmd run build
```
