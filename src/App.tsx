import { PointerEvent, useEffect, useRef } from 'react';
import { BranchId, GraphNode, branchLabels, clientNodes, rootNode, ventureNodes } from './clientData';

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 720;
const GROUND_Y = 620;
const BLOCK_SIZE = 52;
const PLAYER_HEIGHT = 58;
const GRAVITY = 0.78;

interface GameViewport {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
}

interface GameBlock {
  id: BranchId;
  node: GraphNode;
  clients: GraphNode[];
  x: number;
  y: number;
  image?: HTMLImageElement;
  imageReady: boolean;
  hitFrames: number;
  revealUntil: number;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  facing: 1 | -1;
  onGround: boolean;
  jumpQueued: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

const branchOrder: BranchId[] = ['ref-buddy', 'jd-builds', 'harvestingpro', 'league-hub'];
const ventureMap = new Map(ventureNodes.map((node) => [node.branchId, node]));

function getLogoUrl(node: GraphNode): string | undefined {
  if (node.logoSrc) return node.logoSrc;
  if (!node.website) return undefined;
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(node.website)}`;
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

function createBlock(id: BranchId, x: number, y: number): GameBlock {
  const node = id === 'jd-builds' ? rootNode : ventureMap.get(id);
  if (!node) throw new Error(`Missing venture node for ${id}`);

  const logoUrl = getLogoUrl(node);
  const image = logoUrl ? new Image() : undefined;
  const block: GameBlock = {
    id,
    node,
    clients: clientNodes.filter((client) => client.branchId === id),
    x,
    y,
    image,
    imageReady: false,
    hitFrames: 0,
    revealUntil: 0,
  };

  if (image && logoUrl) {
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      block.imageReady = true;
    };
    image.onerror = () => {
      block.imageReady = false;
    };
    image.src = logoUrl;
  }

  return block;
}

function createBlocks(): GameBlock[] {
  return [
    createBlock('ref-buddy', 206, 382),
    createBlock('jd-builds', 430, 318),
    createBlock('harvestingpro', 566, 382),
    createBlock('league-hub', 734, 318),
  ];
}

function pixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function pixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'left',
) {
  ctx.save();
  ctx.font = `700 ${size}px "Courier New", ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1f1b16';
  ctx.fillText(text, Math.round(x + 2), Math.round(y + 2));
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y));
  ctx.restore();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createViewport(width: number, height: number): GameViewport {
  const margin = width < 760 ? 8 : 28;
  const scale = Math.min((width - margin * 2) / WORLD_WIDTH, (height - margin * 2) / WORLD_HEIGHT);
  const viewportWidth = WORLD_WIDTH * scale;
  const viewportHeight = WORLD_HEIGHT * scale;

  return {
    x: (width - viewportWidth) / 2,
    y: (height - viewportHeight) / 2,
    scale,
    width: viewportWidth,
    height: viewportHeight,
  };
}

function pointerToWorld(event: PointerEvent<HTMLCanvasElement>, viewport: GameViewport): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  const canvasX = event.clientX - rect.left;
  const canvasY = event.clientY - rect.top;

  return {
    x: clamp((canvasX - viewport.x) / viewport.scale, 16, WORLD_WIDTH - 16),
    y: clamp((canvasY - viewport.y) / viewport.scale, 16, WORLD_HEIGHT - 16),
  };
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const block = 10 * scale;
  const cells = [
    [2, 1],
    [3, 0],
    [4, 0],
    [5, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 2],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
  ];

  cells.forEach(([cx, cy]) => pixelRect(ctx, x + cx * block, y + cy * block, block, block, '#fff8ef'));
  pixelRect(ctx, x + block * 1.5, y + block * 3.6, block * 4.4, block * 0.45, '#5fc7dd');
}

function drawHill(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width * 0.5, y - height);
  ctx.lineTo(x + width, y);
  ctx.closePath();
  ctx.fill();
  pixelRect(ctx, x + width * 0.48, y - height * 0.66, 6, 18, '#143c26');
  pixelRect(ctx, x + width * 0.72, y - height * 0.34, 7, 15, '#143c26');
  ctx.restore();
}

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  const cells = [
    [0, 2],
    [1, 1],
    [2, 0],
    [3, 1],
    [4, 0],
    [5, 1],
    [6, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
  ];
  cells.forEach(([cx, cy]) => pixelRect(ctx, x + cx * 14, y + cy * 14, 15, 15, color));
  pixelRect(ctx, x + 8, y + 45, 76, 8, '#1f4d27');
}

