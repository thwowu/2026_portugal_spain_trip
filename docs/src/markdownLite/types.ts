export type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'link'; label: string; href: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'mark'; value: string }
  | { kind: 'url'; href: string }

export type BasicBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'checklist'; items: Array<{ checked: boolean; text: string }> }
  | { kind: 'quote'; text: string }
  | { kind: 'h'; level: 2 | 3 | 4; text: string }

