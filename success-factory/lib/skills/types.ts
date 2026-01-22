import type { SkillDataRequirements } from "./context"

export interface SkillQuestion {
  id: string
  question: string
  examples?: string[]
}

export interface Skill {
  slug: string
  name: string
  description: string
  questions: SkillQuestion[]
  outputPath: string
  template: string
  data?: SkillDataRequirements
  /** List of knowledge files to load for this skill (paths relative to factory/knowledge/) */
  knowledge?: string[]
}

export interface SkillFrontmatter {
  name: string
  description: string
  outputPath: string
  data?: SkillDataRequirements
  /** List of knowledge files to load for this skill (paths relative to factory/knowledge/) */
  knowledge?: string[]
}