function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number, width = 48, height = 30) {
  pixelRect(ctx, x, y, width, height, '#b95530');
  pixelRect(ctx, x, y, width, 4, '#ffb56f');
  pixelRect(ctx, x, y + height - 4, width, 4, '#632519');
  pixelRect(ctx, x + width - 4, y, 4, height, '#632519');
  pixelRect(ctx, x + 2, y + Math.floor(height / 2), width - 4, 3, '#6f2a1e');
  pixelRect(ctx, x + Math.floor(width / 2), y + 4, 3, Math.floor(height / 2) - 4, '#6f2a1e');
}

function drawGround(ctx: CanvasRenderingContext2D) {
  pixelRect(ctx, 0, GROUND_Y, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y, '#7b3421');
  for (let row = 0; row < 4; row += 1) {
    const y = GROUND_Y + row * 28;
    for (let x = -24; x < WORLD_WIDTH + 48; x += 48) {
      drawBrick(ctx, x + (row % 2) * 24, y, 48, 30);
    }
  }
  pixelRect(ctx, 0, GROUND_Y - 6, WORLD_WIDTH, 6, '#fff8ef');
  pixelRect(ctx, 0, GROUND_Y - 12, WORLD_WIDTH, 6, '#2b7f36');
}

function drawConduit(ctx: CanvasRenderingContext2D, x: number, y: number) {
  pixelRect(ctx, x, y + 42, 72, 86, '#159447');
  pixelRect(ctx, x + 8, y + 42, 11, 86, '#79e36f');
  pixelRect(ctx, x + 51, y + 42, 9, 86, '#0a5b33');
  pixelRect(ctx, x - 8, y + 24, 88, 28, '#2abd58');
  pixelRect(ctx, x - 4, y + 28, 80, 6, '#9cff82');
  pixelRect(ctx, x + 66, y + 24, 8, 28, '#0b6431');
}

function drawQuestionBlock(ctx: CanvasRenderingContext2D, block: GameBlock, frame: number) {
  const hitOffset = block.hitFrames > 0 ? -Math.sin((block.hitFrames / 14) * Math.PI) * 11 : 0;
  const x = block.x;
  const y = block.y + hitOffset;
  const glow = block.revealUntil > frame;

  ctx.save();
  ctx.shadowColor = block.node.color;
  ctx.shadowBlur = glow ? 26 : 10;
  pixelRect(ctx, x, y, BLOCK_SIZE, BLOCK_SIZE, '#f6a24e');
  pixelRect(ctx, x + 4, y + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8, '#ffc36e');
  pixelRect(ctx, x, y, BLOCK_SIZE, 5, '#fff1a8');
  pixelRect(ctx, x, y + BLOCK_SIZE - 5, BLOCK_SIZE, 5, '#7c351f');
  pixelRect(ctx, x + BLOCK_SIZE - 5, y, 5, BLOCK_SIZE, '#7c351f');
  pixelRect(ctx, x + 7, y + 7, 5, 5, '#7c351f');
  pixelRect(ctx, x + BLOCK_SIZE - 12, y + 7, 5, 5, '#7c351f');
  pixelRect(ctx, x + 7, y + BLOCK_SIZE - 12, 5, 5, '#7c351f');
  pixelRect(ctx, x + BLOCK_SIZE - 12, y + BLOCK_SIZE - 12, 5, 5, '#7c351f');

  const centerX = x + BLOCK_SIZE / 2;
  const centerY = y + BLOCK_SIZE / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate(frame * 0.034);
  pixelRect(ctx, -18, -18, 36, 36, block.node.color);
  pixelRect(ctx, -13, -13, 26, 26, '#1e1b19');

  if (block.imageReady && block.image) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-11, -11, 22, 22);
    ctx.clip();
    ctx.drawImage(block.image, -11, -11, 22, 22);
    ctx.restore();
  } else {
    ctx.rotate(-frame * 0.034);
    pixelText(ctx, block.node.shortName.slice(0, 2), 0, -8, 12, block.node.accent, 'center');
  }

  ctx.restore();

  ctx.save();
  pixelText(ctx, '?', x + BLOCK_SIZE - 16, y + 5, 12, '#7c351f', 'center');
  ctx.restore();
}

