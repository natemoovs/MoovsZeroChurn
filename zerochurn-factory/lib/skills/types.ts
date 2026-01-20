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
}

export interface SkillFrontmatter {
  name: string
  description: string
  outputPath: string
}
