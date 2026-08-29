/**
 * Convertisseur PDF - Application 100% locale
 * Convertit du texte, des images en PDF et fusionne des PDF
 * sans aucun upload de données vers des serveurs externes.
 */

// ============================================================================
// INITIALISATION
// ============================================================================

// Initialisation de jsPDF
const { jsPDF } = window.jspdf;

// Initialisation de pdf.js pour la fusion de PDF
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

// ============================================================================
// DONNÉES GLOBALES
// ============================================================================

/** @type {HTMLImageElement[]} */
let imagesData = [];

/** @type {File[]} */
let pdfFiles = [];

// ============================================================================
// CONSTANTES
// ============================================================================

/** Dimensions standard A4 en mm */
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

/** Facteur de conversion DPI vers mm (72 DPI = 25.4 mm par inch) */
const MM_PER_INCH = 25.4;
const DPI = 72;

// ============================================================================
// ÉLÉMENTS DOM
// ============================================================================

// Éléments pour le texte
const textEditor = document.getElementById('textEditor');
const textDownloadBtn = document.getElementById('textDownloadBtn');
const textSettingsBtn = document.getElementById('textSettingsBtn');

// Initialiser Quill
let quill;

// Éléments pour les images
const imageDropZone = document.getElementById('image-drop-zone');
const imageFileInput = document.getElementById('imageFileInput');
const imageThumbContainer = document.getElementById('image-thumbnail-container');
const imagesConvertBtn = document.getElementById('imagesConvertBtn');
const imageSettingsBtn = document.getElementById('imageSettingsBtn');

// Éléments pour les PDF
const pdfDropZone = document.getElementById('pdf-drop-zone');
const pdfFileInput = document.getElementById('pdfFileInput');
const pdfFileContainer = document.getElementById('pdf-file-container');
const mergePdfBtn = document.getElementById('mergePdfBtn');
const pdfSettingsBtn = document.getElementById('pdfSettingsBtn');
const pdfErrorMessage = document.getElementById('pdfErrorMessage');

// Éléments pour les marges (texte)
const textMargins = document.getElementById('textMargins');
const textMarginTop = document.getElementById('textMarginTop');
const textMarginBottom = document.getElementById('textMarginBottom');
const textMarginLeft = document.getElementById('textMarginLeft');
const textMarginRight = document.getElementById('textMarginRight');

// Éléments pour les marges (images)
const imageMargins = document.getElementById('imageMargins');
const imageMarginTop = document.getElementById('imageMarginTop');
const imageMarginBottom = document.getElementById('imageMarginBottom');
const imageMarginLeft = document.getElementById('imageMarginLeft');
const imageMarginRight = document.getElementById('imageMarginRight');

// Option pour étirer les images
const stretchImagesCheckbox = document.getElementById('stretchImages');

// Éléments pour les marges (PDF)
const pdfMargins = document.getElementById('pdfMargins');
const pdfMarginTop = document.getElementById('pdfMarginTop');
const pdfMarginBottom = document.getElementById('pdfMarginBottom');
const pdfMarginLeft = document.getElementById('pdfMarginLeft');
const pdfMarginRight = document.getElementById('pdfMarginRight');

// ============================================================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser Quill
    quill = new Quill('#textEditor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'align': [] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'color': ['#000000', '#0000FF', '#008000', '#FF0000'] }]
            ],
            clipboard: {
                // Autoriser le collage avec mise en forme
                matchers: []
            }
        },
        placeholder: 'Saisissez votre texte ici...'
    });
    
    // Mettre à jour l'état du bouton quand le contenu change
    quill.on('text-change', function() {
        textDownloadBtn.disabled = quill.getLength() <= 1; // 1 = juste le saut de ligne
    });
    
    // Modifier le bouton pour qu'il soit async
    textDownloadBtn.onclick = convertTextToPDF;
    
    // Configuration des zones de dépôt
    setupDropZone(imageDropZone, imageFileInput, handleImageFiles);
    setupDropZone(pdfDropZone, pdfFileInput, handlePDFFiles);
});

// ============================================================================
// FONCTIONS UTILITAIRES COMMUNES
// ============================================================================

/**
 * Empêche les comportements par défaut du drag & drop
 * @param {Event} e - L'événement à prévenir
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Configure une zone de dépôt pour le drag & drop de fichiers
 * @param {HTMLElement} dropZone - La zone de dépôt
 * @param {HTMLElement} fileInput - L'input file associé
 * @param {Function} handleFilesCallback - Callback pour gérer les fichiers
 */
