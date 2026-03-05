import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { weatherTools, executeTool } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  lat: number;
  lon: number;
  locationName: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body: ChatRequest = await request.json();
  const { messages, lat, lon, locationName } = body;

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(locationName, lat, lon);

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    let response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools: weatherTools,
      messages: anthropicMessages,
    });

    // Tool calling loop (max 5 iterations)
    let iterations = 0;
    while (response.stop_reason === "tool_use" && iterations < 5) {
      iterations++;

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (toolUse) => ({
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: await executeTool(toolUse.name, toolUse.input as Record<string, unknown>),
        }))
      );

      anthropicMessages.push({
        role: "assistant",
        content: response.content,
      });
      anthropicMessages.push({
        role: "user",
        content: toolResults,
      });

      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        tools: weatherTools,
        messages: anthropicMessages,
      });
    }

    // Extract final text response
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    return NextResponse.json({
      message: textBlock?.text ?? "No response generated.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
