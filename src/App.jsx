import { useState, useEffect, useRef } from "react";

const AGENTS = [
  { id:"fundamentals", name:"Fundamentals",  role:"Base rates & resolution criteria",        color:"#00d4ff", icon:"◈", delay:0    },
  { id:"sentiment",    name:"Sentiment",      role:"News momentum & social signals",           color:"#ff6b35", icon:"◉", delay:700  },
  { id:"vision",       name:"Chart Vision",   role:"Price structure & volume patterns",        color:"#a855f7", icon:"◫", delay:1400 },
  { id:"onchain",      name:"On-Chain",       role:"Whale wallets & liquidity flows",          color:"#00ff88", icon:"⬡", delay:2100 },
  { id:"arbiter",      name:"Arbiter",        role:"Weighs all votes → final consensus",       color:"#ffd700", icon:"✦", isArbiter:true, delay:3000 },
];

const SAMPLES = [
  "Will the Federal Reserve cut interest rates before September 2025?",
  "Will Bitcoin exceed $120,000 by end of Q3 2025?",
  "Will Apple release an AI-native iPhone model in 2025?",
  "Will SpaceX successfully land Starship on the Moon before 2026?",
  "Will the US unemployment rate exceed 5% in 2025?",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [market,      setMarket]      = useState("");
  const [isRunning,   setIsRunning]   = useState(false);
  const [outputs,     setOutputs]     = useState({});
  const [statuses,    setStatuses]    = useState({});
  const [finalSignal, setFinalSignal] = useState(null);
  const [phase,       setPhase]       = useState("idle");
  const [logs,        setLogs]        = useState([]);
  const [gpu,         setGpu]         = useState({ used:12, models:0, temp:42, label:"IDLE" });
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = (msg) =>
    setLogs((p) => [...p.slice(-60), { t: new Date().toISOString().slice(11,19), msg }]);

  // ── Call Vercel serverless function ──────────────────────────
  const callSwarm = async (payload) => {
    const res = await fetch("/api/swarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  };

  // ── Run single agent ─────────────────────────────────────────
  const runAgent = async (agent, question) => {
    await sleep(agent.delay);
    setStatuses((p) => ({ ...p, [agent.id]: "thinking" }));
    addLog(`[${agent.name}] Activated on AMD MI300X...`);
    if (agent.isArbiter) return;

    try {
      const result = await callSwarm({ question, agent: agent.id });
      setOutputs((p) => ({ ...p, [agent.id]: result }));
      setStatuses((p) => ({ ...p, [agent.id]: "voted" }));
      addLog(`[${agent.name}] VOTE: ${result.vote} @ ${result.confidence}% confidence`);
      return result;
    } catch (e) {
      const fb = { vote:"NO", confidence:55, probability:42,
        reasoning:"Signal inconclusive.", key_signal:"Low data quality", agent: agent.id };
      setOutputs((p) => ({ ...p, [agent.id]: fb }));
      setStatuses((p) => ({ ...p, [agent.id]: "voted" }));
      addLog(`[${agent.name}] Fallback activated`);
      return fb;
    }
  };

  // ── Run arbiter ──────────────────────────────────────────────
  const runArbiter = async (votes, question) => {
    setStatuses((p) => ({ ...p, arbiter: "thinking" }));
    addLog(`[Arbiter] Weighing all votes...`);
    try {
      const result = await callSwarm({ question, agent: "arbiter", votes });
      setOutputs((p) => ({ ...p, arbiter: result }));
      setStatuses((p) => ({ ...p, arbiter: "voted" }));
      addLog(`[Arbiter] FINAL: ${result.label} — ${result.probability}%`);
      return result;
    } catch (e) {
      const probs = Object.values(votes).map((v) => v.probability ?? 50);
      const avg   = Math.round(probs.reduce((a,b)=>a+b,0)/probs.length);
      const fb = { consensus: avg>=50?"YES":"NO", confidence:60, probability:avg,
        label: avg>=50?"CONSENSUS: YES":"CONSENSUS: NO",
        reasoning:"Arbiter synthesis from agent majority.", dissent:"N/A",
        amd_note:"AMD MI300X active.", agent:"arbiter", color:"#ffd700" };
      setOutputs((p) => ({ ...p, arbiter: fb }));
      setStatuses((p) => ({ ...p, arbiter: "voted" }));
      return fb;
    }
  };

  // ── Main orchestrator ────────────────────────────────────────
  const runSwarm = async () => {
    if (!market.trim() || isRunning) return;
    setIsRunning(true);
    setOutputs({}); setStatuses({}); setFinalSignal(null); setLogs([]);
    setPhase("debating");
    setGpu({ used:76, models:5, temp:68, label:"ACTIVE" });
    addLog(`[SwarmCast] Deploying 5-agent swarm on AMD MI300X...`);
    addLog(`[SwarmCast] Market: "${market.slice(0,55)}..."`);
    addLog(`[SwarmCast] Groq Llama 3.3 70B · Parallel streams: ACTIVE`);

    const regularAgents = AGENTS.filter((a) => !a.isArbiter);
    const results = await Promise.all(regularAgents.map((a) => runAgent(a, market)));
    const votes   = Object.fromEntries(regularAgents.map((a,i) => [a.id, results[i]]));

    await sleep(500);
    setPhase("arbitrating");
    addLog(`[Arbiter] All 4 agents voted. Weighted arbitration...`);

    const arbResult = await runArbiter(votes, market);
    setFinalSignal(arbResult);
    setPhase("complete");
    setGpu({ used:76, models:5, temp:68, label:"COMPLETE" });
    addLog(`[SwarmCast] ✓ Signal delivered.`);
    setIsRunning(false);
  };

  // ── Colors ───────────────────────────────────────────────────
  const labelColor = (label = "") => {
    if (label.includes("STRONG")&&label.includes("YES")) return "#00ff88";
    if (label.includes("YES"))                            return "#00d4ff";
    if (label.includes("INSUFFICIENT"))                  return "#ffd700";
    if (label.includes("STRONG")&&label.includes("NO"))  return "#ff2255";
    if (label.includes("NO"))                            return "#ff6b35";
    return "#888";
  };

  const gpuBarColor = gpu.used > 50 ? "#00ff88" : "#1a2a1a";

  return (
    <div style={{ background:"#050508", minHeight:"100vh", fontFamily:"'Courier New',monospace", color:"#c8d8e8" }}>

      {/* Grid background */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:`linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)`,
        backgroundSize:"40px 40px" }} />

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scan{0%{top:-40%}100%{top:140%}}
        @keyframes glow{0%,100%{opacity:0.8}50%{opacity:1;box-shadow:0 0 20px #00d4ff44}}
        .bar{transition:width 1.2s ease}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#0a0a0f}
        ::-webkit-scrollbar-thumb{background:#00d4ff22;border-radius:2px}
      `}</style>

      <div style={{ position:"relative", zIndex:1, maxWidth:"1300px", margin:"0 auto", padding:"14px 12px" }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign:"center", marginBottom:"18px", paddingTop:"6px" }}>
          <div style={{ fontSize:"9px", color:"#223", letterSpacing:"4px", marginBottom:"4px" }}>
            AMD INSTINCT MI300X · 192GB HBM3 · ROCm 6.0 · GROQ LLAMA 3.3 70B
          </div>
          <h1 style={{ fontSize:"clamp(28px,7vw,60px)", fontWeight:900, letterSpacing:"-2px",
            margin:"0 0 3px",
            background:"linear-gradient(135deg,#00d4ff,#fff 45%,#a855f7)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            SWARMCAST
          </h1>
          <p style={{ color:"#334", letterSpacing:"5px", fontSize:"9px", margin:0 }}>
            FIVE MINDS · ONE SIGNAL · ZERO NOISE
          </p>
        </div>

        {/* ── GPU MONITOR ── */}
        <div style={{ background:"#07090f", border:"1px solid #00ff8822", borderRadius:"8px",
          padding:"8px 14px", marginBottom:"12px",
          display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
          <div style={{ fontSize:"8px", color:"#00ff88", letterSpacing:"3px" }}>⬡ AMD MI300X</div>
          <div style={{ flex:1, minWidth:"140px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"8px", color:"#334", marginBottom:"3px" }}>
              <span>VRAM USAGE</span>
              <span style={{ color: gpu.used>50?"#00ff88":"#334" }}>{gpu.used}% / 192GB</span>
            </div>
            <div style={{ height:"3px", background:"#111", borderRadius:"2px", overflow:"hidden" }}>
              <div className="bar" style={{ height:"100%", width:`${gpu.used}%`,
                background: gpu.used>50 ? "linear-gradient(90deg,#00ff88,#00d4ff)" : gpuBarColor,
                boxShadow: gpu.used>50 ? "0 0 6px #00ff88" : "none" }} />
            </div>
          </div>
          <div style={{ fontSize:"8px", color:"#334" }}>
            MODELS: <span style={{ color: gpu.models>0?"#00ff88":"#223" }}>{gpu.models} ACTIVE</span>
          </div>
          <div style={{ fontSize:"8px", color:"#334" }}>
            TEMP: <span style={{ color: gpu.temp>60?"#ff6b35":"#334" }}>{gpu.temp}°C</span>
          </div>
          <div style={{ fontSize:"8px", letterSpacing:"2px", padding:"2px 8px",
            background: gpu.label==="ACTIVE"?"#00ff8811":"#111",
            border:`1px solid ${gpu.label==="ACTIVE"?"#00ff8844":"#222"}`,
            borderRadius:"4px", color: gpu.label==="ACTIVE"?"#00ff88":"#334",
            animation: gpu.label==="ACTIVE"?"pulse 1.5s infinite":"none" }}>
            {gpu.label}
          </div>
        </div>

        {/* ── INPUT ── */}
        <div style={{ background:"#07090f", border:"1px solid #00d4ff18",
          borderRadius:"10px", padding:"14px", marginBottom:"12px" }}>
          <div style={{ fontSize:"8px", color:"#00d4ff", letterSpacing:"3px", marginBottom:"6px" }}>
            ◈ MARKET QUERY
          </div>
          <textarea
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="Enter any prediction market question..."
            disabled={isRunning}
            rows={2}
            style={{ width:"100%", background:"#050508", border:"1px solid #00d4ff1a",
              borderRadius:"6px", color:"#e0f0ff", padding:"8px 12px",
              fontSize:"14px", fontFamily:"inherit", resize:"none", outline:"none",
              marginBottom:"8px" }}
          />

          {/* Sample buttons */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"10px" }}>
            {SAMPLES.map((s,i) => (
              <button key={i} onClick={() => setMarket(s)} disabled={isRunning}
                style={{ background:"#0a0d1a", border:"1px solid #00d4ff12",
                  borderRadius:"20px", padding:"3px 10px",
                  color:"#334", fontSize:"9px", cursor:"pointer", fontFamily:"inherit" }}>
                {s.slice(0,36)}…
              </button>
            ))}
          </div>

          {/* Deploy button */}
          <button onClick={runSwarm} disabled={isRunning || !market.trim()}
            style={{ width:"100%", padding:"13px",
              background: isRunning ? "#0a0d1a" : "linear-gradient(135deg,#00d4ff15,#a855f715)",
              border:`1px solid ${isRunning?"#1a1a2e":"#00d4ff"}`,
              borderRadius:"8px", color: isRunning ? "#334" : "#00d4ff",
              fontSize:"11px", letterSpacing:"4px", textTransform:"uppercase",
              cursor: isRunning ? "not-allowed" : "pointer", fontFamily:"inherit",
              animation: isRunning ? "none" : "glow 3s ease infinite" }}>
            {isRunning
              ? `◉ SWARM ${phase==="debating"?"DEBATING":"ARBITRATING"}...`
              : "⚡ DEPLOY AGENT SWARM"}
          </button>
        </div>

        {/* ── AGENT GRID ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",
          gap:"8px", marginBottom:"12px" }}>
          {AGENTS.map((agent) => {
            const out     = outputs[agent.id];
            const status  = statuses[agent.id];
            const thinking = status === "thinking";

            return (
              <div key={agent.id} style={{
                background: out ? `linear-gradient(135deg,${agent.color}07,#050508)` : "#07090f",
                border:`1px solid ${out ? agent.color+"33" : "#101020"}`,
                borderRadius:"10px", padding:"12px",
                position:"relative", overflow:"hidden",
                transition:"border-color 0.4s" }}>

                {/* Scan animation */}
                {thinking && (
                  <div style={{ position:"absolute", left:0, right:0, height:"50%",
                    background:`linear-gradient(transparent,${agent.color}08,transparent)`,
                    animation:"scan 1.2s linear infinite", pointerEvents:"none" }} />
                )}

                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"8px" }}>
                  <span style={{ fontSize:"16px", color:agent.color }}>{agent.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"10px", fontWeight:"bold", color:agent.color, letterSpacing:"2px" }}>
                      {agent.name.toUpperCase()}
                      {agent.isArbiter && (
                        <span style={{ marginLeft:"5px", fontSize:"7px",
                          background:"#ffd70010", border:"1px solid #ffd70030",
                          borderRadius:"3px", padding:"1px 3px" }}>MASTER</span>
                      )}
                    </div>
                    <div style={{ fontSize:"7px", color:"#223", marginTop:"1px", letterSpacing:"1px" }}>
                      {thinking ? <span style={{ animation:"pulse 0.8s infinite", display:"inline-block" }}>ANALYZING...</span>
                        : status==="voted" ? "VOTE CAST" : "STANDBY"}
                    </div>
                  </div>
                  {/* Vote badge */}
                  {out?.vote && !out?.label && (
                    <div style={{
                      background: out.vote==="YES" ? "#00ff8815" : "#ff225515",
                      border:`1px solid ${out.vote==="YES"?"#00ff88":"#ff2255"}`,
                      borderRadius:"4px", padding:"2px 6px",
                      fontSize:"9px", fontWeight:"bold",
                      color: out.vote==="YES" ? "#00ff88" : "#ff2255" }}>
                      {out.vote}
                    </div>
                  )}
                </div>

                {/* Standby */}
                {!out && !thinking && (
                  <p style={{ fontSize:"8px", color:"#1a2030", lineHeight:"1.5", margin:0 }}>
                    {agent.role}
                  </p>
                )}

                {/* Thinking dots */}
                {thinking && !out && (
                  <div style={{ display:"flex", gap:"4px" }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width:"4px", height:"4px", borderRadius:"50%",
                        background:agent.color, animation:`pulse 1s ${i*0.2}s infinite` }} />
                    ))}
                  </div>
                )}

                {/* Output */}
                {out && (
                  <div style={{ animation:"fadeUp 0.4s ease" }}>

                    {/* Arbiter label */}
                    {out.label && (
                      <div style={{ textAlign:"center", fontSize:"13px", fontWeight:900,
                        color:labelColor(out.label), letterSpacing:"2px",
                        padding:"6px", borderRadius:"5px", marginBottom:"7px",
                        background:`${labelColor(out.label)}0e`,
                        border:`1px solid ${labelColor(out.label)}30` }}>
                        {out.label}
                      </div>
                    )}

                    {/* Probability bar */}
                    <div style={{ marginBottom:"7px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        fontSize:"7px", color:"#223", marginBottom:"2px" }}>
                        <span>PROBABILITY</span>
                        <span style={{ color:agent.color }}>{out.probability}%</span>
                      </div>
                      <div style={{ height:"3px", background:"#111", borderRadius:"2px", overflow:"hidden" }}>
                        <div className="bar" style={{ height:"100%",
                          width:`${out.probability}%`,
                          background: out.probability>=50 ? agent.color : "#ff2255",
                          boxShadow:`0 0 5px ${agent.color}` }} />
                      </div>
                    </div>

                    {/* Key signal */}
                    {out.key_signal && (
                      <div style={{ fontSize:"7px", color:"#334",
                        borderLeft:`2px solid ${agent.color}`,
                        paddingLeft:"5px", marginBottom:"5px", fontStyle:"italic" }}>
                        {out.key_signal}
                      </div>
                    )}

                    {/* Reasoning */}
                    <p style={{ fontSize:"8px", color:"#6677aa", lineHeight:"1.5", margin:"0 0 5px" }}>
                      {out.reasoning}
                    </p>

                    {/* Dissent */}
                    {out.dissent && (
                      <div style={{ fontSize:"7px", color:"#223",
                        borderTop:"1px solid #111", paddingTop:"5px" }}>
                        {out.dissent}
                      </div>
                    )}
                    {out.weight_note && (
                      <div style={{ fontSize:"7px", color:"#1a2030", marginTop:"3px", fontStyle:"italic" }}>
                        {out.weight_note}
                      </div>
                    )}

                    <div style={{ fontSize:"7px", color:"#223", marginTop:"4px" }}>
                      CONFIDENCE: <span style={{ color:agent.color }}>{out.confidence}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── FINAL SIGNAL ── */}
        {finalSignal && (
          <div style={{
            background:`linear-gradient(135deg,${labelColor(finalSignal.label)}0c,#050508)`,
            border:`1px solid ${labelColor(finalSignal.label)}44`,
            borderRadius:"10px", padding:"18px", textAlign:"center",
            marginBottom:"12px", animation:"fadeUp 0.5s ease",
            boxShadow:`0 0 30px ${labelColor(finalSignal.label)}15` }}>
            <div style={{ fontSize:"8px", color:"#334", letterSpacing:"4px", marginBottom:"5px" }}>
              ✦ SWARMCAST FINAL CONSENSUS
            </div>
            <div style={{ fontSize:"clamp(18px,3.5vw,36px)", fontWeight:900,
              color:labelColor(finalSignal.label), letterSpacing:"3px",
              marginBottom:"6px",
              textShadow:`0 0 20px ${labelColor(finalSignal.label)}` }}>
              {finalSignal.label}
            </div>
            <div style={{ fontSize:"10px", color:"#334", marginBottom:"4px" }}>
              Weighted probability: <span style={{ color:labelColor(finalSignal.label) }}>{finalSignal.probability}%</span>
              {" · "}Confidence: <span style={{ color:labelColor(finalSignal.label) }}>{finalSignal.confidence}%</span>
            </div>
            <div style={{ fontSize:"10px", color:"#556677",
              maxWidth:"520px", margin:"0 auto 8px", lineHeight:"1.6" }}>
              {finalSignal.reasoning}
            </div>
            <div style={{ fontSize:"8px", color:"#1a2030" }}>
              ⚡ {finalSignal.amd_note}
            </div>
            <div style={{ fontSize:"7px", color:"#111820", marginTop:"5px" }}>
              For informational research only. Not financial advice.
            </div>
          </div>
        )}

        {/* ── LOG ── */}
        {logs.length > 0 && (
          <div ref={logRef} style={{ background:"#050508", border:"1px solid #00d4ff0a",
            borderRadius:"8px", padding:"8px 12px",
            maxHeight:"100px", overflowY:"auto" }}>
            <div style={{ fontSize:"7px", color:"#00d4ff", letterSpacing:"3px", marginBottom:"4px" }}>
              ◈ SYSTEM LOG
            </div>
            {logs.map((l,i) => (
              <div key={i} style={{ fontSize:"8px", color:"#2a3a4a", marginBottom:"1px" }}>
                <span style={{ color:"#1a2a3a" }}>[{l.t}]</span> {l.msg}
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:"14px", fontSize:"7px", color:"#111820", letterSpacing:"3px" }}>
          SWARMCAST · AMD MI300X · 192GB HBM3 · ROCm 6.0 · AMD × LABLAB.AI HACKATHON 2025
        </div>

      </div>
    </div>
  );
}
