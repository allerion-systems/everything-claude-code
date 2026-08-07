import Anthropic from "@anthropic-ai/sdk";

/**
 * Thin client for the Allerion Agency (Claude Managed Agents).
 *
 * One agent (the coordinator) is created once during provisioning; here we only ever
 * create per-request *sessions* against it — the correct setup/runtime split. The
 * coordinator decides which specialist to hire for each request.
 */
export class Agency {
  private client: Anthropic;
  private coordinatorId: string;
  private environmentId: string;
  private brainMemoryStoreId?: string;

  constructor(opts: {
    coordinatorId: string;
    environmentId: string;
    brainMemoryStoreId?: string;
  }) {
    // Reads ANTHROPIC_API_KEY from the environment.
    this.client = new Anthropic();
    this.coordinatorId = opts.coordinatorId;
    this.environmentId = opts.environmentId;
    this.brainMemoryStoreId = opts.brainMemoryStoreId;
  }

  /**
   * Send one plain-language request to the Agency and return the final text reply.
   * Creates a session, streams to a terminal idle state, and collects agent.message text.
   */
  async ask(request: string, title = "RB-OS request"): Promise<string> {
    const resources = this.brainMemoryStoreId
      ? [
          {
            type: "memory_store" as const,
            memory_store_id: this.brainMemoryStoreId,
            access: "read_write" as const,
            instructions:
              "R&B's shared Brain. Read relevant notes before acting; write back anything the next specialist needs.",
          },
        ]
      : undefined;

    const session = await this.client.beta.sessions.create({
      agent: this.coordinatorId, // string shorthand → latest version
      environment_id: this.environmentId,
      title,
      ...(resources ? { resources } : {}),
    });

    // Stream-first: open the stream before sending the kickoff so no early events are missed.
    const stream = await this.client.beta.sessions.events.stream(session.id);
    await this.client.beta.sessions.events.send(session.id, {
      events: [{ type: "user.message", content: [{ type: "text", text: request }] }],
    });

    let out = "";
    for await (const event of stream as AsyncIterable<any>) {
      if (event.type === "agent.message") {
        for (const block of event.content ?? []) {
          if (block.type === "text") out += block.text;
        }
      } else if (event.type === "session.status_terminated") {
        break;
      } else if (event.type === "session.status_idle") {
        // Only break on a terminal idle — `requires_action` means it's waiting on us.
        if (event.stop_reason?.type !== "requires_action") break;
      }
    }

    return out.trim() || "(no reply)";
  }
}
