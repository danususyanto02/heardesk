export async function cleanupSubmission(
  discard: () => Promise<void>,
  release: () => Promise<void>,
): Promise<void> {
  try {
    await discard();
  } finally {
    await release();
  }
}
