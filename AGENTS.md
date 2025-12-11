# AI Agent Q‹z¬¤É

Sn×í¸§¯Èo SvelteKit 2 + Svelte 5 (runes) gËÉUŒfD‹

## ‹zBnè

Svelte 5 h SvelteKit oÔ„°WDÕìüàïü¯n_‹zBo context7 MCP ’(WfÉ­åáóÈ’ÂgY‹Sh

## €S¹¿Ã¯

- SvelteKit 2 + Svelte 5 (runes: $state, $derived ji)
- Tailwind CSS 4
- TypeScript
- adapter-static (SSG)

## Store nøM¹

Svelte 5 n Store o `src/lib/stores/xxx.svelte.ts` kMnY‹
runes ’(W_ånÑ¿üógğY‹:

```ts
let value = $state(initialValue);

const updateValue = (newValue) => {
  value = newValue;
};

export default {
  get value() {
    return value;
  },
  updateValue,
};
```

## SSG -š

Sn×í¸§¯Èo adapter-static g SSG ÓëÉY‹
°WDÚü¸’ı Y‹›o`src/routes/+layout.ts` g `export const prerender = true` L-šUŒfD‹_êÕ„k prerender UŒ‹

## Vercel Ç×í¤

GitHub k×Ã·åY‹h Vercel gêÕÓëÉUŒ‹
-šo `vercel.json` kB‹

## E2E Æ¹È

æü¶ü¢¯·çó’×QÖ‹ ko `data-annotate` ^'’ØQ‹:
- Ü¿ó: `data-annotate="button-xxx"`
- êó¯: `data-annotate="link-xxx"`
- e›: `data-annotate="input-xxx"`

## ³ŞóÉ

```bash
pnpm dev      # ‹zµüĞü
pnpm check    # ‹Á§Ã¯
pnpm build    # ÓëÉ
pnpm preview  # ÓëÉPœ×ìÓåü
```