function setupDropZone(dropZone, fileInput, handleFilesCallback) {
    // Empêcher les comportements par défaut
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    // Gestion des styles pendant le drag
    dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    // Gestion du drop
    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('dragover');
        handleFilesCallback({ target: { files: e.dataTransfer.files } });
    });

    // Gestion du clic sur la zone
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFilesCallback);
}

// ============================================================================
// FONCTIONS DE TOGGLE POUR LES MARGES
// ============================================================================

/**
 * Bascule l'affichage des contrôles de marges
 * @param {HTMLElement} marginsElement - L'élément contenant les contrôles de marges
 * @param {HTMLElement} buttonElement - Le bouton à mettre à jour
 * @param {string} defaultText - Texte du bouton en mode paramètres
 * @param {string} validationText - Texte du bouton en mode validation
 */
function toggleMargins(marginsElement, buttonElement, defaultText, validationText) {
    if (marginsElement.style.display === 'none') {
        marginsElement.style.display = 'block';
        buttonElement.textContent = validationText;
    } else {
        marginsElement.style.display = 'none';
        buttonElement.textContent = defaultText;
    }
}

// Handlers spécifiques pour chaque type de conversion
function toggleTextMargins() {
    toggleMargins(textMargins, textSettingsBtn, '🛠️ Paramètres', '✅ Valider');
}

function toggleImageMargins() {
    toggleMargins(imageMargins, imageSettingsBtn, '🛠️ Paramètres', '✅ Valider');
}

function togglePdfMargins() {
    toggleMargins(pdfMargins, pdfSettingsBtn, '🛠️ Paramètres', '✅ Valider');
}

// ============================================================================
// GESTION DES IMAGES
// ============================================================================

/**
 * Gère les fichiers images sélectionnés ou déposés
 * @param {Event} e - L'événement contenant les fichiers
 */
