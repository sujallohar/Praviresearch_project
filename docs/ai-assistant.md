# GovAsset 360 AI Assistant Strategy

## Overview
The AI Assistant provides intelligent insights into the asset registry and issues tracker. 
It uses Google's Gemini 1.5 Flash model to answer natural language questions about infrastructure state.

## Implementation Details
- **Location**: `src/lib/gemini.ts`
- **Context Injection**: The application actively queries Firestore for critical assets, open issues, and pending maintenance. This live dataset is compressed and fed as system context to the LLM so it doesn't hallucinate data.
- **Graceful Degradation**: If `VITE_GEMINI_API_KEY` is not found, the UI gracefully switches to a deterministic fallback mode ("Demo Mode"). It parses the user query for keywords and returns deterministic text containing the fetched context.

## Future Recommendations
- Implement a true vector database (e.g. Pinecone or Firestore Vector Search) for semantic querying of large asset logs.
- Move the Gemini SDK calls entirely to Firebase Cloud Functions for enhanced API key protection.
