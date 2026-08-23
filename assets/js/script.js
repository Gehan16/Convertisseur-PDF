// Initialisation de jsPDF
const { jsPDF } = window.jspdf;

// Variables globales pour pdf.js
let pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

// Données
let imagesData = [];
let pdfFiles = [];

// Éléments DOM
const textInput = document.getElementById('textInput');
const textDownloadBtn = document.getElementById('textDownloadBtn');
const textSettingsBtn = document.getElementById('textSettingsBtn');
const imageDropZone = document.getElementById('image-drop-zone');
const imageFileInput = document.getElementById('imageFileInput');
const imageThumbContainer = document.getElementById('image-thumbnail-container');
const imagesConvertBtn = document.getElementById('imagesConvertBtn');
const imageSettingsBtn = document.getElementById('imageSettingsBtn');
const pdfDropZone = document.getElementById('pdf-drop-zone');
const pdfFileInput = document.getElementById('pdfFileInput');
const pdfFileContainer = document.getElementById('pdf-file-container');
const mergePdfBtn = document.getElementById('mergePdfBtn');
const pdfSettingsBtn = document.getElementById('pdfSettingsBtn');
const pdfErrorMessage = document.getElementById('pdfErrorMessage');

// Éléments pour les marges
const textMargins = document.getElementById('textMargins');
const textMarginTop = document.getElementById('textMarginTop');
const textMarginBottom = document.getElementById('textMarginBottom');
const textMarginLeft = document.getElementById('textMarginLeft');
const textMarginRight = document.getElementById('textMarginRight');

const imageMargins = document.getElementById('imageMargins');
const imageMarginTop = document.getElementById('imageMarginTop');
const imageMarginBottom = document.getElementById('imageMarginBottom');
const imageMarginLeft = document.getElementById('imageMarginLeft');
const imageMarginRight = document.getElementById('imageMarginRight');

const pdfMargins = document.getElementById('pdfMargins');
const pdfMarginTop = document.getElementById('pdfMarginTop');
const pdfMarginBottom = document.getElementById('pdfMarginBottom');
const pdfMarginLeft = document.getElementById('pdfMarginLeft');
const pdfMarginRight = document.getElementById('pdfMarginRight');

// Initialisation après chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    setupDropZone(imageDropZone, imageFileInput, handleImageFiles);
    setupDropZone(pdfDropZone, pdfFileInput, handlePDFFiles);
});

// --- Fonctions communes ---
function setupDropZone(dropZone, fileInput, handleFilesCallback) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('dragover');
        handleFilesCallback({ target: { files: e.dataTransfer.files } });
    });

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFilesCallback);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// --- Toggle pour les marges ---
function toggleTextMargins() {
    if (textMargins.style.display === 'none') {
        textMargins.style.display = 'block';
        textSettingsBtn.textContent = '✅ Valider';
    } else {
        textMargins.style.display = 'none';
        textSettingsBtn.textContent = '⚙️ Paramètres';
    }
}

function toggleImageMargins() {
    if (imageMargins.style.display === 'none') {
        imageMargins.style.display = 'block';
        imageSettingsBtn.textContent = '✅ Valider';
    } else {
        imageMargins.style.display = 'none';
        imageSettingsBtn.textContent = '⚙️ Paramètres';
    }
}

function togglePdfMargins() {
    if (pdfMargins.style.display === 'none') {
        pdfMargins.style.display = 'block';
        pdfSettingsBtn.textContent = '✅ Valider';
    } else {
        pdfMargins.style.display = 'none';
        pdfSettingsBtn.textContent = '⚙️ Paramètres';
    }
}

// --- Gestion des Images ---
function handleImageFiles(e) {
    const files = [...e.target.files];
    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                imagesData.push(img);
                createImageThumbnail(img, imagesData.length - 1);
                updateImagesButtonState();
            };
        };
        reader.readAsDataURL(file);
    });
    imageFileInput.value = '';
}

function createImageThumbnail(imgObj, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'file-wrapper';

    const img = document.createElement('img');
    img.src = imgObj.src;

    const btn = document.createElement('button');
    btn.className = 'remove-btn';
    btn.innerHTML = '&times;';
    btn.onclick = (e) => {
        e.stopPropagation();
        removeImage(index, wrapper);
    };

    wrapper.appendChild(img);
    wrapper.appendChild(btn);
    imageThumbContainer.appendChild(wrapper);
}

function removeImage(index, element) {
    imagesData.splice(index, 1);
    element.remove();
    imageThumbContainer.innerHTML = '';
    imagesData.forEach((img, i) => createImageThumbnail(img, i));
    updateImagesButtonState();
}

function updateImagesButtonState() {
    imagesConvertBtn.disabled = imagesData.length === 0;
}

