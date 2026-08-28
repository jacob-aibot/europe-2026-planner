/**
 * `FilePort` — a download and an `<input type=file>`.
 *
 * Not the File System Access API: `showSaveFilePicker` is Chromium-only and Safari supports
 * only the Origin Private File System (ARCHITECTURE §1.1). A download and a file input work
 * everywhere, which is what a trip you might need on a phone in Split requires.
 */
import type { FilePort } from '@cairn/client';

/** Impure: touches the DOM and starts a download. */
export function downloadFile(): FilePort {
  return {
    async exportDoc(name: string, bytes: Uint8Array): Promise<void> {
      const blob = new Blob([bytes as BlobPart], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke on the next frame: revoking synchronously cancels the download in Safari.
      requestAnimationFrame(() => URL.revokeObjectURL(url));
    },

    importDoc(): Promise<{ name: string; bytes: Uint8Array } | null> {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.style.display = 'none';
        document.body.appendChild(input);
        // `cancel` is not universally fired; the window focus fallback covers the rest.
        let settled = false;
        const done = (v: { name: string; bytes: Uint8Array } | null) => {
          if (settled) return;
          settled = true;
          input.remove();
          resolve(v);
        };
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return done(null);
          done({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
        };
        input.oncancel = () => done(null);
        input.click();
      });
    },
  };
}
