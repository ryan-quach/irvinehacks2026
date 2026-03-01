import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import graphDataRaw from '../data/journal_full_data.json';
import JournalEntryView, {
  type JournalEntry,
  type ScreenPoint,
} from './JournalEntryView';

// --- Configuration ---
const EMOTION_COLORS: Record<string, string> = {
  happiness: "#4ECDC4",
  excitement: "#FFD700",
  calm: "#8a9a5b",
  anxiety: "#A892EE",
  stress: "#FF6B6B",
  sadness: "#5DADE2",
  anger: "#E74C3C",
};

const THEMES_COUNT = 7;

interface GraphViewProps {
  isVisible: boolean;
}

// --- Math Helpers ---
const getCosineSimilarity = (vecA: number[], vecB: number[]) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
};

const GraphView: React.FC<GraphViewProps> = ({ isVisible }) => {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  // ── Journal Entry View state ──────────────────────────────────────────────
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [nodeColor, setNodeColor] = useState("#ffffff");
  const [clickOrigin, setClickOrigin] = useState<ScreenPoint>({ x: 0, y: 0 });

  // ── Node click handler ────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
    const color = EMOTION_COLORS[node.primary_emotion] || "#ffffff";

    // Screen position of the click for the flood animation origin
    setClickOrigin({ x: event.clientX, y: event.clientY });
    setNodeColor(color);

    // Map graph node → JournalEntry shape
    setSelectedEntry({
      transcript: node.transcript || "",
      summary: node.summary || "",
      primary_emotion: node.primary_emotion || "",
      secondary_emotion: node.secondary_emotion || "",
      intensity: node.intensity ?? 0,
      valence: node.valence ?? 0,
      arousal: node.arousal ?? 0,
      themes: node.themes || [],
      embedding: "",
      entry_date: node.entry_date || "",
      created_at: node.created_at || "",
    });

    setEntryOpen(true);
  }, []);

  // 1. Data Processing — keep ALL fields from raw data
  const processedData = useMemo(() => {
    const rawEntries = graphDataRaw?.entries || [];

    // Spread all fields so JournalEntryView has access to transcript, valence, etc.
    const entries = rawEntries.map((node: any) => ({
      ...node,
      id: node.id,
    }));

    const links: any[] = [];
    const connectionCounts: Record<string, number> = {};
    const THRESHOLD = 0.85;

    entries.forEach((nodeA: any, i: number) => {
      for (let tIdx = 0; tIdx < THEMES_COUNT; tIdx++) {
        let bestMatch: { id: string; score: number } | null = null;
        const vA = nodeA.embeddings?.[tIdx];
        if (!vA) continue;

        entries.forEach((nodeB: any, j: number) => {
          if (i === j) return;
          const vB = nodeB.embeddings?.[tIdx];
          if (!vB) return;

          const score = getCosineSimilarity(vA, vB);
          if (score > THRESHOLD) {
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = { id: nodeB.id, score };
            }
          }
        });

        if (bestMatch) {
          links.push({ source: nodeA.id, target: bestMatch.id });
          connectionCounts[nodeA.id] = (connectionCounts[nodeA.id] || 0) + 1;
          connectionCounts[bestMatch.id] = (connectionCounts[bestMatch.id] || 0) + 1;
        }
      }
    });

    const emotionLeaders: Record<string, string> = {};
    const maxCounts: Record<string, number> = {};
    entries.forEach((node: any) => {
      const count = connectionCounts[node.id] || 0;
      if (!maxCounts[node.primary_emotion] || count > maxCounts[node.primary_emotion]) {
        maxCounts[node.primary_emotion] = count;
        emotionLeaders[node.primary_emotion] = node.id;
      }
    });

    return {
      nodes: entries.map((node: any) => ({
        ...node,
        isLeader:
          emotionLeaders[node.primary_emotion] === node.id &&
          (connectionCounts[node.id] || 0) > 0,
      })),
      links,
    };
  }, []);

  // 2. Physics & Visibility Control
  useEffect(() => {
    if (!fgRef.current) return;

    if (isVisible) {
      const timer = setTimeout(() => {
        fgRef.current?.d3Force('charge')?.strength(-400);
        fgRef.current?.d3Force('link')?.distance(120);
        fgRef.current?.d3ReheatSimulation();
        fgRef.current?.refresh();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      fgRef.current.stopAnimation();
    }
  }, [isVisible]);

  return (
    <div
      className="graph-wrapper"
      style={{
        width: '100vw',
        height: '100vh',
        background: '#020202',
        position: 'relative',
      }}
    >
      <ForceGraph3D
        ref={fgRef}
        graphData={processedData}
        backgroundColor="#020202"
        showNavInfo={false}
        linkColor={() => "rgba(255, 255, 255, 0.25)"}
        linkWidth={1.5}
        nodeLabel={() => ""}
        onNodeClick={handleNodeClick}
        nodeThreeObject={(node: any) => {
          const color = EMOTION_COLORS[node.primary_emotion] || "#ffffff";
          const radius = 6 + Math.pow(node.intensity, 2) * 15;

          const geometry = new THREE.SphereGeometry(radius, 32, 32);
          const material = new THREE.MeshBasicMaterial({ color });
          const sphere = new THREE.Mesh(geometry, material);

          if (node.isLeader) {
            const sprite = new SpriteText(node.primary_emotion.toUpperCase());
            sprite.color = color;
            sprite.textHeight = 10;
            sprite.fontWeight = 'bold';
            sprite.position.set(0, radius + 15, 0);
            sprite.center.set(0.5, 0);

            const group = new THREE.Group();
            group.add(sphere);
            group.add(sprite);
            return group;
          }

          return sphere;
        }}
      />

      {/* Journal Entry overlay */}
      <JournalEntryView
        open={entryOpen}
        entry={selectedEntry}
        color={nodeColor}
        origin={clickOrigin}
        onClose={() => setEntryOpen(false)}
        closeOnBackdrop
      />
    </div>
  );
};

export default GraphView;