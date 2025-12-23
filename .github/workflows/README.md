# CI/CD Pipeline Setup

This GitHub Actions workflow automatically:
1. ✅ Runs tests for both NestJS and Laravel services
2. ✅ Builds Docker images
3. ✅ Deploys to your server on push to main/master branch

## Setup Instructions

### 1. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

- `DEPLOY_HOST` - Your server IP address or domain (e.g., `192.168.1.100` or `example.com`)
- `DEPLOY_USER` - SSH username (e.g., `root` or `deploy`)
- `DEPLOY_SSH_KEY` - Private SSH key for server access
- `DEPLOY_PORT` - SSH port (optional, defaults to 22)
- `DEPLOY_PATH` - Path to project on server (optional, defaults to `/var/www/e-com-nest-laravel`)
- `GITHUB_TOKEN` - GitHub Personal Access Token (required for private repositories)

### 2. Generate SSH Key (if needed)

On your server:
```bash
ssh-keygen -t ed25519 -C "github-actions"
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
```

Copy the private key (`~/.ssh/id_ed25519`) and add it as `DEPLOY_SSH_KEY` secret in GitHub.

### 3. Prepare Server

On your deployment server:

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone your repository (if not already)
git clone <your-repo-url> /var/www/e-com-nest-laravel
cd /var/www/e-com-nest-laravel

# Create .env file with production values
cp .env.example .env
# Edit .env with your production values
```

### 4. First Deployment

The workflow will automatically:
- Pull latest code
- Build Docker images
- Start services with `docker-compose up -d`

## Workflow Triggers

- **On Push to main/master**: Runs tests → Builds images → Deploys
- **On Pull Request**: Runs tests only (no deployment)

## Manual Deployment

You can also trigger deployment manually:
1. Go to Actions tab
2. Select "CI/CD Pipeline"
3. Click "Run workflow"

## Troubleshooting

### SSH Connection Issues
- Verify SSH key is correct
- Check server firewall allows SSH
- Test SSH connection manually: `ssh user@host`

### Docker Build Fails
- Check Docker is installed on server
- Verify docker-compose.yml is valid
- Check server has enough disk space

### Deployment Fails
- Check server has Docker and docker-compose installed
- Verify DEPLOY_PATH exists on server
- Check server has enough resources (RAM, CPU)

