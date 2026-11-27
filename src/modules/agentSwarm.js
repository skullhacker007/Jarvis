// =============================================================
// JARVIS AGENT MODE — RADIAL SWARM TOPOLOGY & INVENTORY HUD
// =============================================================
// Renders the 8-department, 32-agent orbital topology around the
// central JARVIS voice core, plus the 7-category inventory dock
// and interactive inspector drawer.
//
// Exact Category Totals:
//   Departments  :   8
//   AI Agents    :  32 (4 per department)
//   Skills       : 100
//   Integrations :  20
//   MCP Servers  :  10
//   MCP Tools    :  50 (5 per MCP server)
//   Resources    : 174
// =============================================================

export const SWARM_TOTALS = Object.freeze({
  departments: 8,
  agents: 32,
  skills: 100,
  integrations: 20,
  mcpServers: 10,
  mcpTools: 50,
  resources: 174,
});

const DEPARTMENTS = [
  {
    id: "research",
    name: "Research",
    lead: "Atlas-R1",
    color: "#f97316",
    glow: "rgba(249, 115, 22, 0.45)",
    angleDeg: -90,
    domain: "Deep Web Discovery, OSINT & Fact Synthesis",
    agentRoles: ["Web Scout", "Citation Auditor", "Paper Analyst", "Signal Tracker"],
    skillQuota: 13,
    resourceQuota: 22,
  },
  {
    id: "strategy",
    name: "Strategy",
    lead: "Vanguard-S2",
    color: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.45)",
    angleDeg: -45,
    domain: "Goal Decomposition, Risk Modeling & Planning",
    agentRoles: ["Task Planner", "Risk Modeler", "Socratic Critic", "Roadmap Lead"],
    skillQuota: 13,
    resourceQuota: 22,
  },
  {
    id: "copy",
    name: "Copy",
    lead: "Lexis-C3",
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.45)",
    angleDeg: 0,
    domain: "Technical Writing, Briefs & Voice Scripting",
    agentRoles: ["Brief Writer", "Doc Synthesizer", "Tone Calibrator", "Comms Editor"],
    skillQuota: 12,
    resourceQuota: 22,
  },
  {
    id: "design",
    name: "Design",
    lead: "Aether-D4",
    color: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.45)",
    angleDeg: 45,
    domain: "UI/UX Architecture, Motion & Spatial Systems",
    agentRoles: ["Layout Architect", "Motion Designer", "Token Stylist", "A11y Reviewer"],
    skillQuota: 13,
    resourceQuota: 22,
  },
  {
    id: "build",
    name: "Build",
    lead: "Forge-B5",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.45)",
    angleDeg: 90,
    domain: "Rust/Tauri, Python Core, WebUI & Automation",
    agentRoles: ["Systems Coder", "Frontend Builder", "API Integrator", "Refactor Bot"],
    skillQuota: 13,
    resourceQuota: 22,
  },
  {
    id: "video",
    name: "Video",
    lead: "Prism-V6",
    color: "#eab308",
    glow: "rgba(234, 179, 8, 0.45)",
    angleDeg: 135,
    domain: "Multimodal Vision, Screen Capture & Audio/TTS",
    agentRoles: ["Vision Parser", "Frame Inspector", "Audio Mixer", "Stream Director"],
    skillQuota: 12,
    resourceQuota: 21,
  },
  {
    id: "seo",
    name: "SEO",
    lead: "Nexus-N7",
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.45)",
    angleDeg: 180,
    domain: "Hybrid RAG Indexing, Vector Ranking & Citations",
    agentRoles: ["Vector Indexer", "Query Ranker", "Schema Mapper", "Graph Linker"],
    skillQuota: 12,
    resourceQuota: 21,
  },
  {
    id: "qa",
    name: "QA & Ops",
    lead: "Sentinel-Q8",
    color: "#c084fc",
    glow: "rgba(192, 132, 252, 0.45)",
    angleDeg: 225,
    domain: "Verification, Telemetry, Security & Rollback",
    agentRoles: ["Test Runner", "Latency Probe", "Policy Guard", "Rollback Steward"],
    skillQuota: 12,
    resourceQuota: 22,
  },
];

