'use client';
import React, { useRef } from 'react';
import type { editor, Position, languages } from 'monaco-editor';
import Editor, { loader, type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useTheme } from '@/context/ThemeContext';
import { flowActions } from '@/lib/commandFlow';
// Serve the editor locally; dashboard scripts never depend on a public CDN.
loader.config({ paths: { vs: '/monaco/vs' } });
export default function ScriptEditor({ value, onChange, disabled, references = [] }: { value: string; onChange: (value: string) => void; disabled?: boolean; references?: { id: string; name: string }[] }) {
  const { resolvedTheme } = useTheme();
  const disposable = useRef<{ dispose(): void } | null>(null);
  const beforeMount: BeforeMount = monaco => {
    if (!monaco.languages.getLanguages().some((l: languages.ILanguageExtensionPoint) => l.id === 'hawk-flow')) {
      monaco.languages.register({ id: 'hawk-flow' });
      monaco.languages.setMonarchTokensProvider('hawk-flow', { tokenizer: { root: [[/\b(flow|node|connect|yes|no)\b/, 'keyword'], [new RegExp(`\\b(${flowActions.join('|')})\\b`), 'type'], [/"(?:[^"\\]|\\.)*"/, 'string'], [/\d+/, 'number'], [/\/\/.*$/, 'comment']] } });
    }
  };
  const onMount: OnMount = (editor, monaco) => {
    disposable.current?.dispose();
    disposable.current = monaco.languages.registerCompletionItemProvider('hawk-flow', { provideCompletionItems: (model: editor.ITextModel, position: Position) => { const word = model.getWordUntilPosition(position); const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }; return { suggestions: [...flowActions.map(action => ({ label: action, kind: monaco.languages.CompletionItemKind.Function, insertText: action, range })), ...['{user}', '{username}', '{server}', '{args}'].map(variable => ({ label: variable, kind: monaco.languages.CompletionItemKind.Variable, insertText: variable, range })), ...references.map(ref => ({ label: ref.name, detail: ref.id, kind: monaco.languages.CompletionItemKind.Reference, insertText: ref.id, range }))] }; } });
    editor.onDidDispose(() => disposable.current?.dispose());
  };
  return <Editor height="520px" language="hawk-flow" theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} value={value} onChange={v => onChange(v || '')} beforeMount={beforeMount} onMount={onMount} options={{ readOnly: disabled, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', automaticLayout: true, ariaLabel: 'Hawk command script editor', tabSize: 2 }} loading={<div role="status">Loading script editor…</div>}/>;
}
