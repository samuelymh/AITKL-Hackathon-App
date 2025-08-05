# Gemini API Setup Guide

This guide will help you set up the Gemini API for AI document analysis in your health app.

## Prerequisites

1. A Google Cloud account
2. Access to Google AI Studio or Google Cloud Console

## Setup Steps

### 1. Get Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment Variables

Create or update your `.env.local` file in the root directory:

```bash
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Add Gemini API key
GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

### 3. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the upload documents page
3. Upload a PDF medical document
4. Click "Analyze Documents" to test the AI analysis

## Features

The Gemini API integration provides:

- **Document Analysis**: AI-powered analysis of medical documents

## API Endpoints

- `POST /api/analysis` - Analyze uploaded documents
- `GET /api/analysis` - Health check endpoint

## Security Notes

- Never commit your API key to version control
- Use environment variables for all sensitive configuration
- Consider implementing rate limiting for the analysis endpoint
- Ensure proper authentication before allowing document analysis

## Troubleshooting

### Common Issues

1. **API Key Not Found**: Ensure `GOOGLE_AI_API_KEY` is set in your environment
2. **Analysis Fails**: Check the browser console and server logs for detailed error messages
3. **File Upload Issues**: Verify Supabase storage configuration

### Error Messages

- `"Failed to analyze documents"` - Check API key and network connectivity
- `"No valid documents found"` - Ensure files are properly uploaded to Supabase
- `"Analysis failed"` - Check Gemini API quota and service status

## Rate Limits

The Gemini API has rate limits based on your Google Cloud project. Monitor your usage in the Google Cloud Console to avoid hitting limits.

## Support

For issues with:
- **Gemini API**: Check [Google AI documentation](https://ai.google.dev/docs)
- **Application**: Check the application logs and error messages
- **Setup**: Refer to this guide and the main README 