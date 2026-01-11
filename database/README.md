# Database Setup Guide

## Overview
This folder contains the database initialization script (`init.sql`) for the Character Chat application. It sets up the required PostgreSQL schema.

## How to Initialize

### Option 1: Using Docker Compose (Recommended)
The `docker-compose.yml` is configured to automatically use this script when creating the database container for the first time.
If you want to reset the database and re-initialize it:

1. Stop the containers:
   ```bash
   docker-compose down -v
   ```
   *(Warning: This deletes all data in the database volume)*

2. Start the containers:
   ```bash
   docker-compose up -d
   ```
   Docker will automatically execute the scripts in `./database/init.sql` (if mounted to `/docker-entrypoint-initdb.d`).

### Option 2: Manual Initialization
If you have an existing database and want to apply the schema manually:

```bash
cat database/init.sql | docker-compose exec -T postgres psql -U kirakira -d kirakira
```

## Schema Structure
- **users**: User accounts and authentication info
- **characters**: AI characters with profiles and prompts
- **conversations**: Chat sessions between users and characters
- **messages**: Individual chat messages
- **api_usage**: Tracking API usage limits
- **worldviews**: Shared settings/backgrounds for characters
