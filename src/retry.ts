export interface RetryConfig {
  maxRetry?: number;
  baseDelayMs?: number;
  onError?: (error: any, attempt: number, nextRetryTime: number) => void;
  onSuccess?: (result: any, attempt: number) => void;
  onMaxRetry?: (attempt: number) => void;
}

export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetry = Infinity,
    baseDelayMs = 1000,
    onError,
    onSuccess,
    onMaxRetry,
  } = config;

  let retries = 0;

  const attempt = async (): Promise<T> => {
    try {
      //console.log(`Retry attempt ${retries + 1} of ${maxRetry}`);

      const result = await fn();
      onSuccess && onSuccess(result, retries + 1);
      return result;
    } catch (error) {
      retries++;
      const delay = baseDelayMs * Math.pow(2, retries - 1);
      const jitter = Math.random() * delay * 0.2;
      const nextRetryTime = Date.now() + delay + jitter;

      onError && onError(error, retries, nextRetryTime);
      //console.error(`Retry attempt ${retries} failed:`, error);

      if (retries >= maxRetry) {
        onMaxRetry && onMaxRetry(retries);
        //console.error(`Max retries reached:`, error);
        throw error;
      }

      //const delay = baseDelayMs * Math.pow(2, retries - 1);
      //const jitter = Math.random() * delay * 0.2;
      // console.log(`Retrying in ${delay + jitter} ms`);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      return attempt();
    }
  };

  return attempt();
}
