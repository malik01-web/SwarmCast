# SwarmCast
**Five Minds. One Signal. Zero Noise.**
AMD Instinct MI300X · 192GB HBM3 · ROCm 6.0

---

## Deploy to Vercel (10 minutes)

### Step 1 — Get Free Groq API Key
1. Go to console.groq.com
2. Sign up free (no credit card)
3. Click "API Keys" → "Create API Key"
4. Copy the key (starts with `gsk_...`)

### Step 2 — Push to GitHub
Create a new repo on github.com called `swarmcast`
Then upload all these files.

### Step 3 — Deploy on Vercel
1. Go to vercel.com → Sign in with GitHub
2. Click "Add New Project"
3. Import your `swarmcast` repo
4. Framework: **Vite** (auto-detected)
5. Click "Deploy"

### Step 4 — Add Environment Variable
In Vercel → Your Project → Settings → Environment Variables:

| Name | Value |
|------|-------|
| `GROQ_API_KEY` | `gsk_your_key_here` |

Click Save → Go to Deployments → Redeploy

### Step 5 — Done!
Your app is live at `https://swarmcast.vercel.app`

---

## File Structure
```
swarmcast/
├── api/
│   └── swarm.js        ← Groq API (server-side, key safe)
├── src/
│   ├── main.jsx        ← React entry point
│   └── App.jsx         ← SwarmCast UI
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── .gitignore
```

---

## How It Works
1. User pastes prediction market question
2. 5 AI agents activate with staggered delays
3. Each agent calls `/api/swarm` (Vercel function)
4. Vercel function calls Groq API (key stays secret)
5. Arbiter weighs all 4 votes → final consensus
6. Dashboard shows result with AMD GPU monitor

---

## Switch to AMD Later
When AMD Developer Cloud credits arrive:
- Replace Groq calls in `api/swarm.js` with AMD endpoint
- Change `GROQ_API_KEY` → `AMD_API_KEY` in Vercel env vars
- Update model to `meta-llama/Llama-3-70b-chat-hf`

Built for AMD × Lablab.ai Hackathon 2025
