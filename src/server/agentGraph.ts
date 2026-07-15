// Minimal, dependency-free state-graph orchestration engine for multi-agent
// workflows. Provides real (not simulated) control flow: conditional routing
// between nodes, a tool registry with a recorded call trace, and guardrails
// (max-steps and cooperative abort). This is a functional stepping stone
// towards a full framework such as LangGraph.js; the node/edge model is the
// same, only the executor is lightweight.

export interface AgentContext {
  state: Record<string, any>;
  trace: TraceEntry[];
  signal?: { aborted: boolean };
}

export interface TraceEntry {
  node: string;
  kind: "node" | "tool" | "error";
  next?: string | null;
  patch?: Record<string, any>;
  tool?: string;
  toolArgs?: any;
  toolResult?: any;
  error?: string;
}

export interface NodeOutcome {
  /** Next node id, or "END"/null to terminate. */
  next?: string | null;
  /** Partial state update merged into the context. */
  patch?: Record<string, any>;
}

export type NodeFn = (ctx: AgentContext, tools: ToolRegistry) => Promise<NodeOutcome>;

export interface GraphNode {
  id: string;
  run: NodeFn;
}

export interface Tool {
  name: string;
  run: (args: any, ctx: AgentContext) => Promise<any>;
}

/** Registry of callable tools. Every call is appended to the context trace. */
export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async call(name: string, args: any, ctx: AgentContext): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    const result = await tool.run(args, ctx);
    ctx.trace.push({
      node: ctx.state.__current || "?",
      kind: "tool",
      tool: name,
      toolArgs: args,
      toolResult: result,
    });
    return result;
  }
}

export type RunStatus = "completed" | "aborted" | "error" | "max_steps";

export interface RunResult {
  status: RunStatus;
  state: Record<string, any>;
  trace: TraceEntry[];
  steps: number;
  error?: string;
}

/** Executes a directed graph of nodes with conditional edges and guardrails. */
export class AgentGraph {
  private nodes = new Map<string, GraphNode>();

  constructor(private entry: string, private maxSteps = 25) {}

  addNode(node: GraphNode): this {
    this.nodes.set(node.id, node);
    return this;
  }

  async run(
    initialState: Record<string, any>,
    tools: ToolRegistry,
    signal?: { aborted: boolean }
  ): Promise<RunResult> {
    const ctx: AgentContext = { state: { ...initialState }, trace: [], signal };
    let current: string | null = this.entry;
    let steps = 0;

    while (current && current !== "END") {
      if (signal?.aborted) {
        return { status: "aborted", state: strip(ctx.state), trace: ctx.trace, steps };
      }
      if (steps >= this.maxSteps) {
        return { status: "max_steps", state: strip(ctx.state), trace: ctx.trace, steps };
      }
      const node = this.nodes.get(current);
      if (!node) {
        const error = `Unknown node: ${current}`;
        ctx.trace.push({ node: current, kind: "error", error });
        return { status: "error", state: strip(ctx.state), trace: ctx.trace, steps, error };
      }
      ctx.state.__current = current;
      steps++;
      try {
        const outcome = await node.run(ctx, tools);
        if (outcome.patch) Object.assign(ctx.state, outcome.patch);
        const next = outcome.next ?? "END";
        ctx.trace.push({ node: current, kind: "node", patch: outcome.patch, next });
        current = next;
      } catch (e: any) {
        const error = e?.message || String(e);
        ctx.trace.push({ node: current, kind: "error", error });
        return { status: "error", state: strip(ctx.state), trace: ctx.trace, steps, error };
      }
    }
    return { status: "completed", state: strip(ctx.state), trace: ctx.trace, steps };
  }
}

function strip(state: Record<string, any>): Record<string, any> {
  const { __current, ...rest } = state;
  return rest;
}
