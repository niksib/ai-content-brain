import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function useMarkdown() {
  function renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }

  return { renderMarkdown };
}
