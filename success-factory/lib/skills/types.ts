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
}

export interface SkillFrontmatter {
  name: string
  description: string
  outputPath: string
  data?: SkillDataRequirements
}
