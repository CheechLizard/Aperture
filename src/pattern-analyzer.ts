import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileInfo, PatternAnalysis, PatternInfo, FilePatternClassification, PatternUsage } from './types';
import { assignPatternColors } from './pattern-colors';

const BATCH_SIZE = 8;
const MAX_FILE_PREVIEW = 100;

export async function analyzePatterns(
  files: FileInfo[],
  rootPath: string,
  onProgress?: (phase: string, current: number, total: number) => void
): Promise<PatternAnalysis> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key configured. Set aperture.anthropicApiKey in settings.');
  }

  const client = new Anthropic({ apiKey });

  onProgress?.('Discovering patterns', 0, 1);
  const discovery = await discoverPatterns(client, files, rootPath);
  onProgress?.('Discovering patterns', 1, 1);

  const patterns = assignPatternColors(discovery.patterns);
  const classifications: FilePatternClassification[] = [];

  const batches = createBatches(files, BATCH_SIZE);
  for (let i = 0; i < batches.length; i++) {
    onProgress?.('Classifying files', i, batches.length);
    const batchResults = await classifyBatch(client, batches[i], patterns, rootPath);
    classifications.push(...batchResults);
  }
  onProgress?.('Classifying files', batches.length, batches.length);

  return {
    analyzedAt: new Date().toISOString(),
    framework: discovery.framework,
    patterns,
    classifications,
  };
}

interface DiscoveryResult {
  framework: string;
  patterns: PatternInfo[];
}

async function discoverPatterns(
  client: Anthropic,
  files: FileInfo[],
  rootPath: string
): Promise<DiscoveryResult> {
  const fileList = files.map(f => f.path).join('\n');

  const sampleFiles = files.slice(0, 5);
  const samplePreviews = sampleFiles.map(f => {
    const fullPath = path.join(rootPath, f.path);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').slice(0, 30);
      return `=== ${f.path} ===\n${lines.join('\n')}`;
    } catch {
      return '';
    }
  }).filter(Boolean).join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Analyze this codebase to identify specific design patterns and architectural patterns in use.

Files in project:
${fileList}

Sample file contents:
${samplePreviews}

Identify SPECIFIC patterns, not generic categories. Look for:

**Design Patterns** (GoF and common patterns):
- Creational: Factory, Builder, Singleton, Prototype
- Structural: Adapter, Decorator, Facade, Proxy, Composite
- Behavioral: Observer, Strategy, Command, State, Iterator, Mediator

**Architectural Patterns**:
- Service Layer, Repository, Controller, Data Model
- Event-driven, Message passing, Pub/Sub
- Module pattern, Dependency Injection

Only include patterns you can reasonably infer from the file names and structure.
Each pattern should have a "category" of either "design" or "architectural".

Respond with ONLY valid JSON (no markdown):
{"framework":"project type","patterns":[{"name":"Factory","category":"design","description":"Creates objects without specifying concrete class"},{"name":"Service Layer","category":"architectural","description":"Encapsulates business logic"}]}`
    }]
  });

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text || '{}';

  try {
    const result = JSON.parse(text);
    return {
      framework: result.framework || 'Unknown',
      patterns: (result.patterns || []).map((p: { name: string; description: string; category?: string }) => ({
        name: p.name,
        description: p.description,
        category: (p.category === 'design' || p.category === 'architectural') ? p.category : 'design',
        color: '',
      })),
    };
  } catch {
    return {
      framework: 'Unknown',
      patterns: [
        { name: 'Module', description: 'Self-contained functional units', category: 'architectural', color: '' },
        { name: 'Service', description: 'Business logic services', category: 'architectural', color: '' },
      ],
    };
  }
}

async function classifyBatch(
  client: Anthropic,
  files: FileInfo[],
  patterns: PatternInfo[],
  rootPath: string
): Promise<FilePatternClassification[]> {
  const patternList = patterns.map(p => `- ${p.name} (${p.category}): ${p.description}`).join('\n');

  const fileDetails = files.map(f => {
    const fullPath = path.join(rootPath, f.path);
    let preview = '';
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').slice(0, MAX_FILE_PREVIEW);
      preview = lines.join('\n').slice(0, 3000);
    } catch {
      preview = '(unable to read)';
    }
    return `=== ${f.path} (${f.language}, ${f.loc} LOC) ===\n${preview}`;
  }).join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Analyze each file and identify ALL patterns it implements. A file can implement multiple patterns.

Available patterns:
${patternList}

Files to analyze:
${fileDetails}

For each file, identify which patterns are present. Include a brief reason explaining why that pattern applies.
Be specific - only claim a pattern if you see clear evidence in the code.

Respond with ONLY valid JSON (no markdown):
{"classifications":[{"path":"file/path.ts","patterns":[{"patternName":"Factory","confidence":"high","reason":"Creates client instances via constructor"},{"patternName":"Service Layer","confidence":"medium","reason":"Encapsulates API logic"}]}]}`
    }]
  });

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text || '{}';

  try {
    const result = JSON.parse(text);
    return (result.classifications || []).map((c: { path: string; patterns?: PatternUsage[] }) => ({
      path: c.path,
      patterns: (c.patterns || []).map((p: PatternUsage) => ({
        patternName: p.patternName,
        confidence: p.confidence || 'medium',
        reason: p.reason || '',
      })),
    }));
  } catch {
    return files.map(f => ({ path: f.path, patterns: [] }));
  }
}

function createBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function getApiKey(): string | undefined {
  const config = vscode.workspace.getConfiguration('aperture');
  const configKey = config.get<string>('anthropicApiKey');
  return configKey || process.env.ANTHROPIC_API_KEY;
}
