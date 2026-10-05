'use client';

import React, { useRef } from 'react';
import type { editor, Position, languages } from 'monaco-editor';
import Editor, { loader, type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useTheme } from '@/context/ThemeContext';
import { flowActions } from '@/lib/commandFlow';
import type { SupportedScriptLanguage } from '@/lib/commandScripting';

// Serve editor assets locally; never depend on public CDN
loader.config({ paths: { vs: '/monaco/vs' } });

export interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: SupportedScriptLanguage;
  disabled?: boolean;
  references?: { id: string; name: string }[];
}

export default function ScriptEditor({
  value,
  onChange,
  language = 'typescript',
  disabled = false,
  references = [],
}: ScriptEditorProps) {
  const { resolvedTheme } = useTheme();
  const disposable = useRef<{ dispose(): void } | null>(null);

  const monacoLang =
    language === 'typescript'
      ? 'typescript'
      : language === 'javascript'
      ? 'javascript'
      : language === 'python'
      ? 'python'
      : 'hawk-flow';

  const beforeMount: BeforeMount = monaco => {
    if (!monaco.languages.getLanguages().some((l: languages.ILanguageExtensionPoint) => l.id === 'hawk-flow')) {
      monaco.languages.register({ id: 'hawk-flow' });
      monaco.languages.setMonarchTokensProvider('hawk-flow', {
        tokenizer: {
          root: [
            [/\b(flow|node|connect|yes|no)\b/, 'keyword'],
            [new RegExp(`\\b(${flowActions.join('|')})\\b`), 'type'],
            [/"(?:[^"\\]|\\.)*"/, 'string'],
            [/\d+/, 'number'],
            [/\/\/.*$/, 'comment'],
          ],
        },
      });
    }
  };

  const onMount: OnMount = (editor, monaco) => {
    disposable.current?.dispose();

    const completionItems = (model: editor.ITextModel, position: Position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const baseVars = ['{user}', '{username}', '{server}', '{args}'].map(variable => ({
        label: variable,
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: variable,
        detail: 'Context interpolation token',
        range,
      }));

      const refItems = references.map(ref => ({
        label: ref.name,
        detail: `ID: ${ref.id}`,
        kind: monaco.languages.CompletionItemKind.Reference,
        insertText: ref.id,
        range,
      }));

      if (language === 'flow') {
        return {
          suggestions: [
            ...flowActions.map(action => ({
              label: action,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: action,
              range,
            })),
            ...baseVars,
            ...refItems,
          ],
        };
      }

      // TS, JS, and Python API method suggestions
      const isPy = language === 'python';
      const ctxMethods = [
        { label: isPy ? 'ctx.reply' : 'ctx.reply', text: isPy ? 'await ctx.reply("${1:Hello {user}}")' : 'await ctx.reply("${1:Hello {user}}");', desc: 'Reply directly to user' },
        { label: isPy ? 'ctx.send' : 'ctx.send', text: isPy ? 'await ctx.send("${1:channel_id}", "${2:message}")' : 'await ctx.send("${1:channelId}", "${2:message}");', desc: 'Send to specific channel' },
        { label: isPy ? 'ctx.send_embed' : 'ctx.sendEmbed', text: isPy ? 'await ctx.send_embed(channel_id="${1:channel_id}", title="${2:Title}", description="${3:Content}")' : 'await ctx.sendEmbed({ channelId: "${1:channelId}", title: "${2:Title}", description: "${3:Content}" });', desc: 'Send formatted embed' },
        { label: isPy ? 'ctx.has_role' : 'ctx.hasRole', text: isPy ? 'ctx.has_role("${1:role_id}")' : 'ctx.hasRole("${1:roleId}")', desc: 'Check if caller has Discord role' },
        { label: isPy ? 'ctx.has_permission' : 'ctx.hasPermission', text: isPy ? 'ctx.has_permission("${1:ManageMessages}")' : 'ctx.hasPermission("${1:ManageMessages}")', desc: 'Check if caller has permission' },
        { label: isPy ? 'ctx.in_channel' : 'ctx.inChannel', text: isPy ? 'ctx.in_channel("${1:channel_id}")' : 'ctx.inChannel("${1:channelId}")', desc: 'Check if command run in channel' },
        { label: isPy ? 'ctx.add_role' : 'ctx.addRole', text: isPy ? 'await ctx.add_role("${1:role_id}")' : 'await ctx.addRole("${1:roleId}");', desc: 'Grant role to member' },
        { label: isPy ? 'ctx.remove_role' : 'ctx.removeRole', text: isPy ? 'await ctx.remove_role("${1:role_id}")' : 'await ctx.removeRole("${1:roleId}");', desc: 'Revoke role from member' },
        { label: isPy ? 'ctx.wait' : 'ctx.wait', text: isPy ? 'await ctx.wait(${1:1000})' : 'await ctx.wait(${1:1000});', desc: 'Pause execution in ms' },
        { label: isPy ? 'ctx.react' : 'ctx.react', text: isPy ? 'await ctx.react("${1:👍}")' : 'await ctx.react("${1:👍}");', desc: 'React to triggering message' },
      ];

      return {
        suggestions: [
          ...ctxMethods.map(m => ({
            label: m.label,
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: m.text,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: m.desc,
            range,
          })),
          ...baseVars,
          ...refItems,
        ],
      };
    };

    disposable.current = monaco.languages.registerCompletionItemProvider(monacoLang, {
      provideCompletionItems: completionItems,
    });

    editor.onDidDispose(() => disposable.current?.dispose());
  };

  return (
    <Editor
      height="520px"
      language={monacoLang}
      theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
      value={value}
      onChange={v => onChange(v || '')}
      beforeMount={beforeMount}
      onMount={onMount}
      options={{
        readOnly: disabled,
        minimap: { enabled: false },
        fontSize: 13,
        wordWrap: 'on',
        automaticLayout: true,
        ariaLabel: 'Hawk command script editor',
        tabSize: 2,
      }}
      loading={<div role="status" className="p-4 text-xs text-text-muted">Loading script editor…</div>}
    />
  );
}
