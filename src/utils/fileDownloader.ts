// Reliable Cross-Platform File Downloader Utility
// Handles UTF-8 BOM encoding for Excel, DOM element attachment for Mac/Safari,
// and blob URL lifecycle management.

/**
 * Downloads a Blob reliably across all browsers (including Safari, macOS Chrome, iOS, Android)
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.setAttribute('download', filename);

  // Required for Safari / macOS Chrome to recognize the download trigger
  document.body.appendChild(link);
  link.click();

  // Cleanup DOM and release object memory URL
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    } catch {
      // Ignore cleanup error
    }
  }, 300);
}

/**
 * Generates and downloads a CSV file with UTF-8 BOM so Microsoft Excel and Numbers
 * display all accents, currency symbols, and commas correctly.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  // UTF-8 BOM (\uFEFF) ensures Excel opens without character corruption
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}
