const STORAGE_KEY = 'textpad-files';

export interface TextFile {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  return firstLine.substring(0, 20) || 'Untitled';
}

function loadFilesFromStorage(): TextFile[] {
  if (typeof localStorage === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

function saveFilesToStorage(files: TextFile[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

let files = $state<TextFile[]>([]);
let currentFileId = $state<string | null>(null);
let currentContent = $state('');
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

const initialize = () => {
  files = loadFilesFromStorage();
  if (files.length > 0) {
    const latestFile = files.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
    currentFileId = latestFile.id;
    currentContent = latestFile.content;
  }
};

const saveCurrentFile = () => {
  if (!currentFileId) {
    if (currentContent.trim() === '') return;
    const newFile: TextFile = {
      id: generateId(),
      title: extractTitle(currentContent),
      content: currentContent,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    files = [...files, newFile];
    currentFileId = newFile.id;
  } else {
    files = files.map((f) =>
      f.id === currentFileId
        ? { ...f, title: extractTitle(currentContent), content: currentContent, updatedAt: Date.now() }
        : f
    );
  }
  saveFilesToStorage(files);
};

const updateContent = (content: string) => {
  currentContent = content;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveCurrentFile();
  }, 1000);
};

const createNewFile = () => {
  saveCurrentFile();
  currentFileId = null;
  currentContent = '';
};

const openFile = (id: string) => {
  saveCurrentFile();
  const file = files.find((f) => f.id === id);
  if (file) {
    currentFileId = file.id;
    currentContent = file.content;
  }
};

const deleteFile = (id: string) => {
  files = files.filter((f) => f.id !== id);
  saveFilesToStorage(files);
  if (currentFileId === id) {
    if (files.length > 0) {
      const latestFile = files.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
      currentFileId = latestFile.id;
      currentContent = latestFile.content;
    } else {
      currentFileId = null;
      currentContent = '';
    }
  }
};

const setContent = (content: string) => {
  currentContent = content;
  saveCurrentFile();
};

export default {
  get files() {
    return files;
  },
  get currentFileId() {
    return currentFileId;
  },
  get currentContent() {
    return currentContent;
  },
  initialize,
  saveCurrentFile,
  updateContent,
  createNewFile,
  openFile,
  deleteFile,
  setContent
};
