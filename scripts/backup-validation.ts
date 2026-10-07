export function validateAttachmentBackup(attachments: readonly { key: string; size: number }[], files: ReadonlyMap<string, number>): void {
  for (const attachment of attachments) {
    const size = files.get(attachment.key);
    if (size === undefined) throw new Error("Backup attachment missing: " + attachment.key);
    if (size !== attachment.size) throw new Error("Backup attachment size mismatch: " + attachment.key);
  }
}
