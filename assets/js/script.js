// Initialisation de jsPDF
const { jsPDF } = window.jspdf;

// Données
let imagesData = [];
let pdfFiles = [];

// Éléments DOM
const textInput = document.getElementById('textInput');
const textConvertBtn = document.getElementById('textConvertBtn');
const imageDropZone = document.getElementById('image-drop-zone');
const imageFileInput = document.getElementById('imageFileInput');
const imageThumbContainer = document.getElementById('image-thumbnail-container');
const imagesConvertBtn = document.getElementById('imagesConvertBtn');
const pdfDropZone = document.getElementById('pdf-drop-zone');
const pdfFileInput = document.getElementById('pdfFileInput');
const pdfFileContainer = document.getElementById('pdf-file-container');
const mergePdfBtn = document.getElementById('mergePdfBtn');
const pdfErrorMessage = document.getElementById('pdfErrorMessage');

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
    imagesConvertBtn.textContent = imagesData.length > 0
        ? `Télécharger le PDF (${imagesData.length} image${imagesData.length > 1 ? 's' : ''})`
        : 'Télécharger le PDF';
}

// --- Conversion Images → PDF ---
imagesConvertBtn.addEventListener('click', () => {
    if (imagesData.length === 0) return;

    const firstImg = imagesData[0];
    const doc = new jsPDF({
        orientation: firstImg.width > firstImg.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [firstImg.width, firstImg.height]
    });

    doc.addImage(firstImg, 'JPEG', 0, 0, firstImg.width, firstImg.height);

    for (let i = 1; i < imagesData.length; i++) {
        const img = imagesData[i];
        doc.addPage([img.width, img.height], img.width > img.height ? 'landscape' : 'portrait');
        doc.addImage(img, 'JPEG', 0, 0, img.width, img.height);
    }

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
    mergePdfBtn.textContent = pdfFiles.length >= 2
        ? `Fusionner ${pdfFiles.length} PDF`
        : 'Fusionner les PDF';
}

// --- Fusion de PDF ---
async function mergePDFs() {
    if (pdfFiles.length < 2) return;

    mergePdfBtn.disabled = true;
    mergePdfBtn.textContent = 'Fusion en cours...';
    pdfErrorMessage.classList.remove('show');

    try {
        // Attendre que pdfLib soit disponible (max 5 secondes)
        const startTime = Date.now();
        while (typeof pdfLib === 'undefined' && Date.now() - startTime < 5000) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (typeof pdfLib === 'undefined') {
            throw new Error("pdf-lib n'a pas pu se charger. Veuillez rafraîchir la page.");
        }

        // Fusionner les PDF
        const firstPdfBytes = await readFileAsArrayBuffer(pdfFiles[0]);
        let mergedPdf = await pdfLib.PDFDocument.load(firstPdfBytes);

        for (let i = 1; i < pdfFiles.length; i++) {
            const pdfBytes = await readFileAsArrayBuffer(pdfFiles[i]);
            const pdfDoc = await pdfLib.PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        downloadPdf(mergedPdfBytes, 'pdf-fusionne.pdf');

    } catch (error) {
        console.error('Erreur lors de la fusion des PDF :', error);
        pdfErrorMessage.textContent = 'Erreur lors de la fusion : ' + error.message;
        pdfErrorMessage.classList.add('show');
    } finally {
        mergePdfBtn.disabled = false;
        updateMergePdfButtonState();
    }
}

// --- Fonctions utilitaires ---
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Conversion Texte → PDF ---
function updateTextButtonState() {
    textConvertBtn.disabled = textInput.value.trim() === '';
}

function convertTextToPDF() {
    const text = textInput.value.trim();
    if (!text) return;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 10, { align: 'left' });
    doc.save('texte-converti.pdf');
}