// --- Conversion Images → PDF (avec marges) ---
imagesConvertBtn.addEventListener('click', function() {
    if (imagesData.length === 0) return;

    const marginTop = parseFloat(imageMarginTop.value);
    const marginBottom = parseFloat(imageMarginBottom.value);
    const marginLeft = parseFloat(imageMarginLeft.value);
    const marginRight = parseFloat(imageMarginRight.value);

    // Taille standard A4 en mm
    const a4Width = 210;
    const a4Height = 297;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const availableWidth = pageWidth - marginLeft - marginRight;
    const availableHeight = pageHeight - marginTop - marginBottom;

    // Fonction pour ajouter une image en respectant son rapport d'aspect
    function addImageWithAspectRatio(doc, img, margins) {
        const aspectRatio = img.width / img.height;
        const orientation = img.width > img.height ? 'landscape' : 'portrait';

        // Créer une nouvelle page avec l'orientation adaptée
        if (doc.internal.getNumberOfPages() > 1) {
            const newPageWidth = orientation === 'landscape' ? a4Height : a4Width;
            const newPageHeight = orientation === 'landscape' ? a4Width : a4Height;
            doc.addPage([newPageWidth, newPageHeight], orientation);
        }

        const currentPageWidth = doc.internal.pageSize.getWidth();
        const currentPageHeight = doc.internal.pageSize.getHeight();
        const maxWidth = currentPageWidth - margins.left - margins.right;
        const maxHeight = currentPageHeight - margins.top - margins.bottom;

        // Calculer les dimensions en respectant le rapport d'aspect
        let finalWidth = maxWidth;
        let finalHeight = maxWidth / aspectRatio;

        if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = finalHeight * aspectRatio;
        }

        // Centrer l'image
        const x = margins.left + (maxWidth - finalWidth) / 2;
        const y = margins.top + (maxHeight - finalHeight) / 2;

        doc.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
    }

    // Ajouter toutes les images
    imagesData.forEach((img, index) => {
        if (index > 0) {
            doc.addPage();
        }
        addImageWithAspectRatio(doc, img, {
            top: marginTop,
            bottom: marginBottom,
            left: marginLeft,
            right: marginRight
        });
    });

    doc.save('album-photos.pdf');
});

// --- Gestion des PDF ---
function handlePDFFiles(e) {
    const files = [...e.target.files];
    files.forEach(file => {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return;
        pdfFiles.push(file);
        createPDFThumbnail(file, pdfFiles.length - 1);
        updateMergePdfButtonState();
    });
    pdfFileInput.value = '';
}

function createPDFThumbnail(file, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'file-wrapper';

    const icon = document.createElement('div');
    icon.className = 'pdf-icon';

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name.length > 12 ? file.name.substring(0, 10) + '...' : file.name;

    const btn = document.createElement('button');
    btn.className = 'remove-btn';
    btn.innerHTML = '&times;';
    btn.onclick = (e) => {
        e.stopPropagation();
        removePDF(index, wrapper);
    };

    wrapper.appendChild(icon);
    wrapper.appendChild(name);
    wrapper.appendChild(btn);
    pdfFileContainer.appendChild(wrapper);
}

function removePDF(index, element) {
    pdfFiles.splice(index, 1);
    element.remove();
    pdfFileContainer.innerHTML = '';
    pdfFiles.forEach((file, i) => createPDFThumbnail(file, i));
    updateMergePdfButtonState();
}

function updateMergePdfButtonState() {
    mergePdfBtn.disabled = pdfFiles.length < 2;
}

// --- Fusion de PDF (avec marges et qualité d'image corrigée) ---
async function mergePDFs() {
    if (pdfFiles.length < 2) return;

    mergePdfBtn.disabled = true;
    mergePdfBtn.textContent = 'Fusion en cours...';
    pdfErrorMessage.classList.remove('show');

    try {
        // Récupérer les marges
        const marginTop = parseFloat(pdfMarginTop.value);
        const marginBottom = parseFloat(pdfMarginBottom.value);
        const marginLeft = parseFloat(pdfMarginLeft.value);
        const marginRight = parseFloat(pdfMarginRight.value);

        // Taille d'une page A4 en mm
        const pageWidth = 210;
        const pageHeight = 297;
        const usableWidth = pageWidth - marginLeft - marginRight;
        const usableHeight = pageHeight - marginTop - marginBottom;

        // Créer un nouveau PDF avec jsPDF
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Traiter chaque PDF
        for (let i = 0; i < pdfFiles.length; i++) {
            const file = pdfFiles[i];
            const fileURL = URL.createObjectURL(file);
            const pdf = await pdfjsLib.getDocument({ url: fileURL }).promise;

            for (let j = 1; j <= pdf.numPages; j++) {
                const page = await pdf.getPage(j);
                // Utiliser un scale plus élevé pour une meilleure qualité
                const scale = 2.0;
                const viewport = page.getViewport({ scale: scale });

                // Créer un canvas pour rendre la page
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Ajouter l'image au PDF avec les marges
                if (i === 0 && j === 1) {
                    doc.addImage(canvas, 'PNG', marginLeft, marginTop, usableWidth, usableHeight);
                } else {
                    doc.addPage();
                    doc.addImage(canvas, 'PNG', marginLeft, marginTop, usableWidth, usableHeight);
                }
            }
            URL.revokeObjectURL(fileURL);
        }

        doc.save('pdf-fusionne.pdf');

    } catch (error) {
        console.error('Erreur lors de la fusion des PDF :', error);
        pdfErrorMessage.textContent = 'Erreur lors de la fusion : ' + error.message;
        pdfErrorMessage.classList.add('show');
    } finally {
        mergePdfBtn.disabled = false;
        mergePdfBtn.textContent = 'Fusionner les PDF';
        updateMergePdfButtonState();
    }
}

// --- Conversion Texte → PDF (avec marges) ---
function updateTextButtonState() {
    textDownloadBtn.disabled = textInput.value.trim() === '';
}

function convertTextToPDF() {
    const text = textInput.value.trim();
    if (!text) return;

    const marginTop = parseFloat(textMarginTop.value);
    const marginBottom = parseFloat(textMarginBottom.value);
    const marginLeft = parseFloat(textMarginLeft.value);
    const marginRight = parseFloat(textMarginRight.value);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const maxWidth = doc.internal.pageSize.getWidth() - marginLeft - marginRight;
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, marginLeft, marginTop, { align: 'left' });

    doc.save('texte-converti.pdf');
}
