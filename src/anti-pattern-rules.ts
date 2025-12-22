import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export const ANTI_PATTERN_RULES: Record<string, string> = {
  // Architecture rules (existing)
  circular: '**Avoid circular dependencies.** Files should not form import cycles.',
  nexus: '**Avoid nexus/coupling bottlenecks.** Files should not both import many files and be imported by many files.',
  orphan: '**Avoid orphan files.** Code files should have imports or dependents.',

  // Structural rules
  'long-function': '**Keep functions short.** Functions should be ~20 lines, never exceed 50.',
  'long-file': '**Keep files short.** Files should stay under 200 lines.',
  'deep-nesting': '**Avoid deep nesting.** Nesting depth should not exceed 4 levels.',
  'silent-failure': '**No silent failures.** Catch blocks should never be empty.',
  'too-many-parameters': '**Limit function parameters.** Functions should not have more than 5 parameters.',

  // Naming rules
  'generic-name': '**Use descriptive names.** Avoid generic names like data, result, temp, item, value.',
  'non-verb-function': '**Functions should be verbs.** Function names should start with a verb.',
  'non-question-boolean': '**Booleans should be questions.** Boolean names should start with is, has, can, should, etc.',
  'magic-number': '**No magic numbers.** Numeric literals should be named constants.',

  // Comment rules
  'commented-code': '**Delete commented-out code.** Never commit commented-out code.',
  'high-comment-density': '**Comments indicate unclear code.** High comment density suggests code needs refactoring.',

  // Architecture rules (new)
  'mixed-concerns': '**Separate concerns.** Files should not mix data, logic, and rendering.',
};

const APERTURE_RULES_MARKER = '<!-- Aperture Anti-Pattern Rules -->';

export async function addAntiPatternRule(rootPath: string, patternType: string): Promise<void> {
  const claudeMdPath = path.join(rootPath, 'CLAUDE.md');
  const rule = ANTI_PATTERN_RULES[patternType];
  if (!rule) return;

  try {
    let content = '';
    if (fs.existsSync(claudeMdPath)) {
      content = fs.readFileSync(claudeMdPath, 'utf-8');
    }

    // Check if rule already exists
    if (content.includes(rule)) return;

    // Find or create the Aperture rules section
    const ruleEntry = `- ${rule}`;
    if (content.includes(APERTURE_RULES_MARKER)) {
      // Add rule to existing section
      const markerIndex = content.indexOf(APERTURE_RULES_MARKER);
      const insertIndex = markerIndex + APERTURE_RULES_MARKER.length;
      content = content.slice(0, insertIndex) + '\n' + ruleEntry + content.slice(insertIndex);
    } else {
      // Create new section at end of file
      const section = `\n\n${APERTURE_RULES_MARKER}\n## Anti-Pattern Rules\n\n${ruleEntry}`;
      content = content.trimEnd() + section + '\n';
    }

    fs.writeFileSync(claudeMdPath, content);
    vscode.window.showInformationMessage(`Added "${patternType}" rule to CLAUDE.md`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to update CLAUDE.md: ${msg}`);
  }
}

export async function removeAntiPatternRule(rootPath: string, patternType: string): Promise<void> {
  const claudeMdPath = path.join(rootPath, 'CLAUDE.md');
  const rule = ANTI_PATTERN_RULES[patternType];
  if (!rule) return;

  try {
    if (!fs.existsSync(claudeMdPath)) return;

    let content = fs.readFileSync(claudeMdPath, 'utf-8');
    const ruleEntry = `- ${rule}`;

    if (!content.includes(ruleEntry)) return;

    // Remove the rule line
    content = content.replace(ruleEntry + '\n', '').replace(ruleEntry, '');

    // Clean up empty section if no rules remain
    const hasOtherRules = Object.values(ANTI_PATTERN_RULES).some(r => r !== rule && content.includes(r));
    if (!hasOtherRules && content.includes(APERTURE_RULES_MARKER)) {
      // Remove the entire section
      const sectionRegex = new RegExp(`\\n*${APERTURE_RULES_MARKER}\\n## Anti-Pattern Rules\\n*`, 'g');
      content = content.replace(sectionRegex, '');
    }

    fs.writeFileSync(claudeMdPath, content.trimEnd() + '\n');
    vscode.window.showInformationMessage(`Removed "${patternType}" rule from CLAUDE.md`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to update CLAUDE.md: ${msg}`);
  }
}
