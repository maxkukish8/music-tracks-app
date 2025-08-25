# Music Tracks App

A simple full-stack demo for managing music tracks.
Frontend is built with Vue 3 + Vite + SCSS.
Backend is a Fastify (TypeScript) API that stores data on the file system (JSON + uploaded audio).
Production deployment runs as a single Docker container on Northflank with a persistent volume.

**Live demo:**
https://p01--music-tracks-api--kyj4sxk6dnw9.code.run


# Tech stack  

- Frontend: Vue 3, Vite, SCSS  
- Backend: Fastify 5 (TS), @fastify/cors, @fastify/static, @fastify/multipart, Swagger (OpenAPI)  
- Persistence: File system (JSON per track, audio files in uploads/)  
- Build/Deploy: Docker (multi-stage), Northflank (free tier) with a mounted volume  
- Runtime: Node.js ≥ 20  

# Environment variables

**Backend reads the following (with safe defaults):**

Variable	Default	Purpose
PORT	8000	Fastify port  
HOST	0.0.0.0	Listen address (set in deploy env if needed)  
DATA_DIR	.data (dev) / /data (prod)	Root folder for tracks/uploads/genres  
(optional per-path overrides)	—	TRACKS_DIR, UPLOADS_DIR, GENRES_FILE  

**On Northflank we use:**

PORT=8000  
HOST=0.0.0.0  
DATA_DIR=/data  
NODE_ENV=production  

# Local development
**Prerequisites**

- Node.js 20+
- npm

#Run frontend (dev)
cd frontend  
npm install  
npm run dev  

# Type-check / Lint / Tests
#backend  
cd test-case  
npm run typecheck  
npm run lint  
npm test  

# Production build & run (Docker, locally)

docker build -t music-tracks-app .  
docker run --rm -p 8000:8000 \  
-e PORT=8000 -e HOST=0.0.0.0 -e DATA_DIR=/data \  
-v "$PWD/.nf-data:/data" \  
music-tracks-app  

# API overview

- GET /health – service status  
- GET /api/genres – list of genres  
- GET /api/tracks – list with pagination/sorting/filtering (query: page, limit, sort, order, artist, genre, search)  
- GET /api/tracks/{id} (or by slug if implemented)  
- POST /api/tracks – create  
- PUT /api/tracks/{id} – update  
- DELETE /api/tracks/{id} – delete  
- POST /api/tracks/{id}/upload – upload audio (multipart/form-data)  
- DELETE /api/tracks/{id}/file – remove audio  
- GET /api/files/{filename} – serve uploaded audio  
- Swagger UI: GET /documentation  
- Exact request/response schemas are visible in Swagger.  