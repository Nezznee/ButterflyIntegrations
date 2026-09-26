import {
    ButterflyEditorMessage,
    ButterflyHostMessageType, createButterflyEmbedUrl,
    parseButterflyEditorMessageEvent,
    postButterflyHostMessage,
    toDocumentBytes,
    toPostMessageBytes
// @ts-ignore
} from "@linwood/butterfly-integration-shared";
import {WebviewApi} from "../../api/types";

declare const webviewApi: WebviewApi;

let pendingDocument: number[] | null;

let previewResolver: ((value: string) => void) | null;

let butterflyOrigin: string;

const iframe = document.querySelector("#butterfly") as HTMLIFrameElement;

window.addEventListener('message', async (event: MessageEvent<unknown>) => {
    const parsed: ButterflyEditorMessage | null = parseButterflyEditorMessageEvent(event, butterflyOrigin, iframe?.contentWindow ?? null);
    if (!parsed) return;
    switch (parsed.type) {
        case 'getData':
            if (pendingDocument) {
                sendToButterfly('setData', pendingDocument);
                pendingDocument = null;
            }
            break;
        case 'exit':
            webviewApi.postMessage({type: 'exit'});
            break;
        case 'save':
            webviewApi.postMessage({
                type: 'save',
                data: toDocumentBytes(parsed.message),
                img: await retrievePreview() // calls 'render'
            });
            break;
        case 'renderSVG':
            previewResolver?.(parsed.message);
            previewResolver = null;
            break;
    }
});

async function retrievePreview(): Promise<string> {
    sendToButterfly('renderSVG', {});
    return new Promise<string>((resolve, reject) => {
        previewResolver = resolve;
        window.setTimeout(() => {
            if (previewResolver === resolve) {
                previewResolver = null;
                reject(new Error('Fetching preview timed out'));
            }
        }, 5000);
    });
}

webviewApi.onMessage((pluginMsg: any) => {
    switch (pluginMsg.message.type) {
        case 'setData':
            pendingDocument = toPostMessageBytes(pluginMsg.message.data);
            requestEmbedReadiness();
            break;
        case 'reset':
            sendToButterfly('reset');
            break;
        case 'config':
            butterflyOrigin = pluginMsg.message.origin;
            iframe.src = createButterflyEmbedUrl(butterflyOrigin + '/embed', window.location.href, {
                save: true,
                language: pluginMsg.message.language
            });
            break;
    }
});

function sendToButterfly(type: ButterflyHostMessageType, message?: unknown) {
    postButterflyHostMessage(iframe?.contentWindow ?? null, butterflyOrigin, type, message)
}

// start: readinessHandshake
let readinessTimer: number | undefined;
let readinessAttempts = 0;

function stopReadinessHandshake() {
    if (readinessTimer !== undefined) {
        window.clearTimeout(readinessTimer)
        readinessTimer = undefined;
    }
}

function requestEmbedReadiness() {
    stopReadinessHandshake()
    if (!pendingDocument) return;
    if (readinessAttempts >= 60) {
        pendingDocument = null;
        webviewApi.postMessage({type: 'embedNotReady'});
        readinessAttempts = 0;
        return;
    }
    readinessAttempts += 1
    sendToButterfly('getData')
    readinessTimer = window.setTimeout(requestEmbedReadiness, 500)
}

// end: readinessHandshake

webviewApi.postMessage({type: 'panelReady'});