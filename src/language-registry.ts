import { LanguageHandler } from './language-handlers/base-handler';

class LanguageRegistry {
  private handlers: Map<string, LanguageHandler> = new Map();
  private extensionMap: Map<string, LanguageHandler> = new Map();

  register(handler: LanguageHandler): void {
    for (const langId of handler.languageIds) {
      this.handlers.set(langId, handler);
    }
    for (const ext of handler.extensions) {
      this.extensionMap.set(ext.toLowerCase(), handler);
    }
  }

  getHandlerByExtension(ext: string): LanguageHandler | null {
    return this.extensionMap.get(ext.toLowerCase()) || null;
  }

  getHandlerByLanguage(language: string): LanguageHandler | null {
    return this.handlers.get(language) || null;
  }

  async initializeAll(wasmDir: string): Promise<void> {
    const uniqueHandlers = new Set(this.handlers.values());
    await Promise.all([...uniqueHandlers].map(h => h.initialize(wasmDir)));
  }

  getSupportedLanguages(): string[] {
    return [...this.handlers.keys()];
  }

  isLanguageSupported(language: string): boolean {
    return this.handlers.has(language);
  }

  isExtensionSupported(ext: string): boolean {
    return this.extensionMap.has(ext.toLowerCase());
  }
}

export const languageRegistry = new LanguageRegistry();
