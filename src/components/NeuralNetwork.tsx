"use client";

import { useEffect, useRef, useCallback } from "react";

// ─── Canvas dimensions ────────────────────────────────────────────────────────
const W = 480;
const H = 260;
const NODE_R = 14;
const AMBER = "#E8A142";

// ─── Layered network structure ────────────────────────────────────────────────
//   Input → Processing → Analysis → Output
const LAYERS = [
  [{ id: "moderator",   label: "Moderator"   }],
  [{ id: "advocate",    label: "Advocate"    }, { id: "opposition", label: "Opposition" }, { id: "devil", label: "Devil's Adv." }],
  [{ id: "factchecker", label: "Fact Check"  }, { id: "analyst",    label: "Analyst"    }],
  [{ id: "judge",       label: "Judge"       }],
];

const LAYER_X = [70, 185, 300, 415];
const LAYER_LABELS = ["INPUT", "PROCESSING", "ANALYSIS", "OUTPUT"];

// ─── Agent metadata (for modal cards) ────────────────────────────────────────
export const AGENTS = [
  { id: "moderator",   label: "Moderator",    role: "Frames the debate and sets the central question" },
  { id: "advocate",    label: "Advocate",     role: "Builds the strongest case FOR the topic" },
  { id: "opposition",  label: "Opposition",   role: "Builds the strongest case AGAINST the topic" },
  { id: "devil",       label: "Devil's Adv.", role: "Challenges assumptions from both sides boldly" },
  { id: "factchecker", label: "Fact Check",   role: "Verifies claims and exposes misconceptions" },
  { id: "analyst",     label: "Analyst",      role: "Provides data, statistics and trend analysis" },
  { id: "judge",       label: "Judge",        role: "Delivers the final evidence-based verdict" },
];

// ─── Pre-compute node positions ───────────────────────────────────────────────
interface NodeDef { id: string; label: string; x: number; y: number; layerIdx: number }
const NODES: NodeDef[] = [];
LAYERS.forEach((layer, li) => {
  const gap = H / (layer.length + 1);
  layer.forEach((agent, ni) => {
    NODES.push({ id: agent.id, label: agent.label, x: LAYER_X[li], y: gap * (ni + 1), layerIdx: li });
  });
});

// ─── Pre-compute connections (fully connected between adjacent layers) ─────────
const CONNS: [number, number][] = [];
for (let l = 0; l < LAYERS.length - 1; l++) {
  const layerA = NODES.filter(n => n.layerIdx === l);
  const layerB = NODES.filter(n => n.layerIdx === l + 1);
  layerA.forEach(a => {
    layerB.forEach(b => {
      CONNS.push([NODES.indexOf(a), NODES.indexOf(b)]);
    });
  });
}

interface Particle { connIdx: number; t: number; speed: number }

interface Props {
  activeAgentId?: string;
  isRunning?: boolean;
  displayWidth?: number;
  onClick?: () => void;
  className?: string;
}

