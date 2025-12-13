<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import textpadStore from "$lib/stores/textpad.svelte";
  import fontSizeStore from "$lib/stores/fontSize.svelte";
  import { toast } from "svelte-sonner";
  import QrCreateModal from "$lib/components/QrCreateModal.svelte";
  import QrScanModal from "$lib/components/QrScanModal.svelte";
  import FontSizeModal from "$lib/components/FontSizeModal.svelte";

  let showQrCreate = $state(false);
  let showQrScan = $state(false);
  let showFontSize = $state(false);
  let textareaElement: HTMLTextAreaElement;
  let containerElement: HTMLDivElement;

  // iOS キーボード表示時のスクロール防止
  const preventScroll = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleFocus = () => {
    // focus 時に少し遅延してスクロールをリセット (iOS がスクロールした後に実行)
    setTimeout(preventScroll, 50);
    setTimeout(preventScroll, 100);
    setTimeout(preventScroll, 300);
  };

  onMount(() => {
    textareaElement?.focus();

    // visualViewport API でビューポート変化を監視
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", preventScroll);
      window.visualViewport.addEventListener("scroll", preventScroll);
    }

    // 通常のスクロールイベントも監視
    window.addEventListener("scroll", preventScroll, { passive: false });
    document.addEventListener("scroll", preventScroll, { passive: false });

    // タッチ移動によるスクロールを防止 (textarea 内は除外)
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
  });

  onDestroy(() => {
    if (typeof window !== "undefined") {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", preventScroll);
        window.visualViewport.removeEventListener("scroll", preventScroll);
      }
      window.removeEventListener("scroll", preventScroll);
      document.removeEventListener("scroll", preventScroll);
      document.removeEventListener("touchmove", handleTouchMove);
    }
  });

  const handleTouchMove = (e: TouchEvent) => {
    // textarea 内のスクロールは許可
    if (e.target instanceof HTMLTextAreaElement) {
      return;
    }
    // それ以外はスクロール防止
    e.preventDefault();
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    textpadStore.updateContent(target.value);
  };

  const handleNewFile = () => {
    textpadStore.createNewFile();
    toast.success("New file created");
  };

  const handleScanned = (data: string) => {
    textpadStore.setContent(data);
  };
</script>

<!-- テキストエリアの高さはキーボード表示時に隠れないサイズに固定 -->
<div
  bind:this={containerElement}
  class="flex h-[max(45vh,calc(100vh-450px))] flex-col"
>
  <header class="flex items-center gap-1 bg-slate-700 px-2 py-1 text-slate-100">
    <button
      type="button"
      class="flex flex-col items-center rounded px-2 py-1 hover:bg-slate-600"
      onclick={handleNewFile}
      data-annotate="button-new-file"
    >
      <i class="bi bi-file-plus text-lg"></i>
      <span class="text-[10px]">New</span>
    </button>
    <a
      href="/files"
      class="flex flex-col items-center rounded px-2 py-1 hover:bg-slate-600"
      data-annotate="link-file-list"
    >
      <i class="bi bi-folder2-open text-lg"></i>
      <span class="text-[10px]">Files</span>
    </a>
    <button
      type="button"
      class="flex flex-col items-center rounded px-2 py-1 hover:bg-slate-600"
      onclick={() => (showQrScan = true)}
      data-annotate="button-qr-scan"
    >
      <i class="bi bi-qr-code-scan text-lg"></i>
      <span class="text-[10px]">Scan</span>
    </button>
    <button
      type="button"
      class="flex flex-col items-center rounded px-2 py-1 hover:bg-slate-600"
      onclick={() => (showQrCreate = true)}
      data-annotate="button-qr-create"
    >
      <i class="bi bi-qr-code text-lg"></i>
      <span class="text-[10px]">Create</span>
    </button>
    <button
      type="button"
      class="flex flex-col items-center rounded px-2 py-1 hover:bg-slate-600"
      onclick={() => (showFontSize = true)}
      data-annotate="button-font-size"
    >
      <i class="bi bi-fonts text-lg"></i>
      <span class="text-[10px]">Font</span>
    </button>

    <div class="flex-1"></div>
    <a
      href="/about"
      class="text-sm font-medium hover:text-slate-300 pe-1"
      data-annotate="link-about">Textpad</a
    >
  </header>

  <main class="flex-1 overflow-hidden">
    <textarea
      bind:this={textareaElement}
      class="h-full w-full resize-none bg-neutral-900 p-2 text-slate-100 outline-none font-mono"
      style="font-size: {fontSizeStore.fontSize}px"
      placeholder="Enter text here..."
      value={textpadStore.currentContent}
      oninput={handleInput}
      onfocus={handleFocus}
      data-annotate="textarea-main"
    ></textarea>
  </main>
</div>

{#if showQrCreate}
  <QrCreateModal
    content={textpadStore.currentContent}
    onclose={() => (showQrCreate = false)}
  />
{/if}

{#if showQrScan}
  <QrScanModal onscanned={handleScanned} onclose={() => (showQrScan = false)} />
{/if}

{#if showFontSize}
  <FontSizeModal onclose={() => (showFontSize = false)} />
{/if}
