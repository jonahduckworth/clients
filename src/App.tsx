import { PointerEvent, useEffect, useRef } from 'react';
import { GraphNode, clientNodes, graphNodes } from './clientData';

interface RenderNode extends GraphNode {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  radius: number;
  visible: boolean;
  image?: HTMLImageElement;
  imageReady: boolean;
}

interface Signal {
  linkIndex: number;
  progress: number;
  speed: number;
  size: number;
  alpha: number;
}

interface FieldParticle {
  seed: number;
  orbit: number;
  drift: number;
  size: number;
  alpha: number;
  color: string;
}

const branchOrder = ['ref-buddy', 'harvestingpro', 'league-hub'] as const;
const backgroundPalette = ['#fff2b4', '#ffe073', '#f05a3c', '#58d654', '#54b7f7', '#8ccf4f'];
const fieldParticles: FieldParticle[] = Array.from({ length: 142 }, (_, index) => ({
  seed: index * 17.831,
  orbit: 0.08 + seededUnit(index, 1) * 0.86,
  drift: 0.45 + seededUnit(index, 2) * 1.35,
  size: 0.7 + seededUnit(index, 3) * 1.8,
  alpha: 0.12 + seededUnit(index, 4) * 0.24,
  color: backgroundPalette[index % backgroundPalette.length],
}));

function seededUnit(index: number, salt = 0): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function getLogoUrl(website?: string): string | undefined {
  if (!website) return undefined;
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(website)}`;
}

function getNodeImageUrl(node: GraphNode): string | undefined {
  if (node.kind === 'root') return undefined;
  return node.logoSrc || getLogoUrl(node.website);
}

function getInitials(name: string): string {
  return name
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getTenureToken(node: GraphNode, now = new Date()): string {
  if (!node.since) return '';

  if (node.since.type === 'year') {
    const years = now.getFullYear() - node.since.year;
    if (years <= 0) return 'new';
    return `${years}y`;
  }

  const start = new Date(`${node.since.iso}T12:00:00`);
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();

  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}m`;
  return 'new';
}

function createRenderNode(node: GraphNode): RenderNode {
  const radius = node.kind === 'root' ? 49 : node.kind === 'venture' ? 31 : 19;
  const logoUrl = getNodeImageUrl(node);
  const image = logoUrl ? new Image() : undefined;

  const renderNode: RenderNode = {
    ...node,
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    vx: 0,
    vy: 0,
    radius,
    visible: true,
    image,
    imageReady: false,
  };

  if (image && logoUrl) {
    image.onload = () => {
      renderNode.imageReady = true;
    };
    image.onerror = () => {
      renderNode.imageReady = false;
    };
    image.src = logoUrl;
  }

  return renderNode;
}

function placeTargets(nodes: RenderNode[], width: number, height: number) {
  const isMobile = width < 760;
  const centerX = isMobile ? width * 0.5 : width / 2;
  const centerY = isMobile ? height * 0.48 : height / 2;
  const spread = Math.min(width, height);
  const root = nodes.find((node) => node.id === 'jd-builds');

  if (root) {
    root.tx = centerX;
    root.ty = centerY;
  }

  const ventureTargets: Record<string, [number, number]> =
    isMobile
      ? {
          'ref-buddy': [width * 0.27, height * 0.38],
          harvestingpro: [width * 0.75, height * 0.48],
          'league-hub': [width * 0.38, height * 0.68],
        }
      : {
          'ref-buddy': [centerX - spread * 0.32, centerY - spread * 0.2],
          harvestingpro: [centerX + spread * 0.34, centerY - spread * 0.06],
          'league-hub': [centerX - spread * 0.18, centerY + spread * 0.3],
        };

  nodes.forEach((node) => {
    if (node.kind === 'venture') {
      const target = ventureTargets[node.id];
      if (target) {
        node.tx = target[0];
        node.ty = target[1];
      }
    }
  });

  const clientRadius = isMobile ? Math.min(108, Math.max(88, width * 0.28)) : spread * 0.21;
  const directRadius = isMobile ? Math.min(124, Math.max(104, width * 0.32)) : spread * 0.24;

  const angleRanges = {
    'ref-buddy': isMobile ? [-212, -70] : [-224, -58],
    harvestingpro: isMobile ? [-84, 96] : [-30, 150],
    'league-hub': isMobile ? [88, 130] : [86, 126],
    'jd-builds': isMobile ? [-38, -18] : [-50, -22],
  };

  [...branchOrder, 'jd-builds'].forEach((branchId) => {
    const children = nodes.filter((node) => node.kind === 'client' && node.branchId === branchId);
    const parent = branchId === 'jd-builds' ? root : nodes.find((node) => node.id === branchId);
    if (!parent) return;

    const [start, end] = angleRanges[branchId as keyof typeof angleRanges];
    const step = children.length <= 1 ? 0 : (end - start) / (children.length - 1);

    children.forEach((child, index) => {
      if (branchId === 'jd-builds' && children.length === 1) {
        child.tx = parent.tx + (isMobile ? width * 0.01 : spread * 0.04);
        child.ty = parent.ty - (isMobile ? height * 0.24 : spread * 0.24);
        return;
      }

      const degrees = children.length <= 1 ? (start + end) / 2 : start + step * index;
      const angle = (degrees * Math.PI) / 180;
      const radius = branchId === 'jd-builds' ? directRadius : clientRadius;
      child.tx = parent.tx + Math.cos(angle) * radius;
      child.ty = parent.ty + Math.sin(angle) * radius;
    });
  });

  nodes.forEach((node) => {
    node.tx = Math.max(44, Math.min(width - 44, node.tx));
    node.ty = Math.max(44, Math.min(height - 44, node.ty));

    if (node.x === 0 && node.y === 0) {
      node.x = node.tx + (Math.random() - 0.5) * 30;
      node.y = node.ty + (Math.random() - 0.5) * 30;
    }
  });
}