function handleImageFiles(e) {
    const files = [...e.target.files];
    
    files.forEach(file => {
        // Vérifier que le fichier est une image
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
    
    // Réinitialiser l'input pour permettre la sélection des mêmes fichiers
    imageFileInput.value = '';
}

/**
 * Crée une miniature d'image dans l'interface
 * @param {HTMLImageElement} imgObj - L'image à afficher
 * @param {number} index - L'index de l'image dans imagesData
 */
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

/**
 * Supprime une image de la liste
 * @param {number} index - L'index de l'image à supprimer
 * @param {HTMLElement} element - L'élément DOM à supprimer
 */
function removeImage(index, element) {
    imagesData.splice(index, 1);
    element.remove();
    
    // Reconstruire la liste des miniatures avec les nouveaux index
    imageThumbContainer.innerHTML = '';
    imagesData.forEach((img, i) => createImageThumbnail(img, i));
    updateImagesButtonState();
}

/**
 * Met à jour l'état du bouton de conversion d'images
 */
function updateImagesButtonState() {
    imagesConvertBtn.disabled = imagesData.length === 0;
}

// ============================================================================
// CONVERSION IMAGES → PDF
// ============================================================================

/**
 * Ajoute une image au PDF en respectant son rapport d'aspect
 * @param {jsPDF} doc - Le document PDF
 * @param {HTMLImageElement} img - L'image à ajouter
 * @param {Object} margins - Les marges à appliquer (top, bottom, left, right)
 */
function addImageWithAspectRatio(doc, img, margins) {
    const aspectRatio = img.width / img.height;
    const currentPageWidth = doc.internal.pageSize.getWidth();
    const currentPageHeight = doc.internal.pageSize.getHeight();
    
    // Calculer l'espace disponible
    const maxWidth = currentPageWidth - margins.left - margins.right;
    const maxHeight = currentPageHeight - margins.top - margins.bottom;

    // Calculer les dimensions finales en respectant le rapport d'aspect
    let finalWidth = maxWidth;
    let finalHeight = maxWidth / aspectRatio;

    // Si trop haut, ajuster en fonction de la hauteur
    if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = finalHeight * aspectRatio;
    }

    // Centrer l'image dans l'espace disponible
    const x = margins.left + (maxWidth - finalWidth) / 2;
    const y = margins.top + (maxHeight - finalHeight) / 2;

    doc.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
}

/**
 * Convertit les images sélectionnées en PDF
 */
function convertImagesToPDF() {
    if (imagesData.length === 0) return;

    // Récupérer les marges
    const marginTop = parseFloat(imageMarginTop.value);
    const marginBottom = parseFloat(imageMarginBottom.value);
    const marginLeft = parseFloat(imageMarginLeft.value);
    const marginRight = parseFloat(imageMarginRight.value);

    // Créer le document PDF avec une première page A4 portrait
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Vérifier si l'utilisateur veut étirer les images
    const stretchImages = stretchImagesCheckbox ? stretchImagesCheckbox.checked : false;

    // Ajouter toutes les images
    imagesData.forEach((img, index) => {
        // Pour chaque image sauf la première, créer une nouvelle page
        if (index > 0) {
            const orientation = img.width > img.height ? 'landscape' : 'portrait';
            const newPageWidth = orientation === 'landscape' ? A4_HEIGHT : A4_WIDTH;
            const newPageHeight = orientation === 'landscape' ? A4_WIDTH : A4_HEIGHT;
            doc.addPage([newPageWidth, newPageHeight], orientation);
        }
        
        if (stretchImages) {
            // Mode étiré : l'image remplit toute la page (moins les marges)
            const currentPageWidth = doc.internal.pageSize.getWidth();
            const currentPageHeight = doc.internal.pageSize.getHeight();
            const imgWidth = currentPageWidth - marginLeft - marginRight;
            const imgHeight = currentPageHeight - marginTop - marginBottom;
            doc.addImage(img, 'JPEG', marginLeft, marginTop, imgWidth, imgHeight);
        } else {
            // Mode normal : respect du rapport d'aspect
            addImageWithAspectRatio(doc, img, {
                top: marginTop,
                bottom: marginBottom,
                left: marginLeft,
                right: marginRight
            });
        }
    });

    doc.save('album-photos.pdf');
}

// Attacher l'événement au bouton
imagesConvertBtn.addEventListener('click', convertImagesToPDF);

// ============================================================================
// GESTION DES PDF
// ============================================================================

/**
 * Gère les fichiers PDF sélectionnés ou déposés
 * @param {Event} e - L'événement contenant les fichiers
 */
function handlePDFFiles(e) {
    const files = [...e.target.files];
    
    files.forEach(file => {
        // Vérifier que le fichier est un PDF
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return;
        
        pdfFiles.push(file);
        createPDFThumbnail(file, pdfFiles.length - 1);
        updateMergePdfButtonState();
    });
    
    // Réinitialiser l'input
    pdfFileInput.value = '';
}

/**
 * Crée une miniature de PDF dans l'interface
 * @param {File} file - Le fichier PDF
 * @param {number} index - L'index du fichier dans pdfFiles
 */
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

/**
 * Supprime un PDF de la liste
 * @param {number} index - L'index du PDF à supprimer
 * @param {HTMLElement} element - L'élément DOM à supprimer
 */
function removePDF(index, element) {
    pdfFiles.splice(index, 1);
    element.remove();
    
    // Reconstruire la liste des miniatures
    pdfFileContainer.innerHTML = '';
    pdfFiles.forEach((file, i) => createPDFThumbnail(file, i));
    updateMergePdfButtonState();
}

/**
 * Met à jour l'état du bouton de fusion de PDF
 */
function updateMergePdfButtonState() {
    mergePdfBtn.disabled = pdfFiles.length < 2;
}

// ============================================================================
// FUSION DE PDF
// ============================================================================

/**
 * Fusionne les PDF sélectionnés en un seul fichier
 */
async function mergePDFs() {
    if (pdfFiles.length < 2) return;

    // Désactiver le bouton pendant le traitement
    mergePdfBtn.disabled = true;
    mergePdfBtn.textContent = 'Fusion en cours...';
    pdfErrorMessage.classList.remove('show');

    try {
        // Récupérer les marges
        const marginTop = parseFloat(pdfMarginTop.value);
        const marginBottom = parseFloat(pdfMarginBottom.value);
        const marginLeft = parseFloat(pdfMarginLeft.value);
        const marginRight = parseFloat(pdfMarginRight.value);

        // Créer un nouveau PDF avec jsPDF (première page A4 portrait par défaut)
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

            // Traiter chaque page du PDF
            for (let j = 1; j <= pdf.numPages; j++) {
                const page = await pdf.getPage(j);
                
                // Récupérer l'orientation et les dimensions de la page source
                const sourceViewport = page.getViewport({ scale: 1.0 });
                const isLandscape = sourceViewport.width > sourceViewport.height;
                const orientation = isLandscape ? 'landscape' : 'portrait';
                
                // Calculer les dimensions de la page en mm
                const sourceWidthMm = (sourceViewport.width / DPI) * MM_PER_INCH;
                const sourceHeightMm = (sourceViewport.height / DPI) * MM_PER_INCH;
                
                // Créer une nouvelle page avec les dimensions de la page source
                if (i === 0 && j === 1) {
                    // Première page : remplacer la page initiale si nécessaire
                    if (isLandscape) {
                        doc.deletePage(1);
                        doc.addPage([sourceHeightMm, sourceWidthMm], orientation);
                    }
                } else {
                    doc.addPage([
                        isLandscape ? sourceHeightMm : sourceWidthMm,
                        isLandscape ? sourceWidthMm : sourceHeightMm
                    ], orientation);
                }

                // Rendre la page sur un canvas avec un scale élevé pour la qualité
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

                // Ajouter l'image au PDF avec les marges
                const currentPageWidth = doc.internal.pageSize.getWidth();
                const currentPageHeight = doc.internal.pageSize.getHeight();
                const usableWidth = currentPageWidth - marginLeft - marginRight;
                const usableHeight = currentPageHeight - marginTop - marginBottom;
                
                doc.addImage(canvas, 'PNG', marginLeft, marginTop, usableWidth, usableHeight);
            }
            
            // Libérer l'URL objet
            URL.revokeObjectURL(fileURL);
        }

        doc.save('pdf-fusionne.pdf');

    } catch (error) {
        console.error('Erreur lors de la fusion des PDF :', error);
        pdfErrorMessage.textContent = 'Erreur lors de la fusion : ' + error.message;
        pdfErrorMessage.classList.add('show');
    } finally {
        // Réactiver le bouton
        mergePdfBtn.disabled = false;
        mergePdfBtn.textContent = 'Fusionner les PDF';
        updateMergePdfButtonState();
    }
}

