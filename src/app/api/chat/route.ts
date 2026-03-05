import { NextRequest } from "next/server";
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
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body: ChatRequest = await request.json();
  const { messages, lat, lon, locationName } = body;

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: "No messages provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(locationName, lat, lon);

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let iterations = 0;
        let needsToolLoop = true;

        while (needsToolLoop && iterations < 5) {
          needsToolLoop = false;

          const response = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: systemPrompt,
            tools: weatherTools,
            messages: anthropicMessages,
          });

          const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
          let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

          for await (const event of response) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "text") {
                // Text block starting
              } else if (event.content_block.type === "tool_use") {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  inputJson: "",
                };
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`));
              } else if (event.delta.type === "input_json_delta" && currentToolUse) {
                currentToolUse.inputJson += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolUse) {
                const input = JSON.parse(currentToolUse.inputJson || "{}");
                toolUseBlocks.push({
                  type: "tool_use",
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input,
                });
                currentToolUse = null;
              }
            } else if (event.type === "message_delta") {
              if (event.delta.stop_reason === "tool_use" && toolUseBlocks.length > 0) {
                needsToolLoop = true;
                iterations++;

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", text: "Fetching data..." })}\n\n`));

                // Build assistant content from the stream
                const finalMessage = await response.finalMessage();
                anthropicMessages.push({
                  role: "assistant",
                  content: finalMessage.content,
                });

                // Execute all tool calls
                const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
                  toolUseBlocks.map(async (toolUse) => ({
                    type: "tool_result" as const,
                    tool_use_id: toolUse.id,
                    content: await executeTool(toolUse.name, toolUse.input as Record<string, unknown>),
                  }))
                );

                anthropicMessages.push({
                  role: "user",
                  content: toolResults,
                });
              }
            }
          }

          if (!needsToolLoop) break;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