function drawRevealPanel(ctx: CanvasRenderingContext2D, block: GameBlock, frame: number) {
  const visibleFrames = block.revealUntil - frame;
  if (visibleFrames <= 0) return;

  const clients = block.clients;
  const panelWidth = block.id === 'harvestingpro' ? 300 : 274;
  const panelHeight = 52 + clients.length * 24;
  const x = clamp(block.x + BLOCK_SIZE / 2 - panelWidth / 2, 18, WORLD_WIDTH - panelWidth - 18);
  const aboveY = block.y - panelHeight - 26;
  const y = aboveY > 76 ? aboveY : block.y + BLOCK_SIZE + 22;
  const shimmer = Math.sin(frame * 0.18) * 0.5 + 0.5;

  ctx.save();
  ctx.globalAlpha = Math.min(1, visibleFrames / 22);
  pixelRect(ctx, x + 6, y + 7, panelWidth, panelHeight, 'rgba(30, 19, 13, 0.5)');
  pixelRect(ctx, x, y, panelWidth, panelHeight, '#fff3c4');
  pixelRect(ctx, x + 5, y + 5, panelWidth - 10, panelHeight - 10, '#17261a');
  pixelRect(ctx, x + 5, y + 5, panelWidth - 10, 28, block.node.color);
  pixelText(ctx, branchLabels[block.id].toUpperCase(), x + 16, y + 10, 15, '#fff8ef');
  pixelText(ctx, `${clients.length} ACTIVE`, x + panelWidth - 18, y + 10, 15, '#fff8ef', 'right');

  clients.forEach((client, index) => {
    const rowY = y + 42 + index * 24;
    pixelRect(ctx, x + 16, rowY + 7, 8, 8, index % 2 === 0 ? block.node.color : block.node.accent);
    pixelText(ctx, client.shortName, x + 32, rowY, 14, '#fff8ef');
    pixelText(ctx, getTenureToken(client), x + panelWidth - 18, rowY, 14, '#ffdf7d', 'right');
  });

  pixelRect(ctx, x + Math.floor(panelWidth * shimmer) - 12, y + 5, 5, panelHeight - 10, 'rgba(255, 248, 239, 0.18)');
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, frame: number) {
  const x = player.x;
  const y = player.y;
  const step = player.onGround ? Math.sin(frame * 0.24) * Math.min(5, Math.abs(player.vx) * 0.8) : 0;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(player.facing, 1);

  pixelRect(ctx, -15, -PLAYER_HEIGHT + 6, 30, 12, '#f4c460');
  pixelRect(ctx, -18, -PLAYER_HEIGHT + 14, 36, 10, '#d48332');
  pixelRect(ctx, -14, -PLAYER_HEIGHT + 24, 28, 20, '#f2b265');
  pixelRect(ctx, -9, -PLAYER_HEIGHT + 29, 5, 5, '#1b120c');
  pixelRect(ctx, 6, -PLAYER_HEIGHT + 29, 5, 5, '#1b120c');
  pixelRect(ctx, -12, -PLAYER_HEIGHT + 42, 24, 24, '#2d71b8');
  pixelRect(ctx, -18, -PLAYER_HEIGHT + 43, 8, 22, '#f05d3b');
  pixelRect(ctx, 10, -PLAYER_HEIGHT + 43, 8, 22, '#f05d3b');
  pixelRect(ctx, -12, -14 + step, 10, 14, '#2d3d73');
  pixelRect(ctx, 3, -14 - step, 10, 14, '#2d3d73');
  pixelRect(ctx, -17, -2 + step, 17, 6, '#221710');
  pixelRect(ctx, 1, -2 - step, 17, 6, '#221710');
  pixelRect(ctx, -10, -PLAYER_HEIGHT + 46, 5, 5, '#ffe07a');
  pixelRect(ctx, 5, -PLAYER_HEIGHT + 46, 5, 5, '#ffe07a');

  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, blocks: GameBlock[], player: Player, sparks: Spark[], frame: number) {
  pixelRect(ctx, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, '#86aee5');
  pixelRect(ctx, 0, 0, WORLD_WIDTH, 92, '#7da4da');

  pixelText(ctx, 'JD BUILDS', 44, 42, 25, '#fff8ef');
  pixelText(ctx, `CLIENTS ${clientNodes.length.toString().padStart(2, '0')}`, 308, 42, 25, '#fff8ef');
  pixelText(ctx, 'WORLD C-1', 552, 42, 25, '#fff8ef');
  pixelText(ctx, 'TIME 2026', 780, 42, 25, '#fff8ef');

  drawCloud(ctx, 146, 130, 1.35);
  drawCloud(ctx, 648, 138, 1.15);
  drawCloud(ctx, 732, 124, 1);
  drawHill(ctx, 236, GROUND_Y - 12, 148, 104, '#39b85f');
  drawHill(ctx, 450, GROUND_Y - 12, 120, 76, '#d66d3a');
  drawBush(ctx, 42, GROUND_Y - 66, '#8fda3b');
  drawBush(ctx, 604, GROUND_Y - 66, '#8fda3b');
  drawConduit(ctx, 824, GROUND_Y - 128);

  for (let i = 0; i < 5; i += 1) drawBrick(ctx, 398 + i * 48, 464, 48, 30);
  pixelRect(ctx, 446, 434, 48, 30, '#d0713a');
  pixelRect(ctx, 446, 438, 48, 5, '#ffc07a');
  pixelRect(ctx, 490, 434, 4, 30, '#632519');

  blocks.forEach((block) => drawQuestionBlock(ctx, block, frame));
  blocks.forEach((block) => drawRevealPanel(ctx, block, frame));

  sparks.forEach((spark) => {
    const alpha = spark.life / spark.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    pixelRect(ctx, spark.x, spark.y, 5, 5, spark.color);
    ctx.restore();
  });

  drawGround(ctx);
  drawPlayer(ctx, player, frame);
}