export default function NeuralNetwork({
  activeAgentId, isRunning = false, displayWidth = W, onClick, className = ""
}: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const particles  = useRef<Particle[]>([]);
  const clock      = useRef(0);

  const displayHeight = (displayWidth / W) * H;

  const activeNodeIdx   = activeAgentId ? NODES.findIndex(n => n.id === activeAgentId) : -1;
  const activeLayerIdx  = activeNodeIdx >= 0 ? NODES[activeNodeIdx].layerIdx : -1;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clock.current += 0.016;
    const t = clock.current;

    ctx.clearRect(0, 0, W, H);

    // ── Soft layer highlight glow ─────────────────────────────────────────────
    if (isRunning && activeLayerIdx >= 0) {
      const lx = LAYER_X[activeLayerIdx];
      const grd = ctx.createRadialGradient(lx, H / 2, 0, lx, H / 2, 90);
      grd.addColorStop(0, "rgba(232,161,66,0.07)");
      grd.addColorStop(1, "rgba(232,161,66,0)");
      ctx.beginPath();
      ctx.ellipse(lx, H / 2, 60, H / 2 + 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // ── Connection lines ──────────────────────────────────────────────────────
    CONNS.forEach(([ai, bi]) => {
      const a = NODES[ai];
      const b = NODES[bi];
      const lit = (a.layerIdx === activeLayerIdx || b.layerIdx === activeLayerIdx) && isRunning;

      const grd = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grd.addColorStop(0, lit ? "rgba(232,161,66,0.45)" : "rgba(232,161,66,0.06)");
      grd.addColorStop(1, lit ? "rgba(232,161,66,0.25)" : "rgba(232,161,66,0.03)");

      ctx.beginPath();
      ctx.moveTo(a.x + NODE_R, a.y);
      ctx.lineTo(b.x - NODE_R, b.y);
      ctx.strokeStyle = grd;
      ctx.lineWidth = lit ? 1.4 : 0.6;
      ctx.stroke();
    });

    // ── Spawn particles ───────────────────────────────────────────────────────
    const spawnRate = isRunning ? 0.45 : 0.025;
    if (Math.random() < spawnRate) {
      const connIdx = Math.floor(Math.random() * CONNS.length);
      particles.current.push({
        connIdx,
        t: 0,
        speed: isRunning
          ? 0.009 + Math.random() * 0.015
          : 0.0018 + Math.random() * 0.0028,
      });
    }
    if (particles.current.length > 70) {
      particles.current = particles.current.slice(-70);
    }

    // ── Draw particles ────────────────────────────────────────────────────────
    particles.current = particles.current.filter(p => {
      p.t += p.speed;
      if (p.t >= 1) return false;

      const [ai, bi] = CONNS[p.connIdx];
      const a = NODES[ai];
      const b = NODES[bi];
      const ax = a.x + NODE_R, ay = a.y;
      const bx = b.x - NODE_R, by = b.y;
      const px = ax + (bx - ax) * p.t;
      const py = ay + (by - ay) * p.t;

      const g = ctx.createRadialGradient(px, py, 0, px, py, 5);
      g.addColorStop(0, `rgba(232,161,66,${isRunning ? 1 : 0.55})`);
      g.addColorStop(0.5, `rgba(255,195,90,${isRunning ? 0.5 : 0.2})`);
      g.addColorStop(1, "rgba(232,161,66,0)");

      ctx.beginPath();
      ctx.arc(px, py, isRunning ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      return true;
    });

    // ── Draw neurons ──────────────────────────────────────────────────────────
    NODES.forEach((node, i) => {
      const isCurrent = i === activeNodeIdx && isRunning;
      const isInLayer = node.layerIdx === activeLayerIdx && isRunning;
      const pulse = Math.sin(t * 1.7 + i * 0.95) * 0.5 + 0.5;

      // Outer glow
      const glowR = isCurrent ? 42 : 25;
      const glowAlpha = isCurrent ? 0.55 : isInLayer ? 0.22 : pulse * 0.1;
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
      glow.addColorStop(0, `rgba(232,161,66,${glowAlpha})`);
      glow.addColorStop(1, "rgba(232,161,66,0)");
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Node fill (dark background)
      const fill = ctx.createRadialGradient(node.x - 4, node.y - 4, 1, node.x, node.y, NODE_R);
      if (isCurrent) {
        fill.addColorStop(0, "rgba(232,161,66,0.35)");
        fill.addColorStop(1, "rgba(14,12,8,0.95)");
      } else {
        fill.addColorStop(0, "rgba(35,28,15,0.9)");
        fill.addColorStop(1, "rgba(12,12,12,0.95)");
      }
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();

      // Border ring
      ctx.strokeStyle = isCurrent
        ? AMBER
        : `rgba(232,161,66,${isInLayer ? 0.5 + pulse * 0.3 : 0.12 + pulse * 0.18})`;
      ctx.lineWidth = isCurrent ? 2.2 : 1;
      ctx.stroke();

      // Inner activation dot (real neural network style)
      const dotR = isCurrent ? 5 : 3;
      const dotAlpha = isCurrent ? 1 : 0.25 + pulse * 0.45;
      const dotGrad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, dotR * 2);
      dotGrad.addColorStop(0, `rgba(255,210,120,${dotAlpha})`);
      dotGrad.addColorStop(1, `rgba(232,161,66,0)`);
      ctx.beginPath();
      ctx.arc(node.x, node.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.fill();

      // Smaller solid center
      ctx.beginPath();
      ctx.arc(node.x, node.y, dotR * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,140,${dotAlpha * 0.9})`;
      ctx.fill();

      // Node label
      ctx.font = `${isCurrent ? "bold 8px" : "7.5px"} ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isCurrent
        ? AMBER
        : `rgba(200,165,100,${0.4 + pulse * 0.25})`;
      ctx.fillText(node.label, node.x, node.y + NODE_R + 5);
    });

    // ── Layer labels at top ───────────────────────────────────────────────────
    LAYER_LABELS.forEach((lbl, li) => {
      const isActive = li === activeLayerIdx && isRunning;
      ctx.font = "6.5px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isActive ? "rgba(232,161,66,0.75)" : "rgba(232,161,66,0.18)";
      ctx.fillText(lbl, LAYER_X[li], 4);
    });

    rafRef.current = requestAnimationFrame(render);
  }, [activeAgentId, isRunning, activeNodeIdx, activeLayerIdx]);

  useEffect(() => {
    particles.current = [];
    clock.current = 0;
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onClick={onClick}
      style={{ width: displayWidth, height: displayHeight, display: "block" }}
      className={className}
    />
  );
}
