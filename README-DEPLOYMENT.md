# Deployment Guide

## Automatic Deployment with GitHub Actions

This project uses GitHub Actions for CI/CD. When you push to the `main` or `master` branch, it will automatically:

1. ✅ Run tests (NestJS + Laravel)
2. ✅ Build Docker images
3. ✅ Deploy to your server

## Setup Instructions

### 1. Server Requirements

Your deployment server needs:
- Docker and Docker Compose installed
- Git installed
- SSH access configured
- At least 4GB RAM (recommended: 8GB)
- Sufficient disk space for Docker images

### 2. Initial Server Setup

SSH into your server and run:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose (if not included)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone <your-repo-url> /var/www/e-com-nest-laravel
cd /var/www/e-com-nest-laravel

# Create .env file
cp .env.example .env
# Edit .env with your production values
nano .env
```

### 3. Configure GitHub Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DEPLOY_HOST` | Server IP or domain | `192.168.1.100` or `example.com` |
| `DEPLOY_USER` | SSH username | `root` or `deploy` |
| `DEPLOY_SSH_KEY` | Private SSH key | (see below) |
| `DEPLOY_PORT` | SSH port (optional) | `22` |
| `DEPLOY_PATH` | Project path (optional) | `/var/www/e-com-nest-laravel` |
| `GITHUB_TOKEN` | GitHub Personal Access Token | (for private repos) |

### 4. Generate SSH Key for Deployment

**On your server:**

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions

# Add public key to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Display private key (copy this)
cat ~/.ssh/github_actions
```

**In GitHub:**
- Copy the private key output
- Paste it as the `DEPLOY_SSH_KEY` secret

### 4. Add GitHub Token (for private repositories)

If your repository is private, add a GitHub Personal Access Token:

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Generate new token with `repo` scope
3. Add it as `GITHUB_TOKEN` secret in your repository

### 5. First Deployment

Once secrets are configured:

1. Push to `main` branch:
   ```bash
   git push origin main
   ```

2. GitHub Actions will automatically:
   - Run tests
   - Build Docker images
   - Deploy to server

3. Check deployment status:
   - Go to **Actions** tab in GitHub
   - Watch the workflow run

### 6. Verify Deployment

After deployment, check services:

```bash
# On your server
cd /var/www/e-com-nest-laravel
docker-compose ps
docker-compose logs -f
```

Access your application:
- **API Gateway**: `http://your-server-ip/api/gateway`
- **Admin Panel**: `http://your-server-ip`
- **API Docs**: `http://your-server-ip/api/gateway/docs`

## Manual Deployment

If you need to deploy manually:

```bash
# On your server
cd /var/www/e-com-nest-laravel
git pull origin main
./deploy.sh
```

Or use docker-compose directly:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### SSH Connection Fails
```bash
# Test SSH connection
ssh -i ~/.ssh/github_actions user@your-server

# Check SSH key permissions
chmod 600 ~/.ssh/github_actions
chmod 644 ~/.ssh/authorized_keys
```

### Docker Build Fails
```bash
# Check Docker is running
docker ps

# Check disk space
df -h

# Clean up Docker
docker system prune -a
```

### Services Not Starting
```bash
# Check logs
docker-compose logs api-gateway
docker-compose logs admin-service

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart api-gateway
```

### Database Connection Issues
```bash
# Check database is running
docker-compose ps postgres-write
docker-compose ps postgres-read

# Test connection
docker-compose exec api-gateway npm run migration:run
```

## Environment Variables

Make sure your `.env` file on the server has all required variables:

- Database credentials
- JWT secrets
- Redis configuration
- Elasticsearch URL
- Pusher/Soketi settings

See `docker-compose.yml` for all required environment variables.

## Rollback

If deployment fails, you can rollback:

```bash
# On server
cd /var/www/e-com-nest-laravel
git checkout <previous-commit-hash>
./deploy.sh
```

Or revert the last commit:

```bash
git revert HEAD
git push origin main
```

