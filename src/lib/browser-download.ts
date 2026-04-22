const OBJECT_URL_CLEANUP_DELAY_MS = 1000;

export function triggerBlobDownload(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();

    window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
        anchor.remove();
    }, OBJECT_URL_CLEANUP_DELAY_MS);
}

export function getDownloadFileName(
    contentDisposition: string | null,
    fallbackFileName: string
) {
    if (!contentDisposition) {
        return fallbackFileName;
    }

    const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = contentDisposition.match(/filename\s*=\s*"?(.*?)"?(?:;|$)/i);
    if (plainMatch?.[1]) {
        return decodeURIComponent(plainMatch[1]);
    }

    return fallbackFileName;
}