const INTEGRATIONS_SEED = [
  ["Groq LPU", "LLM Inference", "Primary ultra-low-latency token engine"],
  ["NVIDIA NIM", "LLM Inference", "Llama-3.3-70B cloud reasoning endpoint"],
  ["Google Gemini Flash", "Multimodal LLM", "Cloud failover & vision analysis"],
  ["Ollama Local", "Offline LLM", "Air-gapped local llama3.2:3b fallback"],
  ["Deepgram Flux", "Streaming STT", "Real-time conversational speech-to-text"],
  ["Cartesia Sonic", "Neural TTS", "Low-latency streaming voice synthesis"],
  ["Kokoro-82M ONNX", "Local TTS", "Offline neural voice generation"],
  ["Piper TTS", "Local TTS", "Lightweight CPU speech synthesis"],
  ["PostgreSQL + pgvector", "Vector DB", "OCI Hyderabad hybrid relational/vector store"],
  ["Mem0 Memory", "Long-Term Memory", "Cross-session preference & fact extraction"],
  ["LlamaIndex RAG", "Knowledge Engine", "Hybrid vector + full-text citation engine"],
  ["Tavily Search", "Web Research", "Real-time search with source ranking"],
  ["DuckDuckGo", "Web Fallback", "Zero-key web search fallback"],
  ["Playwright Chromium", "Browser Control", "Persistent headless/headed automation"],
  ["Windows UIA", "Desktop Intel", "Coordinate-free Win32 control targeting"],
  ["Windows Graphics Capture", "Screen Capture", "Hardware-accelerated display capture"],
  ["Windows Native OCR", "Text Extraction", "On-device screen text recognition"],
  ["ADB mDNS Bridge", "Phone Sync", "Wireless Android discovery & notifications"],
  ["Open-Meteo", "Telemetry", "Dynamic live geolocation weather feed"],
  ["Windows DPAPI Vault", "Security", "Hardware-bound credential encryption"],
];

const MCP_SERVERS_SEED = [
  { id: "mcp-filesystem", name: "mcp-filesystem", transport: "stdio", scope: "Workspace & Artifacts", tools: ["read_file", "write_file", "edit_file", "list_dir", "search_glob"] },
  { id: "mcp-postgres-oci", name: "mcp-postgres-oci", transport: "sse", scope: "OCI pgvector Store", tools: ["pg_query", "pg_vector_search", "pg_upsert", "pg_schema_inspect", "pg_health"] },
  { id: "mcp-playwright", name: "mcp-playwright", transport: "http:5006", scope: "Chromium Automation", tools: ["browser_navigate", "browser_click", "browser_fill", "browser_snapshot", "browser_eval"] },
  { id: "mcp-tavily", name: "mcp-tavily", transport: "stdio", scope: "Live Web Research", tools: ["web_search", "web_extract", "news_pulse", "domain_crawl", "cite_verify"] },
  { id: "mcp-desktop-uia", name: "mcp-desktop-uia", transport: "ipc", scope: "Win32 UI Automation", tools: ["uia_tree", "uia_invoke", "uia_focus", "wgc_capture", "native_ocr"] },
  { id: "mcp-adb-bridge", name: "mcp-adb-bridge", transport: "ipc", scope: "Android Device Radar", tools: ["adb_discover", "adb_pair_qr", "adb_notify_sync", "adb_dial", "adb_shell"] },
  { id: "mcp-memory-mem0", name: "mcp-memory-mem0", transport: "stdio", scope: "Episodic & Fact Memory", tools: ["mem_add", "mem_search", "mem_profile", "mem_sync_queue", "mem_forget"] },
  { id: "mcp-telemetry", name: "mcp-telemetry", transport: "ipc", scope: "Sentinel Hardware", tools: ["cpu_ram_sample", "gpu_probe", "net_rx_tx", "port_health", "ttfa_metric"] },
  { id: "mcp-github", name: "mcp-github", transport: "stdio", scope: "Git & Code Review", tools: ["git_status", "git_diff", "pr_list", "issue_search", "commit_inspect"] },
  { id: "mcp-planner", name: "mcp-planner", transport: "ipc", scope: "Task Graph & Rollback", tools: ["plan_decompose", "step_execute", "step_verify", "plan_rollback", "skill_dispatch"] },
];

