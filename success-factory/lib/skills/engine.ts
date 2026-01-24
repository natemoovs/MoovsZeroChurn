import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { Skill, SkillQuestion, SkillFrontmatter } from './types'

const SKILLS_DIR = path.join(process.cwd(), 'factory', 'skills')

function parseQuestions(content: string): SkillQuestion[] {
  const questions: SkillQuestion[] = []
  const lines = content.split('\n')

  let inQuestionsSection = false
  let currentQuestion: Partial<SkillQuestion> | null = null
  let collectingExamples = false

  for (const line of lines) {
    // Check for Questions section header
    if (/^##\s+questions/i.test(line)) {
      inQuestionsSection = true
      continue
    }

    // Check for Template section header (ends questions section)
    if (/^##\s+template/i.test(line)) {
      if (currentQuestion?.id && currentQuestion?.question) {
        questions.push(currentQuestion as SkillQuestion)
      }
      return questions // Return early to avoid duplicate push at end
    }

    if (!inQuestionsSection) continue

    // Parse question line: ### id: question text
    const questionMatch = line.match(/^###\s+(\w+):\s*(.+)$/)
    if (questionMatch) {
      if (currentQuestion?.id && currentQuestion?.question) {
        questions.push(currentQuestion as SkillQuestion)
      }
      currentQuestion = {
        id: questionMatch[1],
        question: questionMatch[2],
      }
      collectingExamples = false
      continue
    }

    // Check for examples marker
    if (currentQuestion && /^examples?:/i.test(line.trim())) {
      collectingExamples = true
      currentQuestion.examples = []
      continue
    }

    // Collect example items (bullet points)
    if (collectingExamples && currentQuestion?.examples && line.trim().startsWith('-')) {
      const example = line.trim().replace(/^-\s*/, '')
      if (example) {
        currentQuestion.examples.push(example)
      }
    }
  }

  // Push last question if exists
  if (currentQuestion?.id && currentQuestion?.question) {
    questions.push(currentQuestion as SkillQuestion)
  }

  return questions
}

function parseTemplate(content: string): string {
  const templateMatch = content.match(/^##\s+template\s*\n([\s\S]*?)(?=^##\s|\Z)/im)
  if (!templateMatch) return ''

  // Extract content between ```markdown or ``` blocks, or just the raw content
  const templateSection = templateMatch[1]
  const codeBlockMatch = templateSection.match(/```(?:markdown)?\n([\s\S]*?)```/)

  return codeBlockMatch ? codeBlockMatch[1].trim() : templateSection.trim()
}

function loadSkill(skillDir: string): Skill | null {
  const skillPath = path.join(SKILLS_DIR, skillDir, 'SKILL.md')

  if (!fs.existsSync(skillPath)) {
    return null
  }

  const fileContent = fs.readFileSync(skillPath, 'utf-8')
  const { data, content } = matter(fileContent)
  const frontmatter = data as SkillFrontmatter

  return {
    slug: skillDir,
    name: frontmatter.name || skillDir,
    description: frontmatter.description || '',
    questions: parseQuestions(content),
    outputPath: frontmatter.outputPath || `factory/knowledge/${skillDir}.md`,
    template: parseTemplate(content),
    data: frontmatter.data,
    knowledge: frontmatter.knowledge,
  }
}

export function getSkills(): Skill[] {
  if (!fs.existsSync(SKILLS_DIR)) {
    return []
  }

  const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  return skillDirs
    .map(dir => loadSkill(dir))
    .filter((skill): skill is Skill => skill !== null)
}

export function getSkill(slug: string): Skill | null {
  return loadSkill(slug)
}
