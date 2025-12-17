# MCP Config Manager - Demo Script

## Prerequisite
1.  **Install the App**: Ensure `MCP Configuration Manager` is installed and running.
2.  **Backup**: Run `./reset_demo.sh --backup` to save your real config.
3.  **Reset**: Run `./reset_demo.sh --clean` to start with a blank slate.
4.  **Open Slides**: Open `slides/index.html` in your browser.

## Part 1: The Presentation (5 mins)

**Slide 1: Title**
"Hi everyone, today we're talking about the Model Context Protocol, or MCP, and how we can manage the growing complexity of our AI tools."

**Slide 2: What is MCP?**
"Think of MCP as the USB-C for AI. It connects models (like Claude) to context (your code, database, tools). Instead of building custom integrations for everything, we use one standard."

**Slide 3: State of MCP**
"It's growing fast. Since Nov 2024, we've seen massive adoption. 2025 gave us security (OAuth) and better media support. It's becoming the industry standard."

**Slide 4: The Configuration Hell**
"But there's a problem. Managing these connections manually is painful. JSON errors, no validation, and every AI client needs its own copy of the config. It's a mess."

**Slide 4: The Configuration Complexity**
"It's not just one file anymore. Claude has 3 different configs (Desktop, CLI, VS Code extension). Then you have Cursor, Windsurf, Kiro, Antigravity... it gets complicated fast."

**Slide 5: The Context Economy**
"And remember, every server you add costs tokens. It eats into your context window. We let you track token usage and toggle servers on/off instantly, so you're only paying for what you need."

**Slide 6: Enter MCP Config Manager**
"That's why we built this tool. It's a visual command center for your MCP servers. Let's see it in action."

**Slide 6: MCP in Testing**
"Beyond just configuration, we use MCP for **Testing**. By giving the AI agent access to our test runner logs via an MCP server, it can auto-diagnose failures and 'self-heal' the code without us pasting errors back and forth."

**Slide 7: MCP for Work Tracking**
"We also connect to our issue tracker. The **Jira/Work Item** MCP server lets the agent fetch acceptance criteria directly. This ensures every line of code traces back to a requirement."

---

## Part 2: Live Demo (5 mins)

**Step 1: The "Empty" State**
1.  Open **MCP Configuration Manager**.
2.  Show the dashboard. "Here we can see I have Claude Desktop and VS Code detected, but no servers configured yet."
3.  (Optional) Show the actual `claude_desktop_config.json` file on disk to prove it's empty/basic.

**Step 2: Adding a Server**
1.  Go to the **"Marketplace"** or **"Library"** tab.
2.  Search for **"Git"** or **"Filesystem"**.
3.  Click **"Install"** or **"Add to Workspace"**.
4.  Drag the server node to connect it to the **Claude Desktop** node.
5.  "Notice how I didn't type any JSON. I just dragged and dropped."

**Step 3: Configuration & Validation**
1.  Click on the server node to configure it.
2.  Add a path (e.g., this project's root).
3.  "The app validates this path exists. If I made a typo in JSON, it would just fail silently."
4.  Save the changes.

**Step 4: Verification**
1.  Switch to the **"JSON Preview"** or inspect the file on disk again.
2.  Show that the config has been written correctly.
3.  "And because it manages multiple clients, I can verify VS Code has the same setup instantly."

---

## Part 3: The "Meta" Reveal (2 mins)

**Slide 7: Built WITH MCP**
"One last thing. We used MCP to build this project."
1.  Show `.mcp.json` in the project root.
2.  "We used the **Figma Dev Mode** MCP server."
3.  "This allowed our AI coding agents to read our design specs directly from Figma, ensuring the UI you see matches our vision pixel-for-pixel."

## Q&A
"Thanks for watching. The project is open source on GitHub. Questions?"
