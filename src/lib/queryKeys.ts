export const boardKeys = {
  all: ['boards'] as const,
  detail: (id: string) => ['boards', id] as const,
};

export const taskDetailKey = (boardId: string, taskId: string) => ['boards', boardId, 'tasks', taskId];

export function suggestionsKey(boardId: string, taskId: string) {
  return ['boards', boardId, 'tasks', taskId, 'subtask-suggestions'] as const;
}


export function descriptionExpansionKey(boardId: string, taskId: string) {
  return ['boards', boardId, 'tasks', taskId, 'description-expansion'] as const;
}
export const memberKeys = {
  list: (boardId: string) => ['boardMembers', boardId] as const,
};