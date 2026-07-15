import { describe, it, expect } from "vitest";
import { AgentGraph, ToolRegistry } from "../src/server/agentGraph";

describe("AgentGraph", () => {
  it("runs a linear graph and merges state patches", async () => {
    const g = new AgentGraph("a")
      .addNode({ id: "a", run: async () => ({ patch: { x: 1 }, next: "b" }) })
      .addNode({ id: "b", run: async () => ({ patch: { y: 2 }, next: "END" }) });
    const r = await g.run({}, new ToolRegistry());
    expect(r.status).toBe("completed");
    expect(r.state).toEqual({ x: 1, y: 2 });
    expect(r.steps).toBe(2);
    expect(r.state.__current).toBeUndefined();
  });

  it("supports conditional routing / loops until a threshold", async () => {
    const g = new AgentGraph("loop", 50).addNode({
      id: "loop",
      run: async (ctx) => {
        const n = (ctx.state.n || 0) + 1;
        return { patch: { n }, next: n >= 3 ? "END" : "loop" };
      },
    });
    const r = await g.run({}, new ToolRegistry());
    expect(r.status).toBe("completed");
    expect(r.state.n).toBe(3);
  });

  it("enforces the max-steps guardrail on an infinite loop", async () => {
    const g = new AgentGraph("spin", 5).addNode({
      id: "spin",
      run: async () => ({ next: "spin" }),
    });
    const r = await g.run({}, new ToolRegistry());
    expect(r.status).toBe("max_steps");
    expect(r.steps).toBe(5);
  });

  it("returns an error status for an unknown next node", async () => {
    const g = new AgentGraph("a").addNode({
      id: "a",
      run: async () => ({ next: "ghost" }),
    });
    const r = await g.run({}, new ToolRegistry());
    expect(r.status).toBe("error");
    expect(r.error).toContain("Unknown node: ghost");
  });

  it("captures thrown node errors in the trace", async () => {
    const g = new AgentGraph("boom").addNode({
      id: "boom",
      run: async () => {
        throw new Error("node failed");
      },
    });
    const r = await g.run({}, new ToolRegistry());
    expect(r.status).toBe("error");
    expect(r.error).toBe("node failed");
    expect(r.trace.some((t) => t.kind === "error" && t.error === "node failed")).toBe(true);
  });

  it("aborts cooperatively via the abort signal", async () => {
    const signal = { aborted: true };
    const g = new AgentGraph("a").addNode({
      id: "a",
      run: async () => ({ next: "END" }),
    });
    const r = await g.run({}, new ToolRegistry(), signal);
    expect(r.status).toBe("aborted");
    expect(r.steps).toBe(0);
  });

  it("records tool calls in the trace and errors on unknown tools", async () => {
    const tools = new ToolRegistry().register({
      name: "echo",
      run: async (args) => args.value,
    });
    const g = new AgentGraph("a").addNode({
      id: "a",
      run: async (ctx, t) => {
        const out = await t.call("echo", { value: 42 }, ctx);
        return { patch: { out }, next: "END" };
      },
    });
    const r = await g.run({}, tools);
    expect(r.state.out).toBe(42);
    expect(r.trace.some((e) => e.kind === "tool" && e.tool === "echo" && e.toolResult === 42)).toBe(true);

    const g2 = new AgentGraph("a").addNode({
      id: "a",
      run: async (ctx, t) => {
        await t.call("missing", {}, ctx);
        return { next: "END" };
      },
    });
    const r2 = await g2.run({}, tools);
    expect(r2.status).toBe("error");
    expect(r2.error).toContain("Unknown tool: missing");
  });
});
