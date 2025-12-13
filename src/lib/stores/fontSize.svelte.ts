const STORAGE_KEY = "textpad-font-size";
const DEFAULT_SIZE = 16;

const loadFontSize = (): number => {
  if (typeof window === "undefined") return DEFAULT_SIZE;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_SIZE;
  const size = parseInt(stored, 10);
  if ([16, 32, 64].includes(size)) return size;
  return DEFAULT_SIZE;
};

let fontSize = $state(DEFAULT_SIZE);

// ブラウザ環境でのみ localStorage から読み込む
if (typeof window !== "undefined") {
  fontSize = loadFontSize();
}

const setFontSize = (size: number) => {
  fontSize = size;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(size));
  }
};

export default {
  get fontSize() {
    return fontSize;
  },
  setFontSize,
};
