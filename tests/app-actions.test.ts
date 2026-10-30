import { describe, it, expect } from "vitest";
import { assertAppActionContract, registerAppAction, type AppAction } from "../src/lib/app-actions";

describe("App Actions - Contract Assertions", () => {
  const validAction: AppAction<{ name: string }> = {
    name: "save_profile",
    description: "Save user profile name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", title: "Name", minLength: 1 },
      },
      required: ["name"],
      additionalProperties: false,
    },
    parse: (input: unknown) => {
      const obj = input as { name?: string };
      if (!obj?.name) throw new Error("Name required");
      return { name: obj.name };
    },
    execute: async (input) => ({ success: true, saved: input.name }),
  };

  it("passes valid action definition", () => {
    expect(() => assertAppActionContract(validAction)).not.toThrow();
  });

  it("rejects invalid action name", () => {
    expect(() =>
      assertAppActionContract({
        ...validAction,
        name: "123-invalid",
      }),
    ).toThrow(/Invalid app action contract/);

    expect(() =>
      assertAppActionContract({
        ...validAction,
        name: "has spaces",
      }),
    ).toThrow(/Invalid app action contract/);
  });

  it("rejects empty description or overly long description", () => {
    expect(() =>
      assertAppActionContract({
        ...validAction,
        description: "   ",
      }),
    ).toThrow(/Invalid app action contract/);

    expect(() =>
      assertAppActionContract({
        ...validAction,
        description: "x".repeat(1001),
      }),
    ).toThrow(/Invalid app action contract/);
  });

  it("rejects missing or empty title on properties", () => {
    expect(() =>
      assertAppActionContract({
        ...validAction,
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" }, // missing title!
          },
          required: ["name"],
          additionalProperties: false,
        },
      }),
    ).toThrow(/Invalid app action contract/);

    expect(() =>
      assertAppActionContract({
        ...validAction,
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", title: "  " }, // whitespace title!
          },
          required: ["name"],
          additionalProperties: false,
        },
      }),
    ).toThrow(/Invalid app action contract/);
  });

  it("rejects schemas without additionalProperties: false", () => {
    expect(() =>
      assertAppActionContract({
        ...validAction,
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", title: "Name" },
          },
          required: ["name"],
        },
      }),
    ).toThrow(/Invalid app action contract/);
  });

  it("rejects schemas with undeclared required properties", () => {
    expect(() =>
      assertAppActionContract({
        ...validAction,
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", title: "Name" },
          },
          required: ["name", "email"], // email is not in properties!
          additionalProperties: false,
        },
      }),
    ).toThrow(/Invalid app action contract/);
  });

  it("rejects missing parse or execute handlers", () => {
    expect(() =>
      assertAppActionContract({
        ...validAction,
        parse: undefined as unknown as (i: unknown) => { name: string },
      }),
    ).toThrow(/Invalid app action contract/);

    expect(() =>
      assertAppActionContract({
        ...validAction,
        execute: undefined as unknown as (i: { name: string }) => unknown,
      }),
    ).toThrow(/Invalid app action contract/);
  });
});

describe("App Actions - Registration Behavior", () => {
  it("gracefully returns false when modelContext is absent", async () => {
    const reg = registerAppAction({
      name: "test_action",
      description: "Test action",
      inputSchema: {
        type: "object",
        properties: { count: { type: "number", title: "Count" } },
        required: ["count"],
        additionalProperties: false,
      },
      parse: (input: unknown) => input as { count: number },
      execute: (input) => input,
    });

    const ready = await reg.ready;
    expect(ready).toBe(false);
    expect(typeof reg.dispose).toBe("function");
    reg.dispose();
  });

  it("registers tool and executes correctly when modelContext is present", async () => {
    let registeredTool: any = null;
    let registeredOptions: any = null;

    const mockDoc = {
      modelContext: {
        registerTool: (tool: any, options: any) => {
          registeredTool = tool;
          registeredOptions = options;
        },
      },
    };

    // Temporarily attach mock modelContext
    (globalThis as any).document = mockDoc;

    const action: AppAction<{ query: string }> = {
      name: "search_tokens",
      description: "Search tracked tokens",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", title: "Search query" } },
        required: ["query"],
        additionalProperties: false,
      },
      parse: (input: any) => {
        if (!input?.query) throw new Error("Query is required");
        return { query: input.query.trim() };
      },
      execute: async (input) => ({ result: `Found for ${input.query}` }),
    };

    const reg = registerAppAction(action);
    const ready = await reg.ready;
    expect(ready).toBe(true);
    expect(registeredTool).not.toBeNull();
    expect(registeredTool.name).toBe("search_tokens");

    // Execute through registered tool
    const res = await registeredTool.execute({ query: "ETH" });
    expect(res).toEqual({ result: "Found for ETH" });

    // Execute with invalid input should throw in parse
    await expect(registeredTool.execute({})).rejects.toThrow("Query is required");

    // Dispose
    reg.dispose();
    expect(registeredOptions.signal.aborted).toBe(true);

    // After dispose, execution throws aborted
    await expect(registeredTool.execute({ query: "BTC" })).rejects.toThrow();

    delete (globalThis as any).document;
  });
});