// ============================================================================
// CONVERSION TEXTE → PDF
// ============================================================================

/**
 * Convertit le texte en PDF en passant par une image pour préserver la mise en forme
 * Utilise html2canvas pour capturer le contenu de Quill en image haute résolution
 */
async function convertTextToPDF() {
    const htmlContent = quill.root.innerHTML;
    if (!htmlContent || htmlContent === '<p><br></p>') {
        return;
    }

    // Sauvegarder le texte original du bouton et le désactiver
    const originalBtnText = textDownloadBtn.textContent;
    const originalBtnDisabled = textDownloadBtn.disabled;
    textDownloadBtn.disabled = true;
    textDownloadBtn.textContent = 'Conversion en cours...';

    try {
        // Récupérer les marges
        const marginTop = parseFloat(textMarginTop.value);
        const marginBottom = parseFloat(textMarginBottom.value);
        const marginLeft = parseFloat(textMarginLeft.value);
        const marginRight = parseFloat(textMarginRight.value);

        // Créer le document PDF avec compression d'images
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - marginLeft - marginRight;
        const contentHeight = pageHeight - marginTop - marginBottom;

        // Créer un conteneur temporaire pour le contenu
        // Utiliser les dimensions en pixels pour html2canvas
        const dpi = 72;
        const mmPerInch = 25.4;
        const scale = 1.5; // Facteur d'échelle pour haute résolution
        
        // Convertir les dimensions en pixels
        const contentWidthPx = (contentWidth / mmPerInch) * dpi * 1.5;
        const contentHeightPx = (contentHeight / mmPerInch) * dpi * 1.5;
        
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = `${contentWidthPx}px`;
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.padding = '0';
        tempContainer.style.boxSizing = 'border-box';
        tempContainer.style.overflow = 'visible';
        
        // Récupérer les styles réels de l'éditeur Quill et les agrandir
        const quillEditor = document.querySelector('#textEditor .ql-editor');
        const editorStyle = window.getComputedStyle(quillEditor);
        tempContainer.style.fontFamily = editorStyle.fontFamily || 'Inter, sans-serif';
        // Agrandir le texte de 144% (1.2 * 1.2)
        const originalFontSize = parseFloat(editorStyle.fontSize || '16px');
        tempContainer.style.fontSize = `${originalFontSize * 1.44}px`;
        // Augmenter légèrement l'interligne (1.5 → 1.7)
        tempContainer.style.lineHeight = '1.7';
        tempContainer.style.color = editorStyle.color || '#333';
        tempContainer.style.whiteSpace = 'pre-wrap';
        tempContainer.style.wordBreak = 'break-word';
        tempContainer.style.wordWrap = 'break-word';
        tempContainer.style.overflowWrap = 'anywhere';
        tempContainer.style.maxWidth = `${contentWidthPx}px`;
        
        // Copier le contenu de Quill
        tempContainer.innerHTML = htmlContent;
        
        // Ajouter les styles pour les classes Quill
        const style = document.createElement('style');
        style.textContent = `
            .ql-align-center { text-align: center !important; }
            .ql-align-right { text-align: right !important; }
            .ql-align-justify { text-align: justify !important; }
            .ql-align-left { text-align: left !important; }
            strong, b { font-weight: bold !important; }
            em, i { font-style: italic !important; }
            u { text-decoration: underline !important; }
            p { 
                margin: 0 0 1.2em 0 !important; 
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: anywhere !important;
                max-width: ${contentWidthPx}px !important;
                line-height: 1.7 !important;
            }
            .ql-editor p { 
                margin: 0 0 1em 0 !important; 
            }
            .ql-editor { 
                max-width: ${contentWidthPx}px !important;
            }
            /* Styles pour les tailles de police Quill */
            .ql-size-small { font-size: 10px !important; }
            .ql-size-large { font-size: 24px !important; }
            .ql-size-huge { font-size: 32px !important; }
        `;
        tempContainer.appendChild(style);
        
        // Forcer le contenu à respecter la largeur
        tempContainer.style.maxWidth = `${contentWidthPx}px`;
        tempContainer.style.overflowWrap = 'anywhere';
        
        document.body.appendChild(tempContainer);

        // Utiliser html2canvas avec une résolution réduite pour réduire la taille du PDF
        // scale: 1.5 au lieu de 2 pour réduire la taille sans trop perdre en qualité
        const canvas = await html2canvas(tempContainer, {
            scale: 1.5,
            backgroundColor: 'white',
            logging: false,
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0
        });

        // Calculer les dimensions de l'image en mm
        // Convertir les pixels en mm (divisé par 1.5, le nouveau scale)
        const imageWidthMm = (canvas.width / dpi) * mmPerInch / 1.5;
        const imageHeightMm = (canvas.height / dpi) * mmPerInch / 1.5;
        
        // Ajouter l'image au PDF
        // Toujours aligner en haut à gauche de la zone de contenu (respect des marges)
        const x = marginLeft;
        const y = marginTop;
        
        // Vérifier si l'image est plus large que la zone de contenu
        // Si oui, la redimensionner proportionnellement
        let finalWidth = imageWidthMm;
        let finalHeight = imageHeightMm;
        
        if (imageWidthMm > contentWidth) {
            // Redimensionner proportionnellement pour respecter la largeur
            const scaleFactor = contentWidth / imageWidthMm;
            finalWidth = contentWidth;
            finalHeight = imageHeightMm * scaleFactor;
        }
        
        // Si l'image est plus haute que la page disponible, la découper en plusieurs pages
        if (finalHeight > contentHeight) {
            // Calculer combien de pages sont nécessaires
            const totalPages = Math.ceil(finalHeight / contentHeight);
            
            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                if (pageIndex > 0) {
                    doc.addPage();
                }
                
                // Calculer la partie à découper
                const startY = pageIndex * contentHeight;
                const clipHeight = Math.min(contentHeight, finalHeight - startY);
                
                // Calculer les coordonnées en pixels pour le découpage
                const startYPx = Math.round((startY / finalHeight) * canvas.height);
                const clipHeightPx = Math.round((clipHeight / finalHeight) * canvas.height);
                
                // Créer un canvas temporaire pour la partie à découper
                const partCanvas = document.createElement('canvas');
                partCanvas.width = canvas.width;
                partCanvas.height = clipHeightPx;
                const partCtx = partCanvas.getContext('2d');
                
                // Dessiner la partie correspondante
                partCtx.drawImage(
                    canvas,
                    0, startYPx, canvas.width, clipHeightPx,
                    0, 0, canvas.width, clipHeightPx
                );
                
                // Convertir en mm
                const partHeightMm = clipHeight; // Déjà en mm
                
                // Ajouter au PDF - toujours en haut de la page
                doc.addImage(partCanvas, 'PNG', x, marginTop, finalWidth, partHeightMm);
            }
        } else {
            // L'image tient sur une seule page
            doc.addImage(canvas, 'PNG', x, y, finalWidth, finalHeight);
        }

        // Réactiver le bouton AVANT doc.save() car doc.save() est bloquant
        textDownloadBtn.disabled = originalBtnDisabled;
        textDownloadBtn.textContent = originalBtnText;
        
        // Nettoyer
        if (tempContainer && tempContainer.parentNode) {
            document.body.removeChild(tempContainer);
        }
        
        // Lancer le téléchargement
        doc.save('texte-converti.pdf');
    } catch (error) {
        console.error('Erreur lors de la conversion texte en PDF:', error);
        alert('Une erreur est survenue lors de la conversion. Veuillez réessayer.');
        // Réactiver le bouton en cas d'erreur
        textDownloadBtn.disabled = originalBtnDisabled;
        textDownloadBtn.textContent = originalBtnText;
        // Nettoyer
        if (tempContainer && tempContainer.parentNode) {
            document.body.removeChild(tempContainer);
        }
    }
}

