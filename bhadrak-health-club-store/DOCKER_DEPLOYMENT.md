# 🐳 Container Deployment Guide for Bhadrak Health Club Store

## Overview
Your e-supplement store is fully containerized and ready for deployment using Docker and Docker Compose. This setup provides several advantages over serverless deployment:

- **Persistent Database**: SQLite data persists between container restarts
- **File Uploads**: Images and uploads are stored in persistent volumes
- **No Cold Starts**: Always-on container eliminates serverless cold start issues
- **Better Performance**: Consistent performance without lambda limitations
- **Full Control**: Complete control over the runtime environment

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Git repository access

### 1. Clone and Setup
```bash
git clone https://github.com/Aruphui/E-Supplement.git
cd E-Supplement/bhadrak-health-club-store
```

### 2. Environment Configuration
Create a `.env` file:
```bash
# Production Environment Variables
NODE_ENV=production
JWT_SECRET=your_super_secure_jwt_secret_key_here
DATABASE_PATH=/app/data/bhadrak_health_club.db
PORT=3001
```

### 3. Production Deployment
```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Check container health
docker-compose ps
```

### 4. Development Mode
```bash
# Start in development mode with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## 🏗️ Deployment Options

### Option 1: Local Docker Deployment
**Best for**: Personal hosting, small businesses, development
```bash
docker-compose up -d
```
Access at: `http://localhost:3001`

### Option 2: Cloud Container Services

#### AWS ECS/Fargate
```bash
# Build for multi-platform
docker buildx build --platform linux/amd64,linux/arm64 -t bhadrak-store:latest .

# Tag for ECR
docker tag bhadrak-store:latest [account-id].dkr.ecr.[region].amazonaws.com/bhadrak-store:latest

# Push to ECR
docker push [account-id].dkr.ecr.[region].amazonaws.com/bhadrak-store:latest
```

#### Google Cloud Run
```bash
# Build and push to Google Container Registry
docker build -t gcr.io/[project-id]/bhadrak-store:latest .
docker push gcr.io/[project-id]/bhadrak-store:latest

# Deploy to Cloud Run
gcloud run deploy bhadrak-store \
  --image gcr.io/[project-id]/bhadrak-store:latest \
  --platform managed \
  --port 3001 \
  --allow-unauthenticated
```

#### Azure Container Instances
```bash
# Build and push to Azure Container Registry
docker build -t [registry-name].azurecr.io/bhadrak-store:latest .
docker push [registry-name].azurecr.io/bhadrak-store:latest

# Create container instance
az container create \
  --resource-group [resource-group] \
  --name bhadrak-store \
  --image [registry-name].azurecr.io/bhadrak-store:latest \
  --dns-name-label bhadrak-store \
  --ports 3001
```

#### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: bhadrak-health-club-store
services:
- name: web
  source_dir: /
  github:
    repo: Aruphui/E-Supplement
    branch: main
  run_command: node backend/server.js
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: JWT_SECRET
    value: your_jwt_secret_here
  - key: DATABASE_PATH
    value: /app/data/bhadrak_health_club.db
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | ✅ |
| `PORT` | Server port | `3001` | ❌ |
| `JWT_SECRET` | JWT signing secret | Generated | ✅ |
| `DATABASE_PATH` | Database file path | `/app/data/bhadrak_health_club.db` | ❌ |

### Volume Mounts
- `db_data:/app/data` - Persistent database storage
- `uploads_data:/app/backend/uploads` - User uploaded files
- `./logs:/app/logs` - Application logs (optional)

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "database": "connected"
}
```

### Docker Health Check
The container includes built-in health checks:
```bash
docker inspect --format='{{.State.Health.Status}}' bhadrak-health-club-store
```

## 🔐 Security Best Practices

1. **Use Strong JWT Secret**:
   ```bash
   # Generate a secure secret
   openssl rand -base64 32
   ```

2. **Run as Non-Root User**: 
   - Container uses `nodejs` user (UID 1001)

3. **Minimal Base Image**: 
   - Uses `node:18-alpine` for smaller attack surface

4. **Resource Limits**:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

## 📈 Scaling

### Horizontal Scaling
```yaml
services:
  bhadrak-store:
    deploy:
      replicas: 3
    # Add load balancer configuration
```

### Load Balancer (Nginx)
```bash
# Start with nginx load balancer
docker-compose --profile production up -d
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build and Deploy
      run: |
        docker build -t bhadrak-store:${{ github.sha }} .
        docker tag bhadrak-store:${{ github.sha }} bhadrak-store:latest
        # Deploy to your platform of choice
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Permission Errors**:
   ```bash
   chmod 755 ./data
   chown -R 1001:1001 ./data
   ```

2. **Port Already in Use**:
   ```bash
   # Change port in docker-compose.yml
   ports:
     - "3002:3001"
   ```

3. **View Container Logs**:
   ```bash
   docker-compose logs -f bhadrak-store
   ```

## 📞 Support

For deployment issues:
1. Check container logs: `docker-compose logs`
2. Verify health endpoint: `curl http://localhost:3001/api/health`
3. Inspect volumes: `docker volume ls`

---

## 🆚 Containerization vs Serverless Comparison

| Feature | Container Deployment | Serverless (Vercel) |
|---------|---------------------|---------------------|
| **Database** | ✅ Persistent SQLite | ❌ In-memory only |
| **File Uploads** | ✅ Persistent volumes | ❌ Temporary storage |
| **Cold Starts** | ✅ Always warm | ❌ Cold start delays |
| **Cost** | Fixed monthly cost | Pay per request |
| **Scaling** | Manual/Auto scaling | Automatic |
| **Control** | Full control | Limited configuration |

**Recommendation**: Use containerization for production environments where data persistence and consistent performance are important.