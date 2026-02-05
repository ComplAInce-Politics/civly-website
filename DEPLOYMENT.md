# Civly Website Deployment

## Infrastructure
- **Server:** DigitalOcean droplet `162.243.47.11` (hostname: `k3s-prod`)
- **Orchestration:** k3s (lightweight Kubernetes)
- **Namespace:** `civly-website`
- **Deployment name:** `civly-website`

## How It Works
The k8s deployment uses:
1. An **init container** (`alpine/git`) that clones the GitHub repo at startup
2. Copies `*.html`, `*.pdf`, `images/`, `css/`, `js/` into an Nginx volume
3. An **nginx:alpine** container serves the static files

This means deploying = restarting the pod so the init container re-clones the latest code.

## Deployment Steps

### 1. Commit and push to main
```bash
git add <files>
git commit -m "Description of changes"
git push origin main
```

### 2. SSH into the droplet and restart the deployment
```bash
ssh root@162.243.47.11
kubectl rollout restart deployment civly-website -n civly-website
kubectl rollout status deployment civly-website -n civly-website --timeout=60s
```

Or as a one-liner from local:
```bash
ssh root@162.243.47.11 "kubectl rollout restart deployment civly-website -n civly-website && kubectl rollout status deployment civly-website -n civly-website --timeout=60s"
```

### 3. Verify
Confirm the site is updated at the live URL.

## Important Notes
- Do NOT install Nginx directly on the host — the site is served by Nginx inside a Kubernetes pod
- There is no CI/CD pipeline — deployment is manual via kubectl restart
- The init container clones from the `main` branch of `https://github.com/ComplAInce-Politics/civly-website.git`
- The k8s deployment config can be viewed with: `kubectl get deployment civly-website -n civly-website -o yaml`

## Useful Commands
```bash
# Check pod status
kubectl get pods -n civly-website

# View pod logs
kubectl logs -n civly-website -l app=civly-website

# View init container logs (git clone output)
kubectl logs -n civly-website -l app=civly-website -c git-clone

# Check all resources in namespace
kubectl get all -n civly-website
```
