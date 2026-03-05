# Phase 5: AI Weather Assistant — Context

## What Exists
- All MCP tool functions: getCurrentWeather, getForecast, getMarineWeather, getNearbyBuoys, getBuoyObservations, getBuoyHistory, resolveLocation
- API routes: /api/weather, /api/buoys, /api/location
- @anthropic-ai/sdk already installed
- ANTHROPIC_API_KEY in .env.local.example

## What This Phase Adds
- Server-side Claude API integration with tool use
- Chat API route that handles tool calling loops
- Chat UI panel with message history
- System prompt that forces tool use for weather claims

## Key Integration Points
- Claude tools map to existing MCP tool functions (server-side)
- Chat route handles the tool calling loop: user message → Claude → tool calls → tool results → Claude response
- Frontend sends user messages, receives assistant responses
- LocationContext provides current lat/lon for context in system prompt
