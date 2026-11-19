# Model Context Protocol (MCP) Integration Guide

CortexHeal includes a built-in MCP server that exposes real-time safety telemetry, open incidents, and execution timelines to AI coding assistants.

---

## 1. Available Tools

The MCP server provides three primary tools via stdio:

1. **`list_open_incidents`**: Retrieves all currently active incidents across monitored agents.
2. **`get_incident_details`**: Fetches full incident telemetry, trigger cause, and agent status.
3. **`get_run_timeline`**: Retrieves sequential tool calls, LLM exchanges, and timestamps for any agent run.

---

## 2. Configuration for AI IDEs

### Claude Desktop
Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cortexheal": {
      "command": "cortexheal",
      "args": ["mcp"],
      "env": {
        "DATABASE_URL": "postgresql://cortexheal:cortexpassword@localhost:5433/cortexheal_db"
      }
    }
  }
}
```

### Cursor & Windsurf
Add a new MCP server configuration in your project's `.cursor/mcp.json` or assistant settings:

```json
{
  "mcpServers": {
    "cortexheal": {
      "command": "python",
      "args": ["-m", "cortexheal.mcp_server"],
      "env": {
        "DATABASE_URL": "postgresql://cortexheal:cortexpassword@localhost:5433/cortexheal_db"
      }
    }
  }
}
```

---

## 3. Running from CLI

You can also run the MCP server directly from your terminal:

```bash
# Using the CLI entrypoint
cortexheal mcp

# Or via Python module
python -m cortexheal.mcp_server
```
