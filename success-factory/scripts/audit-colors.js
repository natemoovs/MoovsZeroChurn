#!/usr/bin/env node
/**
 * Color Audit Script
 *
 * Checks for hard-coded Tailwind color classes in the codebase.
 * Enforces the use of semantic color tokens instead of literal colors.
 *
 * Usage: node scripts/audit-colors.js [--fix]
 */

const fs = require('fs');
const path = require('path');

// Patterns to search for - literal Tailwind color classes
const LITERAL_COLOR_PATTERNS = [
  // Zinc, Neutral, Gray, Slate colors
  /\b(text|bg|border|ring|fill|stroke|shadow)-(zinc|neutral|gray|slate|stone)-\d{2,3}/g,
  // Red, Orange, Amber, Yellow
  /\b(text|bg|border|ring|fill|stroke|shadow)-(red|orange|amber|yellow)-\d{2,3}/g,
  // Green, Emerald, Teal, Cyan
  /\b(text|bg|border|ring|fill|stroke|shadow)-(green|emerald|teal|cyan)-\d{2,3}/g,
  // Blue, Indigo, Violet, Purple, Pink
  /\b(text|bg|border|ring|fill|stroke|shadow)-(blue|indigo|violet|purple|pink|fuchsia|rose)-\d{2,3}/g,
];

// Allowed exceptions (files that legitimately need literal colors)
const ALLOWED_FILES = [
  'globals.css',
  'tailwind.config',
  'theme.ts',
  'theme.js',
  'colors.ts',
  'colors.js',
];

// Directories to scan
const SCAN_DIRS = [
  'app',
  'components',
  'lib',
];

// File extensions to check
const EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js', '.css'];

// Semantic alternatives (for suggestions)
const SEMANTIC_ALTERNATIVES = {
  'zinc': 'content-primary, content-secondary, content-tertiary, bg-primary, bg-secondary, bg-tertiary, border-default',
  'gray': 'content-primary, content-secondary, content-tertiary, bg-primary, bg-secondary, bg-tertiary, border-default',
  'neutral': 'content-primary, content-secondary, content-tertiary, bg-primary, bg-secondary',
  'slate': 'content-primary, content-secondary, bg-secondary, bg-tertiary',
  'red': 'error-50, error-100, error-500, error-600',
  'orange': 'warning-50, warning-100, warning-500, warning-600',
  'amber': 'warning-50, warning-100, warning-500, warning-600, highlight-*',
  'yellow': 'warning-50, warning-100, warning-500',
  'green': 'success-50, success-100, success-500, success-600, success-700',
  'emerald': 'success-50, success-100, success-500, success-600',
  'teal': 'accent-*, success-*',
  'cyan': 'accent-50 through accent-700',
  'blue': 'primary-50 through primary-900, info-*',
  'indigo': 'primary-600 through primary-900',
  'violet': 'primary-*, accent-*',
  'purple': 'primary-*, accent-*',
  'pink': 'error-*, accent-*',
  'fuchsia': 'accent-*',
  'rose': 'error-50, error-100, error-500',
};

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (EXTENSIONS.some(ext => file.endsWith(ext))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function isAllowedFile(filePath) {
  return ALLOWED_FILES.some(allowed => filePath.includes(allowed));
}

function auditFile(filePath) {
  if (isAllowedFile(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, lineIndex) => {
    LITERAL_COLOR_PATTERNS.forEach(pattern => {
      const matches = line.matchAll(new RegExp(pattern));
      for (const match of matches) {
        // Extract the color name for suggestion
        const colorMatch = match[0].match(/-(zinc|neutral|gray|slate|stone|red|orange|amber|yellow|green|emerald|teal|cyan|blue|indigo|violet|purple|pink|fuchsia|rose)-/);
        const colorName = colorMatch ? colorMatch[1] : '';

        issues.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          match: match[0],
          suggestion: SEMANTIC_ALTERNATIVES[colorName] || 'Use semantic color tokens',
        });
      }
    });
  });

  return issues;
}

function main() {
  const basePath = process.cwd();
  let allIssues = [];
  let filesChecked = 0;

  console.log('\n🎨 Color Audit - Checking for literal Tailwind colors...\n');

  SCAN_DIRS.forEach(dir => {
    const dirPath = path.join(basePath, dir);
    const files = getAllFiles(dirPath);

    files.forEach(file => {
      filesChecked++;
      const issues = auditFile(file);
      allIssues = allIssues.concat(issues);
    });
  });

  console.log(`📁 Scanned ${filesChecked} files\n`);

  if (allIssues.length === 0) {
    console.log('✅ No literal color classes found! All colors use semantic tokens.\n');
    process.exit(0);
  }

  console.log(`❌ Found ${allIssues.length} literal color usage(s):\n`);

  // Group by file
  const byFile = {};
  allIssues.forEach(issue => {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  });

  Object.entries(byFile).forEach(([file, issues]) => {
    const relativePath = path.relative(basePath, file);
    console.log(`📄 ${relativePath}`);
    issues.forEach(issue => {
      console.log(`   Line ${issue.line}: "${issue.match}"`);
      console.log(`   💡 Use: ${issue.suggestion}`);
    });
    console.log('');
  });

  console.log('─'.repeat(60));
  console.log(`\n⚠️  Please replace literal colors with semantic tokens from the color system.`);
  console.log(`📖 See: SUCCESS-FACTORY-COLOR-SYSTEM.md for documentation.\n`);

  // Exit with error code for CI/pre-commit
  process.exit(1);
}

main();