function getLinks() {
  return graphNodes
    .filter((node) => node.parentId)
    .map((node) => ({ source: node.parentId!, target: node.id }));
}

function NetworkOnly() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<RenderNode[]>(graphNodes.map(createRenderNode));
  const signalsRef = useRef<Signal[]>([]);
  const pointerRef = useRef({ x: -1000, y: -1000, hoverId: '' });

  useEffect(() => {
    nodesRef.current.forEach((node) => {
      if (!node.image) return;
      if (node.image.complete && node.image.naturalWidth > 0) {
        node.imageReady = true;
        return;
      }
      node.image.onload = () => {
        node.imageReady = true;
      };
      node.image.onerror = () => {
        node.imageReady = false;
      };
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let animation = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      placeTargets(nodesRef.current, width, height);
    };

    resize();
    window.addEventListener('resize', resize);

    const links = getLinks();
    const ensureSignals = () => {
      if (signalsRef.current.length === Math.max(18, links.length * 3)) return;

      signalsRef.current = Array.from({ length: Math.max(18, links.length * 3) }, (_, index) => ({
        linkIndex: index % links.length,
        progress: Math.random(),
        speed: 0.0016 + Math.random() * 0.0038,
        size: 1 + Math.random() * 1.8,
        alpha: 0.3 + Math.random() * 0.5,
      }));
    };

    const drawBackground = (nodeMap: Map<string, RenderNode>) => {
      ctx.fillStyle = '#06110a';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      nodesRef.current
        .filter((node) => node.kind !== 'client')
        .forEach((node) => {
          const scale = node.kind === 'root' ? 0.38 : 0.25;
          const glowRadius = Math.max(width, height) * scale;
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
          gradient.addColorStop(0, `${node.color}22`);
          gradient.addColorStop(0.3, `${node.color}0f`);
          gradient.addColorStop(1, `${node.color}00`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        });
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const root = nodeMap.get('jd-builds');
      const rootX = root?.x ?? width / 2;
      const rootY = root?.y ?? height / 2;
      const fieldCount = width < 760 ? 18 : 28;

      for (let strand = 0; strand < fieldCount; strand += 1) {
        const color = backgroundPalette[strand % backgroundPalette.length];
        const baseY = height * (0.09 + seededUnit(strand, 6) * 0.82);
        const phase = frame * (0.0024 + seededUnit(strand, 7) * 0.0022) + strand * 0.71;
        const amplitude = height * (0.018 + seededUnit(strand, 8) * 0.052);
        const magnet = 0.08 + seededUnit(strand, 9) * 0.1;

        ctx.globalAlpha = 0.028 + seededUnit(strand, 10) * 0.052;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.55 + seededUnit(strand, 11) * 1.15;
        ctx.beginPath();

        for (let step = 0; step <= 36; step += 1) {
          const t = step / 36;
          const x = width * t;
          const rootPull = Math.sin(t * Math.PI) * magnet;
          const wave =
            Math.sin(t * Math.PI * (1.4 + seededUnit(strand, 12) * 2.3) + phase) * amplitude +
            Math.cos(t * Math.PI * (2.8 + seededUnit(strand, 13) * 2.1) - phase * 0.78) * amplitude * 0.44;
          const y = baseY + wave + (rootY - baseY) * rootPull;

          if (step === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x + Math.sin(phase + step) * 2, y);
          }
        }

        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      fieldParticles.forEach((particle, index) => {
        const angle = particle.seed + frame * 0.0022 * particle.drift;
        const sweep = Math.sin(frame * 0.0017 + particle.seed) * 0.08;
        const x =
          width * (0.5 + Math.cos(angle) * particle.orbit * 0.56 + Math.sin(angle * 0.37) * 0.08) +
          Math.sin(frame * 0.004 + index) * 7;
        const y =
          height * (0.5 + Math.sin(angle + sweep) * particle.orbit * 0.42 + Math.cos(angle * 0.31) * 0.06) +
          Math.cos(frame * 0.003 + index * 0.4) * 5;

        if (x < -12 || x > width + 12 || y < -12 || y > height + 12) return;

        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        if (index % 5 === 0) {
          ctx.fillRect(x, y, particle.size * 3.4, 1);
        } else if (index % 7 === 0) {
          ctx.fillRect(x, y, 1, particle.size * 3.2);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255, 242, 180, 0.12)';
      ctx.lineWidth = 0.8;
      for (let ring = 0; ring < 5; ring += 1) {
        const radius = 92 + ring * 58 + Math.sin(frame * 0.008 + ring) * 5;
        ctx.globalAlpha = 0.12 - ring * 0.016;
        ctx.beginPath();
        ctx.arc(rootX, rootY, radius, frame * 0.003 + ring, Math.PI * 1.38 + frame * 0.003 + ring);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
      vignette.addColorStop(0, 'rgba(6, 17, 10, 0)');
      vignette.addColorStop(0.72, 'rgba(6, 17, 10, 0.14)');
      vignette.addColorStop(1, 'rgba(6, 17, 10, 0.7)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      ctx.globalAlpha = 0.38;
      ctx.fillStyle = 'rgba(255, 242, 180, 0.022)';
      for (let row = 0; row < height; row += 3) {
        ctx.fillRect(0, row, width, 1);
      }
      ctx.restore();
    };

    const drawEdge = (source: RenderNode, target: RenderNode, index: number) => {
      const selected = pointerRef.current.hoverId === source.id || pointerRef.current.hoverId === target.id;
      const pulse = Math.sin(frame * 0.026 + index * 0.9) * 0.5 + 0.5;

      ctx.save();
      ctx.globalAlpha = selected ? 0.88 : 0.32 + pulse * 0.12;
      ctx.strokeStyle = target.color;
      ctx.lineWidth = target.kind === 'client' ? 1 : 1.35;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      const cx = (source.x + target.x) / 2 + Math.sin(frame * 0.01 + index) * 16;
      const cy = (source.y + target.y) / 2 + Math.cos(frame * 0.012 + index) * 12;
      ctx.quadraticCurveTo(cx, cy, target.x, target.y);
      ctx.stroke();
      ctx.restore();
    };

    const drawSignal = (signal: Signal, nodeMap: Map<string, RenderNode>) => {
      const link = links[signal.linkIndex % links.length];
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (!source || !target) return;

      const t = signal.progress;
      const x = source.x + (target.x - source.x) * t;
      const y = source.y + (target.y - source.y) * t;

      ctx.save();
      ctx.globalAlpha = signal.alpha;
      ctx.fillStyle = target.color;
      ctx.shadowColor = target.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(x, y, signal.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawNode = (node: RenderNode) => {
      const hovered = node.id === pointerRef.current.hoverId;
      const pulse = Math.sin(frame * 0.036 + node.tx * 0.01) * 0.5 + 0.5;
      const radius = node.radius + (hovered ? 6 : 0);

      ctx.save();
      ctx.globalAlpha = node.kind === 'client' ? 0.24 + pulse * 0.1 : 0.28 + pulse * 0.14;
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 14 + pulse * 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = node.color;
      ctx.shadowBlur = hovered ? 32 : node.kind === 'root' ? 30 : 14;
      ctx.fillStyle = node.kind === 'root' ? '#07120d' : '#0b1710';
      ctx.strokeStyle = node.color;
      ctx.lineWidth = hovered ? 2.4 : node.kind === 'root' ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (node.kind === 'root') {
        ctx.save();
        ctx.strokeStyle = node.color;
        ctx.globalAlpha = hovered ? 0.72 : 0.52;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 8]);
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const tick = radius + 18;
        const tickLong = radius + 29;
        ctx.globalAlpha = hovered ? 0.9 : 0.66;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - tick);
        ctx.lineTo(node.x, node.y - tickLong);
        ctx.moveTo(node.x + tick, node.y);
        ctx.lineTo(node.x + tickLong, node.y);
        ctx.moveTo(node.x, node.y + tick);
        ctx.lineTo(node.x, node.y + tickLong);
        ctx.moveTo(node.x - tick, node.y);
        ctx.lineTo(node.x - tickLong, node.y);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = hovered ? node.color : node.accent;
        ctx.fillStyle = hovered ? '#fff2b4' : node.color;
        ctx.lineWidth = 1.4;

        const markSize = radius * 0.7;
        const left = node.x - markSize / 2;
        const top = node.y - markSize / 2;
        const corner = markSize * 0.24;

        ctx.beginPath();
        ctx.moveTo(left, top + corner);
        ctx.lineTo(left, top);
        ctx.lineTo(left + corner, top);
        ctx.moveTo(left + markSize - corner, top);
        ctx.lineTo(left + markSize, top);
        ctx.lineTo(left + markSize, top + corner);
        ctx.moveTo(left + markSize, top + markSize - corner);
        ctx.lineTo(left + markSize, top + markSize);
        ctx.lineTo(left + markSize - corner, top + markSize);
        ctx.moveTo(left + corner, top + markSize);
        ctx.lineTo(left, top + markSize);
        ctx.lineTo(left, top + markSize - corner);
        ctx.stroke();

        ctx.font = `700 ${Math.max(16, radius * 0.42)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const textMetrics = ctx.measureText('JD');
        const textY =
          node.y +
          (textMetrics.actualBoundingBoxAscent - textMetrics.actualBoundingBoxDescent) / 2;
        ctx.fillText('JD', node.x, textY);
        ctx.restore();
      } else if (node.imageReady && node.image) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(8, radius - (node.logoSrc ? 4 : 6)), 0, Math.PI * 2);
        ctx.clip();
        const imageSize = Math.max(12, radius * (node.logoSrc ? 1.82 : 1.22));
        ctx.drawImage(node.image, node.x - imageSize / 2, node.y - imageSize / 2, imageSize, imageSize);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = hovered ? node.accent : node.color;
        const nodeText = node.kind === 'client' ? node.shortName.slice(0, 6) : node.shortName.slice(0, 2);
        const fontSize = node.kind === 'client' ? (nodeText.length > 4 ? 8 : 10) : node.kind === 'venture' ? 12 : 15;
        ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nodeText || getInitials(node.name), node.x, node.y + 0.5);
        ctx.restore();
      }

      if (node.kind === 'client') {
        ctx.save();
        ctx.fillStyle = hovered ? '#fff2b4' : 'rgba(255, 242, 180, 0.74)';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(getTenureToken(node), node.x, node.y + radius + 7);
        ctx.restore();
      }

      if (hovered) {
        const text = node.kind === 'client' ? `${node.name} · ${getTenureToken(node)}` : node.name;
        ctx.save();
        ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        const textWidth = ctx.measureText(text).width;
        const labelX = Math.max(12, Math.min(width - textWidth - 26, node.x - textWidth / 2 - 13));
        const labelY = Math.max(12, node.y - radius - 42);
        ctx.fillStyle = 'rgba(6, 17, 10, 0.9)';
        ctx.strokeStyle = 'rgba(255, 242, 180, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, textWidth + 26, 27, 7);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff2b4';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, labelX + 13, labelY + 14);
        ctx.restore();
      }
    };

    const animate = () => {
      frame += 1;
      placeTargets(nodesRef.current, width, height);
      ensureSignals();

      const nodeMap = new Map(nodesRef.current.map((node) => [node.id, node]));

      nodesRef.current.forEach((node, index) => {
        const dx = node.tx - node.x;
        const dy = node.ty - node.y;
        const idleX = Math.sin(frame * 0.012 + index * 1.7) * 0.22;
        const idleY = Math.cos(frame * 0.011 + index * 1.35) * 0.18;

        node.vx = (node.vx + dx * 0.022 + idleX) * 0.82;
        node.vy = (node.vy + dy * 0.022 + idleY) * 0.82;
        node.x += node.vx;
        node.y += node.vy;
      });

      drawBackground(nodeMap);

      links.forEach((link, index) => {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (source && target) drawEdge(source, target, index);
      });

      signalsRef.current.forEach((signal) => {
        signal.progress += signal.speed;
        if (signal.progress > 1) {
          signal.progress = 0;
          signal.linkIndex = Math.floor(Math.random() * links.length);
        }
        drawSignal(signal, nodeMap);
      });

      nodesRef.current
        .slice()
        .sort((a, b) => a.radius - b.radius)
        .forEach(drawNode);

      animation = requestAnimationFrame(animate);
    };

    animation = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let hoverId = '';

    for (const node of nodesRef.current) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= node.radius + 14) {
        hoverId = node.id;
        break;
      }
    }

    pointerRef.current = { x, y, hoverId };
  };

  const handlePointerLeave = () => {
    pointerRef.current = { x: -1000, y: -1000, hoverId: '' };
  };

  const clientSummary = clientNodes
    .map((node) => `${node.name}, ${getTenureToken(node)}`)
    .join('; ');

  return (
    <main className="network-page" aria-label={`JD Builds active client network: ${clientSummary}`}>
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        aria-hidden="true"
      />
    </main>
  );
}

export default function App() {
  return <NetworkOnly />;
}
