import { PROCESSED_MATCHES_STORAGE_KEY, ProcessedMatch } from "./storage";

// https://github.com/leetify/leetify-gcpd-upload/blob/main/src/helpers/defer.ts
export function defer<T>() {
  let res: (v: T | PromiseLike<T>) => void;
  let rej: (err?: unknown) => void;

  const promise: Promise<T> & {
    resolve: (v: T | PromiseLike<T>) => void;
    reject: (err?: unknown) => void;
  } = new Promise<T>((resolve, reject) => {
    res = resolve;
    rej = reject;
  }) as any;

  promise["resolve"] = res!;
  promise["reject"] = rej!;

  return promise;
}

export async function getProcessedDemos() {
  const { [PROCESSED_MATCHES_STORAGE_KEY]: processedDemos } =
    (await chrome.storage.local.get(PROCESSED_MATCHES_STORAGE_KEY)) as {
      [PROCESSED_MATCHES_STORAGE_KEY]?: ProcessedMatch[];
    };

  return processedDemos ?? [];
}
