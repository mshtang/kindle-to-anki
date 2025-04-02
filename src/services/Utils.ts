function rnd(n: number): number {
  return Math.floor(Math.random() * n);
}

export function shuffle<T>(arr: T[]): T[] {
  const len = arr.length;
  for (let i = len - 1; i >= 0; i--) {
    let j = rnd(len);
    [ arr[i], arr[j] ] = [ arr[j], arr[i] ];
  }
  return arr;
}

export function randomItem<T>(arr: T[]): T {
  return arr[rnd(arr.length)];
}

export function escapeRegexp(text: string): string {
  return text
    .replace(/\]/g, '\\]')
    .replace(/\^/g, '\\^')
    .replace(/-/g, '\\-')
    .replace(/./g, '[$&]')
}