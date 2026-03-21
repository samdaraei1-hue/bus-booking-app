export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 8000,
  message = "Request timed out"
) {
  return await Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(message));
      }, timeoutMs);
    }),
  ]);
}
