declare const webviewApi: { postMessage: (contentScriptId: string, message: any) => any; };

document.addEventListener('click', (event) => {
    handleInteraction(event);
});

document.addEventListener("keydown", (event) => {
    if (!(event.key === 'Enter' || event.key === ' ')) return;
    handleInteraction(event);
});

function handleInteraction(event: UIEvent) {
    const target: HTMLImageElement | null = (event.target as HTMLImageElement).closest('img[alt^="bfly@"]');
    if (!target) return;
    const documentIdMatcher = target.alt.match(/^bfly@([0-9a-f]{32})$/);
    if (!documentIdMatcher) return;
    const documentId = documentIdMatcher[1];
    const previewId = target.dataset.resourceId;
    if (!previewId) return;
    const message = {documentId, previewId};
    webviewApi.postMessage('butterfly-md', message);
}

const processImages = () => {
    const images = document.querySelectorAll<HTMLImageElement>('img[alt^="bfly@"]');
    for (const image of images) {
        if (!image.alt.match(/^bfly@([0-9a-f]{32})$/))
            continue;
        image.classList.add('butterfly-clickable-image');
        image.tabIndex = 0;
        image.role = 'button';
        image.title = 'Butterfly'; // ask plugin which title to use?
    }
};

document.addEventListener('joplin-noteDidUpdate', () => {
    processImages();
});

processImages();
