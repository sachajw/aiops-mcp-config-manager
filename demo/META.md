# How We Used MCP to Build MCP Config Manager

This project serves as a "meta" example of the Model Context Protocol in action. We practiced what we preach by using MCP servers to aid the development process.

## The `.mcp.json` Configuration

In the root of this repository, you'll find a `.mcp.json` file. This standard configuration file allows AI coding agents (like the one that built this demo!) to connect to external tools.

```json
{
  "mcpServers": {
    "figma-dev-mode": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://127.0.0.1:3845/mcp"
      ],
      "type": "local",
      "source": "user",
      "name": "figma-dev-mode"
    }
  }
}
```

## Use Case: Figma Dev Mode Integration

We used the **Figma Dev Mode** MCP server to bridge the gap between design and code.

1.  **The Challenge**: Transforming high-fidelity visual designs into React/Tailwind components usually involves constant context switching.
2.  **The Solution**: By connecting the AI agent directly to Figma via MCP:
    *   The agent could "read" the design tokens (colors, spacing, typography) directly.
    *   It generated the initial `index.css` and Tailwind configuration to match the design system 1:1.

## Use Case: Intelligent Testing

In our broader development workflow, we utilize **Jest/Playwright MCP servers**.

*   **Context for Failure**: When a test fails in `e2e/full-user-suite.spec.ts`, the MCP server provides the AI with:
    *   The exact valid code snippet.
    *   The failure log/stack trace.
    *   A screenshot of the UI at the moment of failure.
*   **Result**: The agent can propose a fix for the *root cause* (e.g., a changed selector or race condition) rather than just guessing.

## Use Case: Requirement Traceability (Work Items)

We also integrate with our issue tracker (e.g., Jira/Linear) via MCP.

*   **Source of Truth**: The AI reads the "Acceptance Criteria" directly from the ticket.
*   **Validation**: Before marking a task complete, the agent verifies that all criteria in the work item are met by the code changes.
