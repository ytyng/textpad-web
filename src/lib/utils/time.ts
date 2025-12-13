/**
 * 現在時刻との差を人間が読みやすい形式で返す
 */
export function humanReadableTime(timestampMS: number): string {
  const now = new Date().getTime();
  const diff = now - timestampMS;
  if (0 < diff) {
    return humanReadableTimePast(diff);
  } else {
    return humanReadableTimeFuture(diff);
  }
}

function humanReadableTimePast(diff: number): string {
  const sec = Math.floor(diff / 1000);
  if (sec < 5) {
    return 'Now';
  }
  if (sec < 120) {
    return `${sec} seconds ago`;
  }
  const min = Math.floor(sec / 60);
  if (min < 120) {
    return `${min} minutes ago`;
  }
  const hour = Math.floor(min / 60);
  if (hour < 48) {
    return `${hour} hours ago`;
  }
  const day = Math.floor(hour / 24);
  if (day < 60) {
    return `${day} days ago`;
  }
  const month = Math.floor(day / 30);
  if (month < 24) {
    return `${month} months ago`;
  }
  const year = Math.floor(day / 365);
  return `${year} years ago`;
}

function humanReadableTimeFuture(diff: number): string {
  const sec = Math.floor(-diff / 1000);
  if (sec < 5) {
    return 'Now';
  }
  if (sec < 120) {
    return `${sec} seconds later`;
  }
  const min = Math.floor(sec / 60);
  if (min < 120) {
    return `${min} minutes later`;
  }
  const hour = Math.floor(min / 60);
  if (hour < 48) {
    return `${hour} hours later`;
  }
  const day = Math.floor(hour / 24);
  if (day < 60) {
    return `${day} days later`;
  }
  const month = Math.floor(day / 30);
  if (month < 24) {
    return `${month} months later`;
  }
  const year = Math.floor(day / 365);
  return `${year} years later`;
}

/**
 * タイムスタンプを YYYY-MM-DD HH:MM 形式でフォーマット
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
