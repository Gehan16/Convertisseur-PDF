// Initialisation de jsPDF
const { jsPDF } = window.jspdf;

// Initialisation de pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

// Éléments pour le texte
const textInput = document.getElementById('textInput');
const textConvertBtn = document.getElementById('textConvertBtn');

// Éléments pour les images
const imageDropZone = document.getElementById('image-drop-zone');
const imageFileInput = document.getElementById('imageFileInput');
const imageThumbContainer = document.getElementById('image-thumbnail-container');
const imagesConvertBtn = document.getElementById('imagesConvertBtn');

// Éléments pour les PDF
const pdfDropZone = document.getElementById('pdf-drop-zone');
const pdfFileInput = document.getElementById('pdfFileInput');
const pdfFileContainer = document.getElementById('pdf-file-container');
const mergePdfBtn = document.getElementById('mergePdfBtn');
const pdfErrorMessage = document.getElementById('pdfErrorMessage');

// Tableaux pour stocker les données
let imagesData = [];
let pdfFiles = [];

// --- Fonctions communes pour le Glisser-Déposer ---
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

// --- Conversion des images en PDF ---
imagesConvertBtn.addEventListener('click', function() {
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

// --- Fusion des PDF avec pdf.js et jsPDF ---
async function mergePDFs() {
    if (pdfFiles.length < 2) return;

    mergePdfBtn.disabled = true;
    mergePdfBtn.textContent = 'Fusion en cours...';
    pdfErrorMessage.classList.remove('show');

    try {
        const mergedPdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        let isFirstPage = true;

        for (const file of pdfFiles) {
            const pdfData = await readPDFAsDataURL(file);
            const pdf = await pdfjsLib.getDocument(pdfData).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const scale = 2.0;
                const viewport = page.getViewport({ scale: scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                const imgData = canvas.toDataURL('image/png');

                if (!isFirstPage) {
                    mergedPdf.addPage('a4', 'portrait');
                } else {
                    isFirstPage = false;
                }

                const pageWidth = mergedPdf.internal.pageSize.getWidth();
                const pageHeight = mergedPdf.internal.pageSize.getHeight();
                mergedPdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
            }
        }

        mergedPdf.save('pdf-fusionne.pdf');
    } catch (error) {
        console.error('Erreur lors de la fusion des PDF :', error);
        pdfErrorMessage.textContent = 'Erreur lors de la fusion : ' + error.message;
        pdfErrorMessage.classList.add('show');
    } finally {
        mergePdfBtn.disabled = false;
        updateMergePdfButtonState();
    }
}

// Fonction pour lire un PDF comme DataURL
function readPDFAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// --- Conversion du texte en PDF ---
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

// Initialisation des zones de dépôt
setupDropZone(imageDropZone, imageFileInput, handleImageFiles);
setupDropZone(pdfDropZone, pdfFileInput, handlePDFFiles);