/**
 * Rend une ligne de segments de texte avec le bon alignement
 * @param {jsPDF} doc - Le document PDF
 * @param {Array} segments - Les segments à rendre
 * @param {number} startX - Position X de départ
 * @param {number} y - Position Y
 * @param {string} align - Alignement (left, center, right)
 * @param {number} maxWidth - Largeur maximale
 * @param {number} marginLeft - Marge gauche
 * @param {number} marginRight - Marge droite
 * @param {number} pageWidth - Largeur de la page
 */
function renderLine(doc, segments, startX, y, align, maxWidth, marginLeft, marginRight, pageWidth) {
    // Calculer la largeur totale de la ligne
    let totalLineWidth = 0;
    segments.forEach(seg => {
        totalLineWidth += doc.getTextWidth(seg.text);
    });
    
    // Calculer la position X de départ en fonction de l'alignement
    let currentX = startX;
    if (align === 'center') {
        currentX = pageWidth / 2 - totalLineWidth / 2;
    } else if (align === 'right') {
        currentX = pageWidth - marginRight - totalLineWidth;
    }
    
    // Rendre chaque segment
    segments.forEach(segment => {
        // Appliquer le style
        let fontStyle = 'normal';
        if (segment.isBold && segment.isItalic) {
            fontStyle = 'bolditalic';
        } else if (segment.isBold) {
            fontStyle = 'bold';
        } else if (segment.isItalic) {
            fontStyle = 'italic';
        }
        
        doc.setFont('helvetica', fontStyle);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        // Appliquer le soulignement si nécessaire
        if (segment.isUnderline) {
            const lineY = y + 1;
            const textWidth = doc.getTextWidth(segment.text);
            doc.line(currentX, lineY, currentX + textWidth, lineY);
        }
        
        // Ajouter le texte
        doc.text(segment.text, currentX, y, { align: 'left' });
        
        // Mettre à jour currentX
        currentX += doc.getTextWidth(segment.text);
    });
}

