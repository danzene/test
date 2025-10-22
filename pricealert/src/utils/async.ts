export function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

export async function firstSettled<T>(promises: Promise<T>[]): Promise<T> {
  // semelhante a Promise.any, porém aceita a primeira que resolve e ignora rejects
  return new Promise<T>((resolve, reject) => {
    let rejections = 0, total = promises.length;
    if (total === 0) {
      reject(new Error("no promises provided"));
      return;
    }
    for (const pr of promises) {
      pr.then(resolve).catch(() => { 
        if (++rejections === total) reject(new Error("all failed")); 
      });
    }
  });
}
