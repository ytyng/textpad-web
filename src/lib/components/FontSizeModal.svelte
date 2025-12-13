<script lang="ts">
  import { onMount } from "svelte";
  import fontSizeStore from "$lib/stores/fontSize.svelte";

  interface Props {
    onclose: () => void;
  }

  let { onclose }: Props = $props();

  let dialog: HTMLDialogElement;

  const sizes = [
    { value: 16, label: "Small", description: "16px" },
    { value: 32, label: "Medium", description: "32px" },
    { value: 64, label: "Large", description: "64px" },
  ];

  onMount(() => {
    dialog.showModal();
  });

  const handleSelect = (size: number) => {
    fontSizeStore.setFontSize(size);
    dialog.close();
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === dialog) {
      dialog.close();
    }
  };
</script>

<dialog
  bind:this={dialog}
  class="m-auto rounded-lg bg-slate-800 p-0 backdrop:bg-black/50"
  onclick={handleBackdropClick}
  {onclose}
  data-annotate="dialog-font-size"
>
  <div class="flex flex-col p-4 w-72">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-medium text-slate-100">Font Size</h2>
      <button
        type="button"
        class="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
        onclick={() => dialog.close()}
        data-annotate="button-close-font-size"
        aria-label="Close"
      >
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <div class="flex flex-col gap-2">
      {#each sizes as size}
        <button
          type="button"
          class="flex items-center justify-between rounded px-4 py-3 gap-3 text-slate-100 transition-colors {fontSizeStore.fontSize ===
          size.value
            ? 'bg-blue-600 hover:bg-blue-500'
            : 'bg-slate-700 hover:bg-slate-600'}"
          onclick={() => handleSelect(size.value)}
          data-annotate="button-font-size-{size.value}"
        >
          <span class="text-lg">{size.label}</span>
          <span class="text-sm text-slate-300">{size.description}</span>
        </button>
      {/each}
    </div>
  </div>
</dialog>
