<script lang="ts">
  import { toast } from "svelte-sonner";

  let clearing = $state(false);

  const clearCacheAndReload = () => {
    if (!navigator.serviceWorker.controller) {
      toast.error("Service Worker is not active");
      return;
    }

    clearing = true;

    const timeout = setTimeout(() => {
      clearing = false;
      toast.error("Cache clear timed out");
    }, 5000);

    navigator.serviceWorker.addEventListener(
      "message",
      (e) => {
        if (e.data?.type === "CACHE_CLEARED") {
          clearTimeout(timeout);
          toast.success("Cache cleared. Reloading...");
          setTimeout(() => {
            window.location.href = "/";
          }, 500);
        }
      },
      { once: true },
    );

    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" });
  };
</script>

<div class="flex flex-col text-slate-100">
  <header class="flex items-center gap-2 bg-slate-700 px-4 py-3">
    <a
      href="/"
      class="flex items-center gap-1 text-slate-300 hover:text-slate-100"
      data-annotate="link-back-home"
    >
      <i class="bi bi-chevron-left"></i>
      <h1 class="text-slate-100">About</h1>
    </a>
    <div class="flex-1"></div>
  </header>

  <main class="flex flex-col p-4 gap-8 max-w-screen-md mx-auto">
    <section>
      <h2 class="mb-2 text-lg font-medium">Textpad</h2>
      <p class="text-sm text-slate-300">
        Textpad is a simple text editor that works offline. Your text is
        automatically saved to your device's local storage.
      </p>
    </section>

    <section>
      <h2 class="mb-4 text-lg font-medium">Settings</h2>

      <div class="flex flex-col gap-3">
        <button
          type="button"
          class="flex items-center gap-3 rounded bg-slate-700 px-4 py-3 text-left hover:bg-slate-600 disabled:opacity-50"
          onclick={clearCacheAndReload}
          disabled={clearing}
          data-annotate="button-clear-cache"
        >
          <i class="bi bi-arrow-clockwise text-xl"></i>
          <div>
            <div class="font-medium">Clear Cache</div>
            <div class="text-xs text-slate-400">
              Clear cached files and reload the app
            </div>
          </div>
        </button>
      </div>
    </section>
  </main>
</div>
