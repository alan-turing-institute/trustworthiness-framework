# Trustworthiness Framework

A comprehensive digital identity assessment platform for evaluating organizational maturity across key pillars of trustworthiness. The tool provides structured assessments, automated scoring, standards compliance mapping, and detailed PDF reports.

## Docker Deployment

### Pulling the Container from Docker Hub

```bash
docker pull kimbotto/distaf-app:latest
```

### Building the Container Locally

```bash
# Build the image
docker build -t distaf-app .

# Or use docker compose
docker compose build
```

### Running the Container

**Linux/macOS:**
```bash
docker run -d \
  --name distaf-app \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DB_PATH=/app/data \
  -e SESSION_SECRET=change_in_production \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:3000/api/health" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=10s \
  kimbotto/distaf-app
```

**Windows (PowerShell):**
```powershell
docker run -d `
  --name distaf-app `
  --restart unless-stopped `
  -e NODE_ENV=production `
  -e PORT=3000 `
  -e DB_PATH=/app/data `
  -e SESSION_SECRET=change_in_production `
  -p 3000:3000 `
  -v "${PWD}/data:/app/data" `
  --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:3000/api/health" `
  --health-interval=30s `
  --health-timeout=10s `
  --health-retries=3 `
  --health-start-period=10s `
  kimbotto/distaf-app
```

**Windows (CMD):**
```cmd
docker run -d --name distaf-app --restart unless-stopped -e NODE_ENV=production -e PORT=3000 -e DB_PATH=/app/data -e SESSION_SECRET=change_in_production -p 3000:3000 -v "C:\path\to\your\project\data:/app/data" --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:3000/api/health" --health-interval=30s --health-timeout=10s --health-retries=3 --health-start-period=10s kimbotto/distaf-app
```
*Note: Replace `C:\path\to\your\project\data` with the absolute path to your data directory.*

The application will be available at `http://localhost:3000`. Default credentials are:
- Username: `admin`
- Password: `admin123`

⚠️ **Important:** Change the admin password after first login and set a secure `SESSION_SECRET` for production deployments.

### Updating the Container

To update to the latest version:

```bash
# 1. Pull the latest image
docker pull kimbotto/distaf-app:latest

# 2. Stop and remove the existing container
docker stop distaf-app
docker rm distaf-app

# 3. Run the new container (use the same run command as above)
docker run -d \
  --name distaf-app \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DB_PATH=/app/data \
  -e SESSION_SECRET=change_in_production \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:3000/api/health" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=10s \
  kimbotto/distaf-app
```

**Note:** Your data is preserved in the `./data` directory and will be available in the updated container.
