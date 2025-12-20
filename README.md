# Aperture

AI Partner Programming Toolkit — a VSCode extension that provides visibility into codebase complexity and structure.

## The Problem

AI coding tools are everywhere (65% of developers use them weekly), but developers can't see:

- Which files are largest or most complex
- What languages are actually in use
- Whether AI-generated code follows project conventions
- Where the complexity is hiding

Without visibility, developers face a binary choice: trust everything or verify everything. Both extremes fail.

## The Solution

Aperture provides alternate "lenses" on your codebase:

- **Treemap**: Files sized by LOC, colored by language, zoomable hierarchy
- **Hotspot List**: Files and functions exceeding configurable thresholds
- **Language Breakdown**: LOC and file counts per language

Think of the IDE as a car. AI tools are trying to build self-driving cars. Aperture builds the dashboard, mirrors, and blind-spot detection.

## Installation

```bash
# Clone the repository
git clone https://github.com/CheechLizard/Aperture.git
cd Aperture

# Install dependencies
npm install

# Compile
npm run compile
```

## Development

```bash
# Watch mode for development
npm run watch

# Launch extension in debug mode
# Press F5 in VSCode
```

## Usage

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run "Aperture: Open Dashboard"
3. Explore your codebase through the treemap and hotspot views

## Tech Stack

- **Extension**: TypeScript, VSCode Extension API
- **Visualization**: D3.js in VSCode webview panels
- **Parsing**: Extension-based detection; tree-sitter for function extraction
- **No server dependency**: All analysis runs locally

## Documentation

- [AI Agent Guidelines](CLAUDE.md)
