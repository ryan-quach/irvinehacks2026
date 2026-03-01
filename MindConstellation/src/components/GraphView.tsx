import React, { useState, useRef, useEffect } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three'; 
import { supabase } from '../utils/supabaseClient';
import JournalEntryView, { type JournalEntry, type ScreenPoint } from './JournalEntryView';

// --- Configuration ---
const EMOTION_COLORS: Record<string, string> = {
  happiness: "#4ECDC4",
  excitement: "#FFD700",
  calm: "#8a9a5b",
  anxiety: "#A892EE",
  stress: "#FF6B6B",
  sadness: "#5DADE2",
  anger: "#E74C3C"
};

// --- TypeScript Interfaces ---
interface GraphNode {
  id: string;
  primary_emotion: string;
  intensity: number;
  themeMap: Map<string, number[]>; 
  leaderLabel?: string;
  [key: string]: any; 
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface GraphViewProps {
  isVisible: boolean;
}

// --- Math Helpers ---
const getCosineSimilarity = (vecA: number[], vecB: number[]) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return (magA === 0 || magB === 0) ? 0 : dotProduct / (magA * magB);
};

const GraphView: React.FC<GraphViewProps> = ({ isVisible }) => {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  
  // ─── State Management ──────────────────────────────────────────────────────
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  
  // Overlay State
  const [entryOpen, setEntryOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [nodeColor, setNodeColor] = useState("#ffffff");
  const [clickOrigin, setClickOrigin] = useState<ScreenPoint>({ x: 0, y: 0 });

  // ─── Data Fetching & Processing ───────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      const { data: entries, error: eError } = await supabase.from('journal_entries').select('*');
      const { data: embeddings, error: embError } = await supabase.from('theme_embeddings').select('*');

      if (eError || embError) {
        console.error("Supabase Error:", eError || embError);
        return;
      }

      // 1. Map embeddings to Journal IDs
      const nodeEmbeddingsMap = new Map<string, Map<string, number[]>>();
      embeddings.forEach((emb: any) => {
        if (!nodeEmbeddingsMap.has(emb.journal_id)) {
          nodeEmbeddingsMap.set(emb.journal_id, new Map());
        }
        const vector = typeof emb.embedding === 'string' 
          ? JSON.parse(emb.embedding) 
          : emb.embedding;
        nodeEmbeddingsMap.get(emb.journal_id)?.set(emb.theme.toLowerCase(), vector);
      });

      // 2. Build Node Objects
      // const nodes: GraphNode[] = entries.map((entry: any) => ({
      //   ...entry,
      //   themeMap: nodeEmbeddingsMap.get(entry.id) || new Map()
      // }));
      const nodes: GraphNode[] = entries.map((entry: any) => {
      const themeMap = nodeEmbeddingsMap.get(entry.id) || new Map();
      return {
        ...entry,
        themeMap,
        themes: Array.from(themeMap.keys()),  // ← override with ALL themes
      };
    });

      // 3. Build Links (Connectivity + Top-K Strategy)
      const links: GraphLink[] = [];
      const themeConnectionCounts: Record<string, Record<string, number>> = {}; 

      nodes.forEach((nodeA, i) => {
        const potentialLinks: { id: string, score: number, theme: string }[] = [];

        nodes.forEach((nodeB, j) => {
          if (i === j) return;
          let maxSim = -1; 
          let bestTheme = "general";

          nodeA.themeMap.forEach((vecA, theme) => {
            const vecB = nodeB.themeMap.get(theme);
            if (vecB) {
              const score = getCosineSimilarity(vecA, vecB);
              if (score > maxSim) {
                maxSim = score;
                bestTheme = theme;
              }
            }
          });
          potentialLinks.push({ id: nodeB.id, score: maxSim, theme: bestTheme });
        });

        potentialLinks.sort((a, b) => b.score - a.score);

        // A. Mandatory Best-Match Link (Prevents Isolation)
        const bestMatch = potentialLinks[0];
        if (bestMatch) {
          links.push({ source: nodeA.id, target: bestMatch.id });
          if (!themeConnectionCounts[nodeA.id]) themeConnectionCounts[nodeA.id] = {};
          themeConnectionCounts[nodeA.id][bestMatch.theme] = (themeConnectionCounts[nodeA.id][bestMatch.theme] || 0) + 1;
        }

        // B. Secondary Link (If Score is Meaningful)
        const secondMatch = potentialLinks[1];
        if (secondMatch && secondMatch.score > 0.25) {
          links.push({ source: nodeA.id, target: secondMatch.id });
          themeConnectionCounts[nodeA.id][secondMatch.theme] = (themeConnectionCounts[nodeA.id][secondMatch.theme] || 0) + 1;
        }
      });

      // 4. Identify Theme Leaders
      const themeLeaders: Record<string, { id: string, count: number }> = {};
      Object.keys(themeConnectionCounts).forEach(nodeId => {
        Object.entries(themeConnectionCounts[nodeId]).forEach(([theme, count]) => {
          if (!themeLeaders[theme] || count > themeLeaders[theme].count) {
            themeLeaders[theme] = { id: nodeId, count };
          }
        });
      });

      const finalNodes = nodes.map(node => {
        let leaderLabel = undefined;
        Object.entries(themeLeaders).forEach(([theme, leaderInfo]) => {
          if (leaderInfo.id === node.id) {
            leaderLabel = theme.replace('_', ' ');
          }
        });
        return { ...node, leaderLabel };
      });

      setGraphData({ nodes: finalNodes, links });
      setLoading(false);
    };

    fetchData();
  }, []);

  // ─── Physics & Visibility Tuning ──────────────────────────────────────────
  useEffect(() => {
    if (!fgRef.current || loading) return;

    if (isVisible) {
      fgRef.current.resumeAnimation();  // ← this was missing

      setTimeout(() => {
        fgRef.current?.d3Force('charge')?.strength(-150);
        fgRef.current?.d3Force('link')?.distance(50);
        fgRef.current?.d3Force('collide', (THREE as any).d3ForceCollide(100));
        fgRef.current?.d3ReheatSimulation();
        fgRef.current?.refresh();
      }, 50);
    } else {
      fgRef.current.pauseAnimation();
    }
}, [isVisible, loading]);

  // ─── Interaction Handlers ─────────────────────────────────────────────────
  const handleNodeClick = (node: any, event: MouseEvent) => {
    setClickOrigin({ x: event.clientX, y: event.clientY });
    setSelectedEntry(node as JournalEntry);  // node already has .id from Supabase
    setNodeColor(EMOTION_COLORS[node.primary_emotion] || "#ffffff");
    setEntryOpen(true);
  };

  if (loading) return null;

  return (
    <div className="graph-wrapper" style={{ width: '100vw', height: '100vh', background: '#020202' }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#020202"
        showNavInfo={false}
        linkColor={() => "rgba(255, 255, 255, 0.6)"}
        linkWidth={2.0}
        onNodeClick={handleNodeClick}
        nodeThreeObject={(node: any) => {
          const color = EMOTION_COLORS[node.primary_emotion] || "#ffffff";
          const radius = 6 + (Math.pow(node.intensity, 2) * 15);
          const geometry = new THREE.SphereGeometry(radius, 32, 32);
          const material = new THREE.MeshBasicMaterial({ color });
          const sphere = new THREE.Mesh(geometry, material);

          if (node.leaderLabel) {
            const sprite = new SpriteText(node.leaderLabel.toUpperCase());
            sprite.color = "#ffffff";
            sprite.textHeight = 14;
            sprite.fontWeight = 'bold';
            sprite.backgroundColor = 'rgba(0,0,0,0.5)';
            sprite.padding = 2;
            sprite.position.set(0, radius + 25, 0); 
            sprite.center.set(0.5, 0); 
            
            const group = new THREE.Group();
            group.add(sphere); 
            group.add(sprite);
            return group;
          }
          return sphere;
        }}
      />

      <JournalEntryView
        open={entryOpen}
        entry={selectedEntry}
        color={nodeColor}
        origin={clickOrigin}
        onClose={() => setEntryOpen(false)}
        closeOnBackdrop={false}
        allEntries={graphData.nodes}
      />
    </div>
  );
};

export default GraphView;