const SKILL_PREFIXES = [
  "Auto", "Deep", "Fast", "Smart", "Zero-Latency", "Adaptive", "Hybrid", "Precision",
  "Neural", "Context", "Dynamic", "Guardrail", "Semantic",
];

const RESOURCE_TYPES = [
  "Vector Index", "Prompt Spec", "API Schema", "Playbook", "Audio Profile",
  "UI Blueprint", "Telemetry Stream", "Test Fixture", "Knowledge Graph", "Policy Rule",
];

function buildSwarmCatalog() {
  const departments = DEPARTMENTS.map((d) => ({ ...d }));

  const agents = [];
  const statuses = ["active", "active", "ready", "standby"];
  departments.forEach((dept, dIdx) => {
    dept.agentRoles.forEach((role, rIdx) => {
      const num = dIdx * 4 + rIdx + 1;
      agents.push({
        id: `agent-${String(num).padStart(2, "0")}`,
        code: `${dept.id.slice(0, 3).toUpperCase()}-${String(rIdx + 1).padStart(2, "0")}`,
        name: role,
        deptId: dept.id,
        deptName: dept.name,
        color: dept.color,
        status: statuses[rIdx % statuses.length],
        model: rIdx === 0 ? "qwen3.8-27b (Groq)" : rIdx === 1 ? "llama-3.3-70b (NIM)" : "gemini-3.5-flash-lite",
        slotIndex: rIdx,
      });
    });
  });

  const skills = [];
  let skillSeq = 1;
  departments.forEach((dept) => {
    for (let i = 0; i < dept.skillQuota; i++) {
      const prefix = SKILL_PREFIXES[i % SKILL_PREFIXES.length];
      skills.push({
        id: `skill-${String(skillSeq).padStart(3, "0")}`,
        name: `${prefix} ${dept.name} #${i + 1}`,
        deptId: dept.id,
        deptName: dept.name,
        color: dept.color,
        trigger: `/${dept.id}-${i + 1}`,
      });
      skillSeq++;
    }
  });

  const integrations = INTEGRATIONS_SEED.map(([name, category, description], idx) => ({
    id: `int-${String(idx + 1).padStart(2, "0")}`,
    name,
    category,
    description,
    status: "connected",
  }));

  const mcpServers = MCP_SERVERS_SEED.map((srv) => ({
    ...srv,
    toolCount: srv.tools.length,
    status: "online",
  }));

  const mcpTools = [];
  let toolSeq = 1;
  mcpServers.forEach((srv) => {
    srv.tools.forEach((toolName) => {
      mcpTools.push({
        id: `tool-${String(toolSeq).padStart(2, "0")}`,
        name: toolName,
        serverId: srv.id,
        serverName: srv.name,
        transport: srv.transport,
      });
      toolSeq++;
    });
  });

  const resources = [];
  let resSeq = 1;
  departments.forEach((dept) => {
    for (let i = 0; i < dept.resourceQuota; i++) {
      const kind = RESOURCE_TYPES[(resSeq + i) % RESOURCE_TYPES.length];
      resources.push({
        id: `res-${String(resSeq).padStart(3, "0")}`,
        name: `${dept.name} ${kind} ${String(i + 1).padStart(2, "0")}`,
        kind,
        deptId: dept.id,
        deptName: dept.name,
        color: dept.color,
      });
      resSeq++;
    }
  });

  return {
    departments,
    agents,
    skills,
    integrations,
    mcpServers,
    mcpTools,
    resources,
  };
}

const CATEGORY_META = [
  { key: "departments", label: "Departments", total: SWARM_TOTALS.departments },
  { key: "agents", label: "AI Agents", total: SWARM_TOTALS.agents },
  { key: "skills", label: "Skills", total: SWARM_TOTALS.skills },
  { key: "integrations", label: "Integrations", total: SWARM_TOTALS.integrations },
  { key: "mcpServers", label: "MCP Servers", total: SWARM_TOTALS.mcpServers },
  { key: "mcpTools", label: "MCP Tools", total: SWARM_TOTALS.mcpTools },
  { key: "resources", label: "Resources", total: SWARM_TOTALS.resources },
];

