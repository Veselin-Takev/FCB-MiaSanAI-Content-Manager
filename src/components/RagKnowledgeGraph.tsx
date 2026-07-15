import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { 
  Database, Sparkles, Search, Sliders, RefreshCw, FileText, 
  Layers, Settings, Info, ArrowRight, Eye, CheckCircle, Network,
  AlertTriangle, Filter, HelpCircle
} from "lucide-react";

interface DocumentItem {
  id: string;
  source: string;
  category: string;
  author: string;
  version: string;
  lastIndexed: string;
  fileSize: string;
  content: string;
  snippet: string;
}

interface RagKnowledgeGraphProps {
  coreDocuments: DocumentItem[];
  uploadedDocs: DocumentItem[];
  language: "en" | "de";
  onSelectDoc: (doc: { source: string; snippet: string }) => void;
  onOpenPreviewModal: (doc: DocumentItem) => void;
  onAddLog: (log: any) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: "category" | "core-document" | "custom-document";
  category: string;
  size: number;
  color: string;
  snippet?: string;
  fileSize?: string;
  author?: string;
  version?: string;
  content?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  type: "category-link" | "similarity-link";
}

export const RagKnowledgeGraph: React.FC<RagKnowledgeGraphProps> = ({
  coreDocuments,
  uploadedDocs,
  language,
  onSelectDoc,
  onOpenPreviewModal,
  onAddLog
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Graph control states
  const [repulsionStrength, setRepulsionStrength] = useState<number>(-120);
  const [linkDistance, setLinkDistance] = useState<number>(80);
  const [showSimilarityLinks, setShowSimilarityLinks] = useState<boolean>(true);
  const [showCategoryHubs, setShowCategoryHubs] = useState<boolean>(true);
  
  // Selection and search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<GraphNode[]>([]);
  
  // For simulation restart/stabilization
  const [simTrigger, setSimTrigger] = useState<number>(0);

  // Category Color mapping
  const getCategoryColor = (cat: string) => {
    const norm = cat.toLowerCase();
    if (norm.includes("compliance") || norm.includes("guideline")) return "#c3a164"; // Gold
    if (norm.includes("sporting") || norm.includes("squad") || norm.includes("roster")) return "#dc052d"; // FCB Red
    if (norm.includes("stadium") || norm.includes("operation")) return "#22d3ee"; // Cyan
    if (norm.includes("history") || norm.includes("honours") || norm.includes("museum")) return "#a78bfa"; // Purple
    return "#38bdf8"; // Light Blue
  };

  // Get reading time helper
  const getReadingTime = (text: string) => {
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 150));
    return language === "de" ? `${minutes} Min. Lesezeit` : `${minutes} min read`;
  };

  // Build nodes and links data
  const { nodes, links, allDocsMap } = useMemo(() => {
    const allDocs = [...coreDocuments, ...uploadedDocs];
    const nodesList: GraphNode[] = [];
    const linksList: GraphLink[] = [];
    const docsMap = new Map<string, DocumentItem>();

    allDocs.forEach(d => docsMap.set(d.id, d));

    // 1. Extract Unique Categories for Category Hubs
    const categories = Array.from(new Set(allDocs.map(d => d.category)));
    
    if (showCategoryHubs) {
      categories.forEach(cat => {
        nodesList.push({
          id: `cat-${cat}`,
          name: cat,
          type: "category",
          category: cat,
          size: 26,
          color: getCategoryColor(cat),
          snippet: language === "de" 
            ? `Zentraler Kategorie-Knotenpunkt für '${cat}'`
            : `Central category hub for '${cat}' files.`
        });
      });
    }

    // 2. Add Document Nodes
    allDocs.forEach(doc => {
      nodesList.push({
        id: doc.id,
        name: doc.source,
        type: doc.id.startsWith("core-") ? "core-document" : "custom-document",
        category: doc.category,
        size: doc.id.startsWith("core-") ? 14 : 11,
        color: getCategoryColor(doc.category),
        snippet: doc.snippet,
        fileSize: doc.fileSize,
        author: doc.author,
        version: doc.version,
        content: doc.content
      });

      // Link document node to its corresponding category hub if visible
      if (showCategoryHubs) {
        linksList.push({
          source: doc.id,
          target: `cat-${doc.category}`,
          value: 2,
          type: "category-link"
        });
      }
    });

    // 3. Compute Similarity Links based on keyword overlap
    const stopwords = new Set([
      "the", "and", "for", "with", "from", "that", "this", "your", "they", "their", "have", "are", 
      "was", "were", "been", "has", "had", "does", "done", "will", "would", "shall", "should",
      "der", "die", "das", "und", "ist", "sind", "mit", "von", "ein", "eine", "einen", "einem", "einer"
    ]);

    const getKeywords = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\n]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopwords.has(word));
    };

    if (showSimilarityLinks) {
      const docKeywords = allDocs.map(doc => ({
        id: doc.id,
        keywords: getKeywords(doc.content || "")
      }));

      for (let i = 0; i < docKeywords.length; i++) {
        for (let j = i + 1; j < docKeywords.length; j++) {
          const docA = docKeywords[i];
          const docB = docKeywords[j];
          
          // Intersect keywords
          const matches = docA.keywords.filter(w => docB.keywords.includes(w));
          if (matches.length >= 2) {
            linksList.push({
              source: docA.id,
              target: docB.id,
              value: 1,
              type: "similarity-link"
            });
          }
        }
      }
    }

    return { nodes: nodesList, links: linksList, allDocsMap: docsMap };
  }, [coreDocuments, uploadedDocs, showSimilarityLinks, showCategoryHubs, language]);

  // Handle auto-complete for searching
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchSuggestions([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = nodes.filter(n => 
      n.name.toLowerCase().includes(q) || 
      n.category.toLowerCase().includes(q)
    );
    setSearchSuggestions(filtered.slice(0, 5));
  }, [searchQuery, nodes]);

  // Main D3 force graph effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Dimensions setup based on container size
    const width = containerRef.current.clientWidth || 800;
    const height = 480;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Complete clean up

    // Main drawing group containing everything for zoom
    const g = svg.append("g").attr("class", "graph-contents");

    // Configure zoom behaviour
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);

    // Initial center zoom
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85));

    // Force simulation setup
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id((d: any) => d.id)
        .distance((link: any) => {
          return link.type === "category-link" ? linkDistance * 0.7 : linkDistance * 1.3;
        })
      )
      .force("charge", d3.forceManyBody<GraphNode>().strength(repulsionStrength))
      .force("center", d3.forceCenter<GraphNode>(0, 0))
      .force("collision", d3.forceCollide<GraphNode>().radius((d: any) => d.size + 12))
      .alphaDecay(0.022);

    // Add marker definitions for link arrows (optional, beautiful for aesthetics)
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#1e293b")
      .attr("d", "M0,-5L10,0L0,5");

    // 1. Draw Links
    const link = g.append("g")
      .attr("class", "links-group")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d: any) => d.type === "category-link" ? "#334155" : "#1e293b")
      .attr("stroke-opacity", (d: any) => d.type === "category-link" ? 0.45 : 0.65)
      .attr("stroke-width", (d: any) => d.type === "category-link" ? 1 : 1.5)
      .attr("stroke-dasharray", (d: any) => d.type === "similarity-link" ? "3,3" : "none");

    // 2. Draw Nodes (g element to contain circle + icon + text label)
    const node = g.append("g")
      .attr("class", "nodes-group")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node-item")
      .style("cursor", "pointer")
      .call(drag(simulation));

    // Node outer glow / hover indicator
    node.append("circle")
      .attr("class", "node-glow")
      .attr("r", (d: any) => d.size + 5)
      .attr("fill", "transparent")
      .attr("stroke", (d: any) => d.color)
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0)
      .style("transition", "stroke-opacity 0.2s");

    // Main Node Circle
    node.append("circle")
      .attr("class", "node-circle")
      .attr("r", (d: any) => d.size)
      .attr("fill", (d: any) => {
        if (d.type === "category") return d.color;
        return "#020617"; // dark inner filling for documents
      })
      .attr("stroke", (d: any) => d.color)
      .attr("stroke-width", (d: any) => d.type === "category" ? 1.5 : 2.5);

    // Node Icon letters/symbols for Category Hubs vs Files
    node.each(function(d: any) {
      const element = d3.select(this);
      if (d.type === "category") {
        // Just the circle itself
      } else {
        // Draw a tiny file icon or visual marker inside the circle
        element.append("rect")
          .attr("x", -3)
          .attr("y", -4)
          .attr("width", 6)
          .attr("height", 8)
          .attr("fill", "none")
          .attr("stroke", d.color)
          .attr("stroke-width", 1);
        
        element.append("line")
          .attr("x1", -1)
          .attr("y1", -1)
          .attr("x2", 2)
          .attr("y2", -1)
          .attr("stroke", d.color)
          .attr("stroke-width", 0.7);

        element.append("line")
          .attr("x1", -1)
          .attr("y1", 1)
          .attr("x2", 2)
          .attr("y2", 1)
          .attr("stroke", d.color)
          .attr("stroke-width", 0.7);
      }
    });

    // Node text labels
    node.append("text")
      .attr("dy", (d: any) => d.type === "category" ? "0.35em" : `${d.size + 14}px`)
      .attr("text-anchor", "middle")
      .attr("fill", (d: any) => d.type === "category" ? "#020617" : "#94a3b8")
      .attr("font-size", (d: any) => d.type === "category" ? "9px" : "8.5px")
      .attr("font-family", "monospace")
      .attr("font-weight", (d: any) => d.type === "category" ? "bold" : "normal")
      .text((d: any) => {
        if (d.type === "category") return d.name.substring(0, 4); // compact label
        // Trim standard file suffixes
        return d.name.replace(/\.pdf|\.txt|\.json/gi, "").substring(0, 16);
      });

    // Tooltip and interactivity events
    node.on("mouseenter", (event: any, d: any) => {
      setHoveredNode(d);
      
      // Highlight hover node and its neighbors
      d3.select(event.currentTarget).select(".node-glow").attr("stroke-opacity", 0.7);
      
      // Fade out non-neighbors
      const neighbors = new Set<string>();
      neighbors.add(d.id);
      
      links.forEach((l: any) => {
        const sId = typeof l.source === "object" ? l.source.id : l.source;
        const tId = typeof l.target === "object" ? l.target.id : l.target;
        if (sId === d.id) neighbors.add(tId);
        if (tId === d.id) neighbors.add(sId);
      });

      node.style("opacity", (n: any) => neighbors.has(n.id) ? 1 : 0.2);
      link.style("stroke-opacity", (l: any) => {
        const sId = typeof l.source === "object" ? l.source.id : l.source;
        const tId = typeof l.target === "object" ? l.target.id : l.target;
        return (sId === d.id || tId === d.id) ? 0.9 : 0.1;
      });
    });

    node.on("mouseleave", (event: any, d: any) => {
      setHoveredNode(null);
      d3.select(event.currentTarget).select(".node-glow").attr("stroke-opacity", 0);
      node.style("opacity", 1);
      link.style("stroke-opacity", (l: any) => l.type === "category-link" ? 0.45 : 0.65);
    });

    node.on("click", (event: any, d: any) => {
      setSelectedNode(d);
      
      // Auto zoom to node
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(1.2).translate(-d.x!, -d.y!)
      );

      onAddLog({
        id: `graph-inspect-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "INFO",
        source: "Knowledge Visualizer",
        message: language === "de"
          ? `Dokument im Graphen inspiziert: "${d.name}"`
          : `Inspecting document spatial node: "${d.name}"`
      });
    });

    // Simulation tick updates
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x!)
        .attr("y1", (d: any) => d.source.y!)
        .attr("x2", (d: any) => d.target.x!)
        .attr("y2", (d: any) => d.target.y!);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag helper for node moving
    function drag(sim: d3.Simulation<GraphNode, undefined>) {
      function dragstarted(event: any, d: any) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event: any, d: any) {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      return d3.drag<SVGGElement, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Set up resize listener
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth;
        simulation.force("center", d3.forceCenter(0, 0));
        simulation.alpha(0.1).restart();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      simulation.stop();
      resizeObserver.disconnect();
    };
  }, [nodes, links, repulsionStrength, linkDistance, simTrigger]);

  // Search trigger
  const handleSelectSuggestion = (n: GraphNode) => {
    setSelectedNode(n);
    setSearchQuery("");
    setSearchSuggestions([]);
    
    if (svgRef.current && containerRef.current) {
      const width = containerRef.current.clientWidth || 800;
      const height = 480;
      const svg = d3.select(svgRef.current);
      
      // Pulse node glow
      svg.selectAll<SVGGElement, GraphNode>(".node-item")
        .filter(d => d.id === n.id)
        .select(".node-glow")
        .attr("stroke-opacity", 1)
        .transition()
        .duration(1500)
        .attr("stroke-opacity", 0);

      // Programmatic zoom-to
      const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 4]);
      svg.transition().duration(800).call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(1.4).translate(-n.x!, -n.y!)
      );
    }
  };

  const handleRecenter = () => {
    if (svgRef.current && containerRef.current) {
      const width = containerRef.current.clientWidth || 800;
      const height = 480;
      const svg = d3.select(svgRef.current);
      const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 4]);
      
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85)
      );

      // Shake alpha simulation slightly to spread node collisions
      setSimTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="bg-slate-900/20 p-6 rounded-2xl border border-slate-800/80 space-y-6" id="rag-knowledge-graph-tab">
      
      {/* Header and overview */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-2.5">
          <Network className="h-5 w-5 text-fcb-gold animate-pulse" />
          <div>
            <h3 className="font-bold text-white font-display text-sm">
              {language === "de" ? "INTERAKTIVE WISSENS-NETZWERKVISUALISIERUNG" : "INTERACTIVE KNOWLEDGE NETWORK VISUALIZER"}
            </h3>
            <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
              {language === "de"
                ? "Räumlicher Überblick der Vektor-Datenbank, Clustergruppen und Wortähnlichkeiten."
                : "A spatial view of your vector database, clustered category systems, and semantic word intersections."}
            </p>
          </div>
        </div>

        {/* Search within graph */}
        <div className="relative w-full md:w-64">
          <div className="flex items-center bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 gap-2">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[11px] text-white focus:outline-none w-full placeholder-slate-600"
              placeholder={language === "de" ? "Dokument suchen..." : "Search document node..."}
            />
          </div>
          
          {searchSuggestions.length > 0 && (
            <div className="absolute right-0 left-0 mt-1.5 bg-[#0a0c10] border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-50 py-1 font-mono text-[10.5px]">
              {searchSuggestions.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleSelectSuggestion(n)}
                  className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center justify-between"
                >
                  <span className="truncate max-w-[150px]">{n.name}</span>
                  <span className="text-[8.5px] px-1.5 py-0.5 rounded border ml-2" style={{ borderColor: `${n.color}33`, color: n.color, background: `${n.color}0d` }}>
                    {n.type === "category" ? "Hub" : "Doc"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Primary Graph Stage Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Span 8: Interactive D3 Area */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div 
            ref={containerRef}
            className="w-full bg-[#03060c] rounded-2xl border border-slate-850 relative overflow-hidden flex flex-col justify-between"
            style={{ height: "480px" }}
          >
            {/* Quick Map Overlay Info */}
            <div className="absolute top-4 left-4 z-10 bg-slate-950/80 border border-slate-850 rounded-xl p-3 max-w-xs space-y-1.5 pointer-events-none backdrop-blur font-mono">
              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                <Info className="h-3 w-3 text-fcb-gold" />
                <span>Navigation & Controls</span>
              </div>
              <ul className="text-[8.5px] text-slate-500 space-y-1 list-disc pl-3">
                <li>{language === "de" ? "Mausrad zum Zoomen & Schwenken" : "Scroll to zoom, click & drag to pan map"}</li>
                <li>{language === "de" ? "Knoten ziehen zum Neupositionieren" : "Drag individual nodes to adjust spacing"}</li>
                <li>{language === "de" ? "Knoten anklicken für Detail-Inspektion" : "Click any node to load into Inspector"}</li>
              </ul>
            </div>

            {/* Float Legends */}
            <div className="absolute bottom-4 left-4 z-10 bg-slate-950/80 border border-slate-850 rounded-xl p-3 pointer-events-none backdrop-blur font-mono flex flex-col gap-2">
              <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">{language === "de" ? "FARBLEGENDE" : "COLOR CODED LEGENDS"}</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-2 text-[9px] text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: "#c3a164" }} />
                  <span>Compliance</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: "#dc052d" }} />
                  <span>Sporting</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: "#22d3ee" }} />
                  <span>Operations</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: "#a78bfa" }} />
                  <span>History & Honours</span>
                </div>
              </div>
            </div>

            {/* Visual Action Controls floating */}
            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
              <button
                onClick={handleRecenter}
                className="bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-[10px] font-mono font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xl"
                title={language === "de" ? "Graph zentrieren" : "Recenter Layout"}
              >
                <RefreshCw className="h-3 w-3" />
                <span>{language === "de" ? "NEU AUSRICHTEN" : "RE-CENTER"}</span>
              </button>
            </div>

            {/* The SVG Canvas element */}
            <svg 
              ref={svgRef} 
              className="w-full h-full"
              style={{ minHeight: "400px" }}
            />

            {/* Interactive tooltip footer */}
            <div className="bg-slate-950 border-t border-slate-900 p-3 flex items-center justify-between text-[11px] font-mono z-10 shrink-0 select-none">
              <div className="flex items-center gap-2 truncate">
                <div className="h-2 w-2 rounded-full bg-cyan-500 animate-ping" />
                <span className="text-slate-400">
                  {hoveredNode ? (
                    <>
                      <span className="text-white font-bold">{hoveredNode.name}</span>
                      <span className="text-slate-600"> | </span>
                      <span className="text-slate-500 font-semibold">{hoveredNode.category}</span>
                    </>
                  ) : (
                    language === "de" ? "Bewege den Mauszeiger über einen Knoten für Schnellinfos" : "Hover over any cluster node for live fast-scanning telemetry"
                  )}
                </span>
              </div>
              <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                {nodes.length} {language === "de" ? "KNOTEN" : "NODES"} / {links.length} {language === "de" ? "KANTEN" : "LINKS"}
              </div>
            </div>
          </div>
        </div>

        {/* Right Span 4: Inspectors & Physics Controls */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          
          {/* Node Inspector */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-4 flex flex-col justify-between flex-1 min-h-[280px]">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                <Database className="h-4 w-4 text-fcb-gold" />
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                  {language === "de" ? "SPATIALER NODE INSPECTOR" : "SPATIAL NODE INSPECTOR"}
                </span>
              </div>

              {!selectedNode ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 font-mono">
                  <Layers className="h-8 w-8 text-slate-800 animate-pulse" />
                  <p className="text-xs text-slate-600 leading-normal max-w-xs">
                    {language === "de"
                      ? "Klicken Sie auf ein Dokument im Graphen, um Metadaten, Vektor-Nähe und Detailtexte zu analysieren."
                      : "Click any node on the interactive network map to load metadata, chunk details, and compliance specs."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 animate-fadeIn">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-white tracking-wide break-words">
                      {selectedNode.name}
                    </h4>
                    <span 
                      className="inline-block text-[9.5px] font-mono px-2 py-0.5 rounded border mt-1.5" 
                      style={{ borderColor: `${selectedNode.color}33`, color: selectedNode.color, background: `${selectedNode.color}0f` }}
                    >
                      {selectedNode.category}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[10px] font-mono text-slate-400 bg-[#06080d] p-3 rounded-xl border border-slate-900">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Type:</span>
                      <span className="font-bold text-slate-300 uppercase">{selectedNode.type}</span>
                    </div>
                    {selectedNode.fileSize && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">File Size:</span>
                        <span className="text-slate-300">{selectedNode.fileSize}</span>
                      </div>
                    )}
                    {selectedNode.author && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Author:</span>
                        <span className="text-slate-300 truncate max-w-[150px]" title={selectedNode.author}>{selectedNode.author}</span>
                      </div>
                    )}
                    {selectedNode.version && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Version:</span>
                        <span className="text-slate-300">{selectedNode.version}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 font-mono">
                    <span className="text-[9px] text-slate-600 uppercase tracking-wider block font-bold">
                      {language === "de" ? "BESCHREIBUNG & SNIPPET" : "DESCRIPTION & SNIPPET"}
                    </span>
                    <p className="text-[10.5px] text-slate-300 leading-normal bg-slate-900/40 p-3 rounded-xl border border-slate-900/60 font-sans italic">
                      "{selectedNode.snippet}"
                    </p>
                  </div>

                  {/* Grounded snippet integration buttons if it's a document */}
                  {selectedNode.type !== "category" && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => onSelectDoc({ source: selectedNode.name, snippet: selectedNode.snippet || "" })}
                        className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white px-2.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{language === "de" ? "LESER ÖFFNEN" : "OPEN READER"}</span>
                      </button>

                      {allDocsMap.has(selectedNode.id) && (
                        <button
                          onClick={() => onOpenPreviewModal(allDocsMap.get(selectedNode.id)!)}
                          className="flex-1 bg-fcb-gold/15 hover:bg-fcb-gold/25 border border-fcb-gold/30 text-fcb-gold text-[10px] font-mono px-2.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 font-bold"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{language === "de" ? "ZUSAMMENFASSEN" : "SUMMARIZE"}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Physics Forces Controller */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                {language === "de" ? "NETZWERK PHYSIK-REGLER" : "NETWORK PHYSICS CONTROLS"}
              </span>
            </div>

            <div className="space-y-4 font-mono text-[10px]">
              
              {/* Repulsion sliders */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>{language === "de" ? "Abstoßungskraft (Node Repulsion)" : "Node Repulsion Strength"}</span>
                  <span className="text-cyan-400 font-bold">{repulsionStrength}</span>
                </div>
                <input
                  type="range"
                  min="-300"
                  max="-30"
                  step="10"
                  value={repulsionStrength}
                  onChange={(e) => setRepulsionStrength(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-ew-resize h-1 bg-slate-900 rounded-lg appearance-none"
                />
              </div>

              {/* Link Distance slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>{language === "de" ? "Verbindungslänge (Link Distance)" : "Ideal Link Distance"}</span>
                  <span className="text-cyan-400 font-bold">{linkDistance}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="180"
                  step="5"
                  value={linkDistance}
                  onChange={(e) => setLinkDistance(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-ew-resize h-1 bg-slate-900 rounded-lg appearance-none"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-900/50">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showSimilarityLinks}
                    onChange={(e) => setShowSimilarityLinks(e.target.checked)}
                    className="accent-fcb-gold rounded"
                  />
                  <span>{language === "de" ? "Wort-Ähnlichkeit" : "Similarities"}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showCategoryHubs}
                    onChange={(e) => setShowCategoryHubs(e.target.checked)}
                    className="accent-fcb-gold rounded"
                  />
                  <span>{language === "de" ? "Kategorie-Hubs" : "Category Hubs"}</span>
                </label>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
