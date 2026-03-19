# Notes on Spec #5: Slash Commands

## Objectives
- Bypass the LLM for commands prefixed with `/`
- Backend API (`/api/slash`) needs:
    - Parses command. For `/jules list-sessions` it is a tool name `jules`, but how does `list-sessions` map to `args`?
    - The instructions specify body: `{ command: string, sessionId: string, args?: any }`. So the client can just pass the raw command string, and backend parses it? Or client parses it?
    - "Parse command (e.g., "/jules list-sessions")" -> "Map to tool from ToolRegistry" -> "Execute tool directly with parsed args"

Wait, the LLM usually passes JSON args. How do we pass text args (`list-sessions`) to a tool that expects structured JSON (like `{ action: "list-sessions" }`)?
Looking at tools:
Jules tool:
```ts
parameters: {
  action: {
    type: 'string',
    enum: ['create-session', 'list-sessions', 'get-session', ...]
  },
  ...
}
```
If the slash command is `/jules list-sessions`, the backend needs to map `list-sessions` to `args = { action: 'list-sessions' }`.
Or, if the frontend just passes `command: "/jules list-sessions"`, the backend could try to parse arguments, but standardizing it is tricky.
Wait, the prompt says: `Body: { command: string, sessionId: string, args?: any }` -> "Parse command (e.g., "/jules list-sessions")". If they type `/jules action=list-sessions` it might be easier to parse, but let's assume `args` can just be derived or passed if structured.

Let's check `TODO-SPECS.md` again for spec #5.
"Implement slash commands that bypass the LLM and invoke tools directly.
Backend — POST /api/slash (new, authenticated):
Body: { command: string, sessionId: string, args?: any }
Logic:
Parse command (e.g., "/jules list-sessions")
Map to tool from ToolRegistry
Execute tool directly with parsed args
Return tool response immediately
Support all registered tools from ToolRegistry"

If the user types `/jules list-sessions`, the command is `/jules`. The rest `list-sessions` could be interpreted as an argument.
However, different tools take different args. For example, `write_note` takes `filename` and `content`.
How would the user type that? `/write_note mynote.md Hello world`?
Let's keep the backend parsing simple: split by space. The first part is the tool name (without `/`).
For simplicity, since tools have different JSON schemas, parsing arbitrary string to structured JSON is non-trivial without an LLM.
Maybe we just pass the remaining string as a single argument if it's a single string, or assume `args` are passed as JSON from the frontend? But the UI just says "Add slash command detection in input field" - it's a single input string.

Let's look at how tools are structured.
Jules tool expects `args.action`.
Linear tool expects `args.action`.
Vercel tool expects `args.action`.
Write note tool expects `args.filename` and `args.content`.

If we parse `command = "/tool arg1 arg2 ..."`.
We can make a simple parser in `POST /api/slash` that takes the string:
- `/jules list-sessions` -> tool: `jules`, args: `{ action: "list-sessions" }` (if we know the schema, we can match the first enum parameter).
Wait! If we look at the `ToolRegistry` we have `getDefinitions()`. We can find the parameters of the tool.
If the parameter is just `action`, we can assign the first word to `action`.
Actually, if the spec says "Parse command (e.g., '/jules list-sessions')", maybe it implies a simple heuristic:
If `args` is not provided in body, parse it from `command` string:
```js
const parts = command.split(' ');
const toolName = parts[0].substring(1); // remove '/'
const argString = parts.slice(1).join(' ');
```
If we need to pass `args` to the tool, maybe we can just pass the `argString` to a default parameter, or try to parse it as JSON if it looks like JSON? Or just pass `{ action: parts[1], ... }`?
Let's see the schema for tools.
The requirements are:
1. Backend — POST /api/slash (new, authenticated):
   Body: { command: string, sessionId: string, args?: any }
   Logic:
   Parse command (e.g., "/jules list-sessions")
   Map to tool from ToolRegistry
   Execute tool directly with parsed args

The most straightforward way to map string `command` + `args` to a tool is:
If the `command` is `/jules list-sessions` and `args` is not provided in the payload, maybe the frontend parses the input text and sends `command` and `args` in the payload?
Actually, the prompt says: "When user sends slash command → call /api/slash instead of /api/message", "Show command suggestions as user types "/[tool-name]""

If we look at `Body: { command: string, sessionId: string, args?: any }`, `command` might just be the raw text input (e.g., `/jules list-sessions`) or just the command name (e.g., `/jules`). If it says `Parse command (e.g., "/jules list-sessions")`, it implies `command` contains the full string that the user typed.

Let us write a heuristic parser in the backend:
```ts
app.post("/api/slash", authenticateJWT, async (req, res) => {
   const { command, sessionId, args } = req.body;
   // command is e.g. "/jules list-sessions 123"
   const parts = command.trim().split(/\s+/);
   const toolName = parts[0].substring(1); // remove /

   // if args is not provided, try to infer it from the remaining parts
   let toolArgs = args || {};
   if (!args && parts.length > 1) {
       const definitions = tools.getDefinitions();
       const def = definitions.find(d => d.function.name === toolName);
       if (def) {
           const props = Object.keys(def.function.parameters?.properties || {});
           // A very basic heuristic: if the first property is "action" and the 2nd part matches an enum, map it.
           // Otherwise, just map parts to properties in order?
           // Actually, since this is a dev/admin tool, the user can just type JSON or space-separated values?
           // Let us just map positional parts to properties based on Object.keys
           props.forEach((p, i) => {
               if (parts[i+1]) {
                   // check if it is JSON
                   try { toolArgs[p] = JSON.parse(parts[i+1]); }
                   catch { toolArgs[p] = parts[i+1]; }
               }
           });
       }
   }

   // Execute
   const result = await tools.execute(toolName, toolArgs, {
       sessionId,
       send: async (msg) => {
           // send logic
       }
   });
   res.json({ result }); // wait, how does frontend expect it?
});
```
Wait, the frontend is just "Display response immediately (no streaming)". So we just return the tool output as a system or assistant message?
`setMessages(prev => [...prev, { role: "assistant", content: response.data.result }]);`
