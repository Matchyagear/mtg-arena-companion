/**
 * Floating card image preview on hover
 */
const preview = document.getElementById('card-preview');
const previewImg = document.getElementById('card-preview-img');
let hideTimeout = null;

export function initCardPreview() {
    document.addEventListener('mousemove', (e) => {
        if (preview.classList.contains('visible')) {
            positionPreview(e.clientX, e.clientY);
        }
    });
}

function positionPreview(x, y) {
    const W = 230;
    const H = 320;
    const margin = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x + 20;
    let top = y - H / 2;

    if (left + W > vw - margin) left = x - W - 20;
    if (top < margin) top = margin;
    if (top + H > vh - margin) top = vh - H - margin;

    preview.style.left = left + 'px';
    preview.style.top = top + 'px';
}

export function showCardPreview(imageUri, x, y) {
    if (!imageUri) return;
    clearTimeout(hideTimeout);
    previewImg.src = imageUri;
    preview.classList.add('visible');
    positionPreview(x, y);
}

export function hideCardPreview() {
    hideTimeout = setTimeout(() => {
        preview.classList.remove('visible');
    }, 80);
}

/**
 * Attach card preview listeners to an element
 * @param {HTMLElement} el - The element to attach to
 * @param {Function} getImageUri - Returns the image URI for this element
 */
export function attachPreview(el, getImageUri) {
    el.addEventListener('mouseenter', (e) => {
        const uri = getImageUri();
        if (uri) showCardPreview(uri, e.clientX, e.clientY);
    });
    el.addEventListener('mouseleave', hideCardPreview);
}
