# CortexHeal Release History

All notable changes to the CortexHeal platform are documented in this file.

## [0.1.0] - 2026-11-19

### Features
- **Deterministic Circuit Breaker**: Sub-24ms state hashing loop detector powered by SHA-256 fingerprinting.
- **Zero-Code OpenAI Proxy Gateway**: Drop-in `base_url` interception supporting OpenAI, Anthropic, LangChain, CrewAI, and AutoGen.
- **In-Process LangGraph Adapter**: Graph suspension with `interrupt()` and zero-cold-start state resumption.
- **Telemetry & Storage Engine**: Multi-tenant PostgreSQL 15 schema, Redis 7 SSE streaming, and thread-pooled non-blocking queue.
- **Model Context Protocol (MCP)**: Native stdio tool server for Claude Desktop, Cursor, and Windsurf integration.
- **Web Applications**: Real-time React 19 APM dashboard and responsive marketing overview site.
