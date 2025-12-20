import { PatternInfo } from './types';

const DESIGN_PALETTE = [
  '#e74c3c', // Red
  '#9b59b6', // Purple
  '#e91e63', // Pink
  '#ff9800', // Amber
  '#f39c12', // Orange
];

const ARCHITECTURAL_PALETTE = [
  '#3498db', // Blue
  '#2ecc71', // Green
  '#1abc9c', // Teal
  '#00bcd4', // Cyan
  '#8bc34a', // Light Green
];

export function assignPatternColors(patterns: PatternInfo[]): PatternInfo[] {
  let designIndex = 0;
  let architecturalIndex = 0;

  return patterns.map((pattern) => {
    const palette = pattern.category === 'design' ? DESIGN_PALETTE : ARCHITECTURAL_PALETTE;
    const index = pattern.category === 'design' ? designIndex++ : architecturalIndex++;
    return {
      ...pattern,
      color: palette[index % palette.length],
    };
  });
}

export function getPatternColor(patterns: PatternInfo[], patternName: string): string {
  const pattern = patterns.find(p => p.name === patternName);
  return pattern?.color || '#7f8c8d';
}
