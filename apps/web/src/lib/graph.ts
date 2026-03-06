import type { DependencyGraph, EnrichedTask } from '@insightboard/shared';
import type { Edge, Node } from 'reactflow';

type UiStatus = 'Ready' | 'Blocked' | 'Completed' | 'Error';

function calcDepth(id: string, taskMap: Map<string, EnrichedTask>, memo: Map<string, number>, stack: Set<string>): number {
  if (memo.has(id)) {
    return memo.get(id)!;
  }

  if (stack.has(id)) {
    return 0;
  }

  stack.add(id);
  const task = taskMap.get(id);
  if (!task || task.dependencies.length === 0) {
    memo.set(id, 0);
    stack.delete(id);
    return 0;
  }

  const depth = Math.max(...task.dependencies.map((dep) => calcDepth(dep, taskMap, memo, stack))) + 1;
  memo.set(id, depth);
  stack.delete(id);
  return depth;
}

export function deriveStatus(task: EnrichedTask, completedTaskIds: Set<string>, errorTaskIds: Set<string>): UiStatus {
  if (task.isInCycle || errorTaskIds.has(task.id) || task.status === 'Error') {
    return 'Error';
  }

  if (completedTaskIds.has(task.id)) {
    return 'Completed';
  }

  const ready = task.dependencies.every((dependency) => completedTaskIds.has(dependency));
  return ready ? 'Ready' : 'Blocked';
}

export function toFlow(
  graph: DependencyGraph,
  completedTaskIds: Set<string>,
): { nodes: Node[]; edges: Edge[]; errorTaskIds: Set<string> } {
  const errorTaskIds = new Set(graph.tasks.filter((task) => task.isInCycle || task.status === 'Error').map((task) => task.id));

  const taskMap = new Map(graph.tasks.map((task) => [task.id, task]));
  const memo = new Map<string, number>();
  const columns = new Map<number, string[]>();

  for (const task of graph.tasks) {
    const depth = calcDepth(task.id, taskMap, memo, new Set());
    const column = columns.get(depth) ?? [];
    column.push(task.id);
    columns.set(depth, column);
  }

  const nodes: Node[] = [];

  for (const [depth, ids] of columns) {
    ids.forEach((id, row) => {
      const task = taskMap.get(id);
      if (!task) {
        return;
      }

      const status = deriveStatus(task, completedTaskIds, errorTaskIds);
      const colorMap: Record<UiStatus, string> = {
        Ready: '#22c55e',
        Blocked: '#f59e0b',
        Completed: '#38bdf8',
        Error: '#ef4444',
      };

      nodes.push({
        id,
        position: { x: depth * 320, y: row * 150 },
        data: {
          label: `${id} · ${task.priority}`,
          title: id,
          description: task.description,
          status,
          priority: task.priority,
        },
        type: 'default',
        draggable: false,
        selectable: true,
        style: {
          width: 260,
          borderRadius: 14,
          border: `1px solid ${colorMap[status]}`,
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          boxShadow: `0 0 0 2px ${colorMap[status]}22`,
        },
      });
    });
  }

  const edges: Edge[] = [];
  for (const task of graph.tasks) {
    for (const dep of task.dependencies) {
      edges.push({
        id: `${dep}->${task.id}`,
        source: dep,
        target: task.id,
        animated: true,
      });
    }
  }

  return { nodes, edges, errorTaskIds };
}