function addBlockSparks(sparks: Spark[], block: GameBlock) {
  for (let index = 0; index < 14; index += 1) {
    const angle = -Math.PI + (index / 13) * Math.PI;
    sparks.push({
      x: block.x + BLOCK_SIZE / 2,
      y: block.y + 4,
      vx: Math.cos(angle) * (1.4 + Math.random() * 2.6),
      vy: Math.sin(angle) * (2.4 + Math.random() * 2.8) - 1.8,
      color: index % 2 === 0 ? block.node.color : '#fff8ef',
      life: 34 + Math.random() * 18,
      maxLife: 52,
    });
  }
}

function updateGame(player: Player, blocks: GameBlock[], sparks: Spark[], frame: number) {
  if (player.jumpQueued && player.onGround) {
    player.vy = -18.2;
    player.onGround = false;
  }
  player.jumpQueued = false;

  const desiredVx = clamp((player.targetX - player.x) * 0.065, -8.5, 8.5);
  player.vx += (desiredVx - player.vx) * 0.22;
  if (Math.abs(player.vx) > 0.25) player.facing = player.vx >= 0 ? 1 : -1;

  const previousHeadY = player.y - PLAYER_HEIGHT;
  player.x = clamp(player.x + player.vx, 28, WORLD_WIDTH - 28);
  player.vy += GRAVITY;
  player.y += player.vy;

  blocks.forEach((block) => {
    if (block.hitFrames > 0) block.hitFrames -= 1;
  });

  if (player.vy < 0) {
    const headY = player.y - PLAYER_HEIGHT;
    const centerX = player.x;
    blocks.forEach((block) => {
      const bottom = block.y + BLOCK_SIZE;
      const overlapsX = centerX > block.x - 9 && centerX < block.x + BLOCK_SIZE + 9;
      const crossesBottom = headY <= bottom && previousHeadY >= bottom;
      if (!overlapsX || !crossesBottom) return;

      player.y = bottom + PLAYER_HEIGHT + 1;
      player.vy = 5.4;
      block.hitFrames = 14;
      block.revealUntil = frame + 430;
      addBlockSparks(sparks, block);
    });
  }

  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
  }

  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index];
    spark.x += spark.vx;
    spark.y += spark.vy;
    spark.vy += 0.18;
    spark.life -= 1;
    if (spark.life <= 0) sparks.splice(index, 1);
  }
}

function PixelClientsGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<GameViewport>(createViewport(WORLD_WIDTH, WORLD_HEIGHT));
  const blocksRef = useRef<GameBlock[]>(createBlocks());
  const playerRef = useRef<Player>({
    x: 132,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    targetX: 132,
    facing: 1,
    onGround: true,
    jumpQueued: false,
  });
  const sparksRef = useRef<Spark[]>([]);

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
      ctx.imageSmoothingEnabled = false;
      viewportRef.current = createViewport(width, height);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      frame += 1;
      updateGame(playerRef.current, blocksRef.current, sparksRef.current, frame);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      pixelRect(ctx, 0, 0, width, height, '#030303');

      const viewport = viewportRef.current;
      ctx.save();
      ctx.translate(viewport.x, viewport.y);
      ctx.scale(viewport.scale, viewport.scale);
      drawScene(ctx, blocksRef.current, playerRef.current, sparksRef.current, frame);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = '#151515';
      ctx.lineWidth = Math.max(10, 16 * viewport.scale);
      ctx.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);
      ctx.restore();

      animation = requestAnimationFrame(animate);
    };

    animation = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerToWorld(event, viewportRef.current);
    playerRef.current.targetX = pointer.x;
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerToWorld(event, viewportRef.current);
    playerRef.current.targetX = pointer.x;
    playerRef.current.jumpQueued = true;
  };

  const clientSummary = branchOrder
    .map((branchId) => `${branchLabels[branchId]}: ${clientNodes.filter((client) => client.branchId === branchId).length}`)
    .join('; ');

  return (
    <main className="game-page" aria-label={`Interactive 8-bit JD Builds client game. ${clientSummary}`}>
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        aria-hidden="true"
      />
    </main>
  );
}

export default function App() {
  return <PixelClientsGame />;
}