/**
 * Extrait les segments de texte avec leur formatage depuis un élément Quill
 * @param {HTMLElement} element - L'élément à analyser
 * @returns {Array} Tableau d'objets {text, isBold, isItalic, isUnderline}
 */
function extractQuillSegments(element) {
    const segments = [];
    
    // Fonction récursive pour parcourir les nœuds
    function processNode(node, currentFormatting) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text.trim()) {
                segments.push({
                    text: text,
                    isBold: currentFormatting.isBold,
                    isItalic: currentFormatting.isItalic,
                    isUnderline: currentFormatting.isUnderline
                });
            }
            return;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Mettre à jour le formatage en fonction de la balise
            const newFormatting = {
                isBold: currentFormatting.isBold || node.tagName === 'STRONG' || node.tagName === 'B',
                isItalic: currentFormatting.isItalic || node.tagName === 'EM' || node.tagName === 'I',
                isUnderline: currentFormatting.isUnderline || node.tagName === 'U'
            };
            
            // Traiter les enfants avec le nouveau formatage
            for (let i = 0; i < node.childNodes.length; i++) {
                processNode(node.childNodes[i], newFormatting);
            }
        }
    }
    
    // Démarrer le traitement avec un formatage vide
    for (let i = 0; i < element.childNodes.length; i++) {
        processNode(element.childNodes[i], {
            isBold: false,
            isItalic: false,
            isUnderline: false
        });
    }
    
    return segments;
}
