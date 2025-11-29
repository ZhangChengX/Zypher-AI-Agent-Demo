import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
  runAgentInTerminal,
} from "@corespeed/zypher";
import { createTool } from "@corespeed/zypher/tools";
import { eachValueFrom } from "rxjs-for-await";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

import { getReadableWeatherByZip } from "./weather.ts";


// Helper function to safely get environment variables
function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

// Initialize the agent execution context
const zypherContext = await createZypherContext(Deno.cwd());

// Create the agent with your preferred LLM provider
const agent = new ZypherAgent(
  zypherContext,
  new AnthropicModelProvider({
    apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
  }),
);

// Register and connect to an MCP server to give the agent email sending capabilities
await agent.mcp.registerServer({
  id: "ActivepiecesEmailServer",
  type: "command",
  command: {
    command: "npx",
    args: [
      "-y",
      "mcp-remote",
      "https://cloud.activepieces.com/api/v1/mcp/NRiwKpzcX9e9n0WjwIaWL/sse",
    ],
  },
});

// Re-implement createTool(), ensure the parameters have the type field
function createTool<T extends z.ZodObject<z.ZodRawShape>>(options: {
  name: string;
  description: string;
  schema: T;
  execute: (
    params: InferParams<T>,
    ctx: ToolExecutionContext,
  ) => Promise<ToolResult>;
}): Tool<InferParams<T>> {
  // Convert Zod schema to JSON Schema
  const jsonSchema = zodToJsonSchema(options.schema, { target: "jsonSchema7" });

  // Ensure type is set at root level
  if (!jsonSchema.type) {
    jsonSchema.type = "object";
  }

  return {
    name: options.name,
    description: options.description,
    parameters: jsonSchema as InputSchema,
    execute: async (params: InferParams<T>, ctx: ToolExecutionContext) => {
      const validatedParams = await options.schema.parseAsync(params);
      return options.execute(validatedParams, ctx);
    },
  };
}

// Create a custom tool
const weatherForcasting = createTool({
  name: "weatherForcasting",
  description: "Get the weather forecast for a U.S. zipcode for N days ahead",
  schema: z.object({
    zipcode: z.string().describe("5-digit US zipcode"),
    daysAhead: z.number().int().describe("number of days ahead to forcast"),
  }),
  execute: async ({ zipcode, daysAhead }) => {
    return await getReadableWeatherByZip(zipcode, daysAhead);
  },
});

// Register the custom tool
agent.mcp.registerTool(weatherForcasting);

await runAgentInTerminal(agent, "claude-sonnet-4-20250514");
