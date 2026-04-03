# OAuth Setup Guide — LearnFlow Auth Service

## Overview

The auth service (`services/auth/main.py`) handles Google and GitHub OAuth via
[authlib](https://docs.authlib.org/). After a successful OAuth flow the user is
redirected to `{FRONTEND_URL}/auth/callback?token=<JWT>` where the frontend
reads the JWT, stores it, and logs the user in.

---

## 1 · Google OAuth

### 1.1 Create a Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select an existing one)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
4. Application type: **Web application**
5. Name: `LearnFlow` (any name)
6. **Authorised redirect URIs** — add **both**:
   - `http://localhost:8006/auth/google/callback` ← local dev
   - `https://your-domain.com/auth/google/callback` ← production
7. Click **Create** → copy **Client ID** and **Client Secret**

---

## 2 · GitHub OAuth

### 2.1 Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: `LearnFlow`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:8006/auth/github/callback`
3. Click **Register application** → copy **Client ID**
4. Click **Generate a new client secret** → copy **Client Secret**

> For production: update the callback URL to `https://your-domain.com/auth/github/callback`

---

## 3 · Environment Variables

### Local development — `services/auth/.env`

Create this file (it is `.gitignore`'d):

```env
# Database (optional for local dev — service works without it)
DATABASE_URL=postgresql://user:password@localhost:5432/learnflow

# JWT
JWT_SECRET=generate-with-python-secrets-token-hex-32
SESSION_SECRET=generate-with-python-secrets-token-hex-32

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx

# GitHub OAuth
GITHUB_CLIENT_ID=Ov23lixxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# URLs
FRONTEND_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:8006/auth/google/callback
GITHUB_REDIRECT_URI=http://localhost:8006/auth/github/callback
```

Generate secrets:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Kubernetes — update `k8s/services/auth/deployment.yaml`

Edit the `auth-secrets` Secret's `stringData` section with real values before applying.

---

## 4 · Running Locally

```bash
cd services/auth
pip install -r requirements.txt

# With .env file
uvicorn main:app --host 0.0.0.0 --port 8006 --reload
```

Health check:
```bash
curl http://localhost:8006/health
# {"status":"ok","service":"auth"}
```

---

## 5 · Running with Docker

```bash
cd services/auth
docker build -t auth:latest .

docker run -p 8006:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e SESSION_SECRET="..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  -e GITHUB_CLIENT_ID="..." \
  -e GITHUB_CLIENT_SECRET="..." \
  -e FRONTEND_URL="http://localhost:3000" \
  -e GOOGLE_REDIRECT_URI="http://localhost:8006/auth/google/callback" \
  -e GITHUB_REDIRECT_URI="http://localhost:8006/auth/github/callback" \
  auth:latest
```

---

## 6 · Deploying to Kubernetes

```bash
# 1. Build the image (minikube example)
eval $(minikube docker-env)
docker build -t auth:latest services/auth/

# 2. Edit the Secret in the manifest with real values
#    k8s/services/auth/deployment.yaml  →  stringData section

# 3. Apply
kubectl apply -f k8s/services/auth/deployment.yaml
kubectl apply -f k8s/services/frontend/deployment.yaml   # picks up AUTH_URL

# 4. Verify
kubectl get pods -n learnflow
kubectl logs -n learnflow deploy/auth
```

For OAuth to work in K8s the redirect URIs must be publicly reachable. Either:
- Use a real domain with an Ingress controller, or
- Use `minikube tunnel` + NodePort (port 30306 for auth, 30300 for frontend)
  and register `http://<minikube-ip>:30306/auth/google/callback` in the consoles.

---

## 7 · API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/signup` | Local email/password signup → JWT |
| `POST` | `/auth/login` | Local email/password login → JWT |
| `GET`  | `/auth/verify` | Validate Bearer JWT (used by other services) |
| `GET`  | `/auth/google` | Redirect to Google consent screen |
| `GET`  | `/auth/google/callback` | Google callback → redirect to frontend |
| `GET`  | `/auth/github` | Redirect to GitHub consent screen |
| `GET`  | `/auth/github/callback` | GitHub callback → redirect to frontend |
| `GET`  | `/health` | Health check |

### JWT Payload

```json
{
  "sub":    "google-abc123",
  "email":  "user@example.com",
  "name":   "Jane Doe",
  "avatar": "https://...",
  "exp":    1234567890,
  "iat":    1234567890
}
```

### Frontend proxy path

The Next.js frontend forwards `/api/svc/auth/*` → `AUTH_URL/*`, so:
- Sign in with Google: `GET /api/svc/auth/auth/google`
- Sign in with GitHub: `GET /api/svc/auth/auth/github`
- Login: `POST /api/svc/auth/auth/login`
- Signup: `POST /api/svc/auth/auth/signup`
