import { writable, derived, get } from 'svelte/store';

// ─── Types ───────────────────────────────────────────────────────────

export interface CanvasNode {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    props: Record<string, any>;
    parentId?: string;
}

export type ActiveTool = 'select' | 'hand';

export interface CanvasState {
    nodes: CanvasNode[];
    selectedIds: string[];
    zoom: number;
    panX: number;
    panY: number;
    activeTool: ActiveTool;
    nextZIndex: number;
}

// ─── Default Sizes per Component Type ────────────────────────────────

export const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
    Hero:    { width: 800, height: 400 },
    Navbar:  { width: 800, height: 64 },
    Button:  { width: 160, height: 48 },
    Image:   { width: 320, height: 240 },
    Card:    { width: 320, height: 280 },
    Text:    { width: 400, height: 80 },
    Form:    { width: 400, height: 320 },
    Footer:  { width: 800, height: 200 },
};

// ─── Store ───────────────────────────────────────────────────────────

const initialState: CanvasState = {
    nodes: [],
    selectedIds: [],
    zoom: 0.65,
    panX: 50,
    panY: 50,
    activeTool: 'select',
    nextZIndex: 1,
};

export const canvasStore = writable<CanvasState>(initialState);

// ─── Derived ─────────────────────────────────────────────────────────

export const selectedNodes = derived(canvasStore, $s =>
    $s.nodes.filter(n => $s.selectedIds.includes(n.id))
);

// ─── Actions ─────────────────────────────────────────────────────────

export function addNode(type: string, x: number, y: number, parentId?: string, overrideW?: number, overrideH?: number): string {
    const id = 'node_' + Math.random().toString(36).substring(2, 9);
    const size = DEFAULT_SIZES[type] || { width: 200, height: 120 };
    const w = overrideW ?? size.width;
    const h = overrideH ?? size.height;

    const initialProps: Record<string, any> = {};
    if (type === 'Text') initialProps.content = 'Your text here';
    if (type === 'Button') {
        initialProps.text = 'Click Me';
        initialProps.variant = 'primary';
    }
    if (type === 'Navbar') initialProps.logoText = 'Brand';
    if (type === 'Hero') {
        initialProps.title = 'Welcome to our platform';
        initialProps.subtitle = 'Start building amazing apps today.';
        initialProps.primaryButtonText = 'Get Started';
        initialProps.secondaryButtonText = 'Learn More';
    }
    if (type === 'Card') {
        initialProps.title = 'Card Title';
        initialProps.body = 'This is a nice card body content.';
    }

    canvasStore.update(s => ({
        ...s,
        nodes: [...s.nodes, {
            id,
            type,
            x: x - w / 2,
            y: y - h / 2,
            width: w,
            height: h,
            zIndex: s.nextZIndex,
            props: initialProps,
            parentId,
        }],
        nextZIndex: s.nextZIndex + 1,
        selectedIds: [id],
    }));

    return id;
}

export function removeNodes(ids: string[]) {
    canvasStore.update(s => ({
        ...s,
        nodes: s.nodes.filter(n => !ids.includes(n.id)),
        selectedIds: s.selectedIds.filter(id => !ids.includes(id)),
    }));
}

export function moveNode(id: string, dx: number, dy: number) {
    canvasStore.update(s => ({
        ...s,
        nodes: s.nodes.map(n =>
            n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n
        ),
    }));
}

export function moveSelectedNodes(dx: number, dy: number) {
    canvasStore.update(s => {
        const toMove = new Set<string>(s.selectedIds);
        let added = true;
        while (added) {
            added = false;
            for (const n of s.nodes) {
                if (n.parentId && toMove.has(n.parentId) && !toMove.has(n.id)) {
                    toMove.add(n.id);
                    added = true;
                }
            }
        }
        return {
            ...s,
            nodes: s.nodes.map(n =>
                toMove.has(n.id)
                    ? { ...n, x: n.x + dx, y: n.y + dy }
                    : n
            ),
        };
    });
}

export function resizeNode(id: string, x: number, y: number, width: number, height: number) {
    canvasStore.update(s => ({
        ...s,
        nodes: s.nodes.map(n =>
            n.id === id ? { ...n, x, y, width: Math.max(40, width), height: Math.max(24, height) } : n
        ),
    }));
}

export function updateNodeContent(id: string, propKey: string, propValue: any) {
    canvasStore.update(s => ({
        ...s,
        nodes: s.nodes.map(n =>
            n.id === id ? { ...n, props: { ...n.props, [propKey]: propValue } } : n
        ),
    }));
}

export function selectNode(id: string, additive = false) {
    canvasStore.update(s => {
        if (additive) {
            const already = s.selectedIds.includes(id);
            return {
                ...s,
                selectedIds: already
                    ? s.selectedIds.filter(i => i !== id)
                    : [...s.selectedIds, id],
            };
        }
        return { ...s, selectedIds: [id] };
    });
}

export function clearSelection() {
    canvasStore.update(s => ({ ...s, selectedIds: [] }));
}

export function setTool(tool: ActiveTool) {
    canvasStore.update(s => ({ ...s, activeTool: tool }));
}

export function setZoom(zoom: number) {
    canvasStore.update(s => ({ ...s, zoom: Math.min(4, Math.max(0.1, zoom)) }));
}

export function setPan(x: number, y: number) {
    canvasStore.update(s => ({ ...s, panX: x, panY: y }));
}

export function bringToFront(id: string) {
    canvasStore.update(s => ({
        ...s,
        nodes: s.nodes.map(n =>
            n.id === id ? { ...n, zIndex: s.nextZIndex } : n
        ),
        nextZIndex: s.nextZIndex + 1,
    }));
}

export function sendToBack(id: string) {
    canvasStore.update(s => {
        const minZ = Math.min(...s.nodes.map(n => n.zIndex));
        return {
            ...s,
            nodes: s.nodes.map(n =>
                n.id === id ? { ...n, zIndex: minZ - 1 } : n
            ),
        };
    });
}

export function duplicateNodes(ids: string[]) {
    canvasStore.update(s => {
        const dupes: CanvasNode[] = [];
        let z = s.nextZIndex;
        for (const id of ids) {
            const orig = s.nodes.find(n => n.id === id);
            if (!orig) continue;
            dupes.push({
                ...orig,
                id: 'node_' + Math.random().toString(36).substring(2, 9),
                x: orig.x + 20,
                y: orig.y + 20,
                zIndex: z++,
                props: { ...orig.props },
            });
        }
        return {
            ...s,
            nodes: [...s.nodes, ...dupes],
            selectedIds: dupes.map(d => d.id),
            nextZIndex: z,
        };
    });
}
