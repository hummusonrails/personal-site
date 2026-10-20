/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';
  export const gfm: TurndownService.Plugin;
}