function createBotGlyphSvg(color) {
  return `
    <svg viewBox="0 0 32 32" class="swarm-bot-svg" aria-hidden="true">
      <rect x="6" y="8" width="20" height="17" rx="7" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="1.8"/>
      <circle cx="12.5" cy="16" r="2.2" fill="#f8fafc"/>
      <circle cx="19.5" cy="16" r="2.2" fill="#f8fafc"/>
      <circle cx="12.5" cy="16" r="1.0" fill="#030712"/>
      <circle cx="19.5" cy="16" r="1.0" fill="#030712"/>
      <line x1="13" y1="21" x2="19" y2="21" stroke="#f8fafc" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;
}

export const AgentSwarmUI = (() => {
  const catalog = buildSwarmCatalog();
  let rootEl = null;
  let initialized = false;
  let activeCategory = "departments";
  let selectedDeptId = null;
  let selectedAgentId = null;
  let drawerOpen = false;
  let searchQuery = "";

  function polarToPercent(cx, cy, radius, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + Math.cos(rad) * radius,
      y: cy + Math.sin(rad) * radius,
    };
  }

  function buildOrbitalMarkup() {
    // Coordinate space: 1000 x 1000 SVG, percentage positioning for HTML nodes
    const cx = 500;
    const cy = 500;
    const rDept = 188;
    const rAgent = 342;
    const rLabel = 435;
    const fanOffsets = [-15, -5, 5, 15];

    const svgLines = [];
    const deptNodesHtml = [];
    const agentNodesHtml = [];
    const labelNodesHtml = [];

    catalog.departments.forEach((dept) => {
      const deptPos = polarToPercent(cx, cy, rDept, dept.angleDeg);
      const isSelectedDept = selectedDeptId === dept.id;

      // Center -> Department line
      svgLines.push(`
        <line
          x1="${cx}" y1="${cy}"
          x2="${deptPos.x.toFixed(1)}" y2="${deptPos.y.toFixed(1)}"
          class="swarm-link swarm-link-dept ${isSelectedDept ? "is-highlighted" : ""}"
          data-dept="${dept.id}"
          stroke="${dept.color}"
        />
      `);

      deptNodesHtml.push(`
        <button
          type="button"
          class="swarm-dept-node ${isSelectedDept ? "is-selected" : ""}"
          data-dept-id="${dept.id}"
          style="left: ${(deptPos.x / 10).toFixed(2)}%; top: ${(deptPos.y / 10).toFixed(2)}%; --node-color: ${dept.color}; --node-glow: ${dept.glow};"
          title="${dept.name} · Lead: ${dept.lead} (4 AI Agents)"
        >
          ${createBotGlyphSvg(dept.color)}
        </button>
      `);

      // 4 AI Agents fanning out from each Department
      const deptAgents = catalog.agents.filter((a) => a.deptId === dept.id);
      deptAgents.forEach((agent, idx) => {
        const agentAngle = dept.angleDeg + fanOffsets[idx];
        const agentPos = polarToPercent(cx, cy, rAgent, agentAngle);
        const isSelectedAgent = selectedAgentId === agent.id;

        svgLines.push(`
          <line
            x1="${deptPos.x.toFixed(1)}" y1="${deptPos.y.toFixed(1)}"
            x2="${agentPos.x.toFixed(1)}" y2="${agentPos.y.toFixed(1)}"
            class="swarm-link swarm-link-agent ${isSelectedDept || isSelectedAgent ? "is-highlighted" : ""}"
            data-dept="${dept.id}"
            data-agent="${agent.id}"
            stroke="${dept.color}"
          />
        `);

        agentNodesHtml.push(`
          <button
            type="button"
            class="swarm-agent-node ${isSelectedAgent ? "is-selected" : ""}"
            data-agent-id="${agent.id}"
            data-dept-id="${dept.id}"
            data-status="${agent.status}"
            style="left: ${(agentPos.x / 10).toFixed(2)}%; top: ${(agentPos.y / 10).toFixed(2)}%; --node-color: ${dept.color}; --node-glow: ${dept.glow};"
            title="${agent.name} (${dept.name}) · ${agent.status.toUpperCase()}"
          >
            ${createBotGlyphSvg(dept.color)}
            <span class="swarm-agent-status-dot"></span>
          </button>
        `);
      });

      // Outer Department Label
      const labelPos = polarToPercent(cx, cy, rLabel, dept.angleDeg);
      labelNodesHtml.push(`
        <button
          type="button"
          class="swarm-dept-label ${isSelectedDept ? "is-selected" : ""}"
          data-dept-id="${dept.id}"
          style="left: ${(labelPos.x / 10).toFixed(2)}%; top: ${(labelPos.y / 10).toFixed(2)}%; --node-color: ${dept.color};"
        >
          <span class="swarm-dept-dot"></span>
          <span class="swarm-dept-text">${dept.name}</span>
        </button>
      `);
    });

    return `
      <div class="agent-swarm-orbital" id="agent-swarm-orbital">
        <svg class="agent-swarm-svg" viewBox="0 0 1000 1000" aria-hidden="true">
          <circle cx="500" cy="500" r="${rDept}" class="swarm-orbit-guide" />
          <circle cx="500" cy="500" r="${rAgent}" class="swarm-orbit-guide swarm-orbit-guide-outer" />
          ${svgLines.join("")}
        </svg>
        ${deptNodesHtml.join("")}
        ${agentNodesHtml.join("")}
        ${labelNodesHtml.join("")}
      </div>
    `;
  }

  function buildTopPillsMarkup() {
    return `
      <button type="button" class="agent-swarm-cmd-pill" id="swarm-cmd-pill" title="Open Swarm Topology Inspector">
        <span class="swarm-cmd-slash">/jarvis-swarm</span>
        <span class="swarm-cmd-sep">·</span>
        <span class="swarm-cmd-brief">Multi-Agent Matrix</span>
      </button>

      <button type="button" class="agent-swarm-total-pill" id="swarm-total-pill" title="View All 32 AI Agents & 174 Resources">
        <span class="swarm-live-dot"></span>
        <span class="swarm-total-text">${SWARM_TOTALS.agents} AI Agents · ${SWARM_TOTALS.skills} Skills · ${SWARM_TOTALS.resources} Resources</span>
      </button>
    `;
  }

  function buildBottomDockMarkup() {
    const pills = CATEGORY_META.map((cat) => {
      const isActive = drawerOpen && activeCategory === cat.key;
      return `
        <button
          type="button"
          class="swarm-dock-pill ${isActive ? "active" : ""}"
          data-category="${cat.key}"
        >
          <span class="swarm-dock-label">${cat.label}</span>
          <span class="swarm-dock-count">${cat.total}</span>
        </button>
      `;
    }).join("");

    return `
      <div class="agent-swarm-dock" id="agent-swarm-dock" role="toolbar" aria-label="Agent Swarm Categories">
        ${pills}
      </div>
    `;
  }

  function getFilteredItems() {
    const q = searchQuery.trim().toLowerCase();
    const list = catalog[activeCategory] || [];

    return list.filter((item) => {
      if (selectedDeptId && item.deptId && item.deptId !== selectedDeptId) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        item.name,
        item.deptName,
        item.domain,
        item.category,
        item.description,
        item.kind,
        item.serverName,
        item.trigger,
        item.code,
        item.model,
        item.lead,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  function renderDrawerItem(item) {
    if (activeCategory === "departments") {
      return `
        <div class="swarm-item-card" data-dept-id="${item.id}" style="--item-accent: ${item.color};">
          <div class="swarm-item-head">
            <span class="swarm-item-dot" style="background: ${item.color};"></span>
            <span class="swarm-item-title">${item.name}</span>
            <span class="swarm-item-badge">Lead: ${item.lead}</span>
          </div>
          <div class="swarm-item-sub">${item.domain}</div>
          <div class="swarm-item-meta">4 Agents · ${item.skillQuota} Skills · ${item.resourceQuota} Resources</div>
        </div>
      `;
    }
    if (activeCategory === "agents") {
      return `
        <div class="swarm-item-card ${selectedAgentId === item.id ? "is-selected" : ""}" data-agent-id="${item.id}" data-dept-id="${item.deptId}" style="--item-accent: ${item.color};">
          <div class="swarm-item-head">
            <span class="swarm-item-dot" style="background: ${item.color};"></span>
            <span class="swarm-item-title">${item.name}</span>
            <span class="swarm-item-badge">${item.code}</span>
          </div>
          <div class="swarm-item-sub">${item.deptName} · ${item.model}</div>
          <div class="swarm-item-meta">Status: ${item.status.toUpperCase()}</div>
        </div>
      `;
    }
    if (activeCategory === "skills") {
      return `
        <div class="swarm-item-card" style="--item-accent: ${item.color};">
          <div class="swarm-item-head">
            <span class="swarm-item-dot" style="background: ${item.color};"></span>
            <span class="swarm-item-title">${item.name}</span>
            <span class="swarm-item-badge">${item.trigger}</span>
          </div>
          <div class="swarm-item-meta">${item.deptName} Department</div>
        </div>
      `;
    }
    if (activeCategory === "integrations") {
      return `
        <div class="swarm-item-card">
          <div class="swarm-item-head">
            <span class="swarm-item-dot" style="background: #38bdf8;"></span>
            <span class="swarm-item-title">${item.name}</span>
            <span class="swarm-item-badge">${item.category}</span>
          </div>
          <div class="swarm-item-sub">${item.description}</div>
        </div>
      `;
    }
    if (activeCategory === "mcpServers") {
      return `
        <div class="swarm-item-card">
          <div class="swarm-item-head">
            <span class="swarm-item-dot" style="background: #10b981;"></span>
            <span class="swarm-item-title">${item.name}</span>
            <span class="swarm-item-badge">${item.transport}</span>
          </div>
          <div class="swarm-item-sub">${item.scope}</div>
          <div class="swarm-item-meta">${item.toolCount} MCP Tools</div>
        </div>
      `;
    }
    if (activeCategory === "mcpTools") {
      return `
        <div class="swarm-item-card">
          <div class="swarm-item-head">
            <span class="swarm-item-dot" style="background: #a78bfa;"></span>
            <span class="swarm-item-title">${item.name}</span>
            <span class="swarm-item-badge">${item.transport}</span>
          </div>
          <div class="swarm-item-meta">Server: ${item.serverName}</div>
        </div>
      `;
    }
    return `
      <div class="swarm-item-card" style="--item-accent: ${item.color};">
        <div class="swarm-item-head">
          <span class="swarm-item-dot" style="background: ${item.color};"></span>
          <span class="swarm-item-title">${item.name}</span>
          <span class="swarm-item-badge">${item.kind}</span>
        </div>
        <div class="swarm-item-meta">${item.deptName}</div>
      </div>
    `;
  }

  function buildDrawerMarkup() {
    if (!drawerOpen) return "";
    const meta = CATEGORY_META.find((c) => c.key === activeCategory) || CATEGORY_META[0];
    const items = getFilteredItems();

    const tabsHtml = CATEGORY_META.map((cat) => `
      <button type="button" class="swarm-drawer-tab ${cat.key === activeCategory ? "active" : ""}" data-category="${cat.key}">
        ${cat.label} <span>${cat.total}</span>
      </button>
    `).join("");

    const deptFilterBanner = selectedDeptId
      ? `<div class="swarm-filter-chip">
           <span>Filtered: ${catalog.departments.find((d) => d.id === selectedDeptId)?.name || selectedDeptId}</span>
           <button type="button" id="swarm-clear-dept-filter" title="Clear department filter">×</button>
         </div>`
      : "";

    return `
      <aside class="agent-swarm-drawer" id="agent-swarm-drawer" aria-label="Swarm Inventory Inspector">
        <div class="swarm-drawer-header">
          <div class="swarm-drawer-title-group">
            <span class="swarm-drawer-title">${meta.label}</span>
            <span class="swarm-drawer-count">${items.length} / ${meta.total}</span>
          </div>
          <button type="button" class="swarm-drawer-close" id="swarm-drawer-close" aria-label="Close Inspector">×</button>
        </div>

        <div class="swarm-drawer-tabs">${tabsHtml}</div>

        <div class="swarm-drawer-search-row">
          <input
            type="text"
            class="swarm-drawer-search"
            id="swarm-drawer-search"
            placeholder="Filter ${meta.label.toLowerCase()}..."
            value="${searchQuery.replace(/"/g, "&quot;")}"
          />
          ${deptFilterBanner}
        </div>

        <div class="swarm-drawer-list" id="swarm-drawer-list">
          ${items.length ? items.map(renderDrawerItem).join("") : `<div class="swarm-empty-state">No matching ${meta.label.toLowerCase()}</div>`}
        </div>
      </aside>
    `;
  }

  function render() {
    if (!rootEl) return;
    rootEl.innerHTML = `
      ${buildTopPillsMarkup()}
      ${buildOrbitalMarkup()}
      ${buildBottomDockMarkup()}
      ${buildDrawerMarkup()}
    `;
    bindEvents();
  }

  function bindEvents() {
    if (!rootEl) return;

    rootEl.querySelector("#swarm-cmd-pill")?.addEventListener("click", () => {
      drawerOpen = !drawerOpen;
      if (drawerOpen) activeCategory = "departments";
      render();
    });

    rootEl.querySelector("#swarm-total-pill")?.addEventListener("click", () => {
      drawerOpen = true;
      activeCategory = "agents";
      selectedDeptId = null;
      render();
    });

    rootEl.querySelectorAll(".swarm-dock-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cat = btn.getAttribute("data-category");
        if (drawerOpen && activeCategory === cat) {
          drawerOpen = false;
        } else {
          activeCategory = cat;
          drawerOpen = true;
        }
        render();
      });
    });

    rootEl.querySelectorAll(".swarm-drawer-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.getAttribute("data-category");
        render();
      });
    });

    rootEl.querySelector("#swarm-drawer-close")?.addEventListener("click", () => {
      drawerOpen = false;
      render();
    });

    rootEl.querySelector("#swarm-clear-dept-filter")?.addEventListener("click", () => {
      selectedDeptId = null;
      selectedAgentId = null;
      render();
    });

    const searchInput = rootEl.querySelector("#swarm-drawer-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        const listEl = rootEl.querySelector("#swarm-drawer-list");
        const countEl = rootEl.querySelector(".swarm-drawer-count");
        const meta = CATEGORY_META.find((c) => c.key === activeCategory) || CATEGORY_META[0];
        const items = getFilteredItems();
        if (countEl) countEl.textContent = `${items.length} / ${meta.total}`;
        if (listEl) {
          listEl.innerHTML = items.length
            ? items.map(renderDrawerItem).join("")
            : `<div class="swarm-empty-state">No matching ${meta.label.toLowerCase()}</div>`;
        }
      });
    }

    rootEl.querySelectorAll(".swarm-dept-node, .swarm-dept-label").forEach((el) => {
      el.addEventListener("click", () => {
        const deptId = el.getAttribute("data-dept-id");
        selectedDeptId = selectedDeptId === deptId ? null : deptId;
        selectedAgentId = null;
        activeCategory = "agents";
        drawerOpen = true;
        render();
      });
    });

    rootEl.querySelectorAll(".swarm-agent-node").forEach((el) => {
      el.addEventListener("click", () => {
        selectedAgentId = el.getAttribute("data-agent-id");
        selectedDeptId = el.getAttribute("data-dept-id");
        activeCategory = "agents";
        drawerOpen = true;
        render();
      });
    });
  }

  function init() {
    if (initialized) return;
    rootEl = document.getElementById("agent-swarm-hud");
    if (!rootEl) return;
    initialized = true;
    render();
  }

  return {
    init,
    getCatalog: () => catalog,
    getTotals: () => ({ ...SWARM_TOTALS }),
    openCategory: (cat) => {
      if (CATEGORY_META.some((c) => c.key === cat)) {
        activeCategory = cat;
        drawerOpen = true;
        render();
      }
    },
    closeDrawer: () => {
      drawerOpen = false;
      render();
    },
  };
})();
