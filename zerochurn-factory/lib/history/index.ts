export interface HistoryItem {
  id: string
  skillSlug: string
  skillName: string
  answers: Record<string, string>
  result: string
  feedback?: 'up' | 'down'
  createdAt: string
}

const HISTORY_KEY = 'zerochurn-history'
const MAX_HISTORY = 50

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(HISTORY_KEY)
  return stored ? JSON.parse(stored) : []
}

export function addToHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>): HistoryItem {
  const history = getHistory()
  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  const updated = [newItem, ...history].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  return newItem
}

export function updateFeedback(id: string, feedback: 'up' | 'down'): void {
  const history = getHistory()
  const updated = history.map(item =>
    item.id === id ? { ...item, feedback } : item
  )
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

export function deleteHistoryItem(id: string): void {
  const history = getHistory()
  const updated = history.filter(item => item.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}
