#!/bin/bash

# Bulk Environment Variables Upload Script for Vercel
# Run this script to upload all environment variables at once
# Make sure you have Vercel CLI installed: npm i -g vercel

echo "🚀 Uploading environment variables to Vercel..."

# Core Database & Application
vercel env add MONGODB_URI "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0" production
vercel env add MONGODB_DB_NAME "healthapp" production
vercel env add NODE_ENV "production" production

# MongoDB Connection Pool
vercel env add MONGODB_MAX_POOL_SIZE "10" production
vercel env add MONGODB_SOCKET_TIMEOUT_MS "45000" production
vercel env add MONGODB_SERVER_SELECTION_TIMEOUT_MS "5000" production

# JWT & Authentication
vercel env add JWT_SECRET "Kx9mZ3pQ7vY2nR6sW4eT8uI5oL1cF0dG9hJ3kM6pS2vB" production
vercel env add JWT_REFRESH_SECRET "N8bV5cX2zA9sD7fG4hJ1kL6qW3eR5tY8uI0oP2mN6vB9" production
vercel env add JWT_EXPIRES_IN "7d" production
vercel env add JWT_REFRESH_EXPIRES_IN "7d" production
vercel env add JWT_ISSUER "health-app" production
vercel env add JWT_AUDIENCE "health-app-users" production
vercel env add ROTATE_REFRESH_TOKENS "true" production

# NextAuth
vercel env add NEXTAUTH_SECRET "A7dF3gH6jK9mP2qS5vY8bE1nR4tW7zC0dL9sF6gH3jK2" production
vercel env add NEXTAUTH_URL "https://your-app-name.vercel.app" production

# Security & Encryption
vercel env add ENCRYPTION_MASTER_KEY "B5nR8sW1eT4yU7iO0pA3dF6gH9jK2mP5" production
vercel env add ENCRYPTION_SALT "C6vB9nM2qP5sV8yE1rT4wQ7uI0oL3fG6" production
vercel env add ENCRYPTION_KEY "D7xC0vB3nM6qP9sV2yE5rT8wQ1uI4oL7" production
vercel env add KEY_ROTATION_ENABLED "false" production
vercel env add CURRENT_KEY_VERSION "1" production

# QR Code Security
vercel env add QR_SIGNING_KEY "E4xR7vC0nP3sY6bL9fH2gJ5kM8qS1tW4" production
vercel env add QR_KEY_ID "qr-prod-key-v1" production

# CSRF Protection
vercel env add CSRF_SECRET "F3gH6jK9mP2qS5vY8bE1nR4tW7zC0dL3" production

# System & Admin
vercel env add SYSTEM_USER_ID "system-health-app-admin" production
vercel env add ADMIN_API_KEY "K8vY2mN9pQ7rX4sL6fH3dW1zE5tR9uI0oP2qA8bC6vN=" production
vercel env add CRON_API_KEY "M2nP5qR8sT4uY7vX1dF6gH9jK3lN0oQ5rE8wA2bC9vM=" production

# Compliance & Features
vercel env add AUDIT_RETENTION_DAYS "2555" production
vercel env add ENABLE_AUDIT_LOGGING "true" production
vercel env add ENABLE_FIELD_ENCRYPTION "true" production
vercel env add SECURITY_HEADERS_ENABLED "true" production
vercel env add ENABLE_QR_CODE_ROTATION "true" production
vercel env add ENABLE_GEOLOCATION_VALIDATION "false" production
vercel env add CORS_ORIGINS "https://your-app-name.vercel.app" production

echo "✅ All environment variables uploaded successfully!"
echo "📝 Remember to:"
echo "   1. Replace 'your-app-name' with your actual Vercel app name"
echo "   2. Update NEXTAUTH_URL and CORS_ORIGINS with your real domain"
echo "   3. Change the MongoDB password for security"
echo "   4. Run 'vercel --prod' to redeploy with new variables"
