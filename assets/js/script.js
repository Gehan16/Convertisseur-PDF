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
 * Met à jour l'état du bouton de téléchargement de texte
 */

/**
 * Formate le texte dans l'éditeur (alignement, gras, souligné)
 * @param {string} command - left, center, right, bold ou underline
 */
function formatText(command) {
    switch (command) {
        case 'left':
            document.execCommand('justifyLeft', false, null);
            break;
        case 'center':
            document.execCommand('justifyCenter', false, null);
            break;
        case 'right':
            document.execCommand('justifyRight', false, null);
            break;
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
    }
    textEditor.focus();
    updateTextButtonState();
}

/**
 * Récupère le texte avec son formatage pour jsPDF (par segments)
 * @returns {Array} Tableau d'objets avec text, align, isBold, isUnderline
 */
function parseFormattedText() {
    const editor = textEditor;
    const result = [];
    
    // Récupérer tous les éléments de ligne (div, p) + les br
    const lineElements = editor.querySelectorAll('div, p');
    
    // Si aucun élément trouvé, utiliser le texte brut
    if (lineElements.length === 0) {
        // Traiter le contenu de l'éditeur comme une seule ligne
        const children = editor.childNodes;
        if (children.length > 0) {
            const segments = extractTextSegments(children, 'left');
            result.push(...segments);
        }
        return result;
    }

    // Traiter chaque élément (ligne)
    lineElements.forEach((element, index) => {
        const hasBr = element.querySelector('br') !== null;
        const trimmedText = element.textContent.trim();
        const isEmpty = trimmedText === '' && hasBr;
        
        // Si c'est un élément vide avec un <br>, c'est un saut de ligne
        if (isEmpty) {
            result.push({
                text: '',
                align: 'left',
                isLineBreak: true
            });
            return;
        }
        
        // Si c'est un élément vide sans <br>, on l'ignore
        if (trimmedText === '' && !hasBr) return;
        
        // Détecter l'alignement de la ligne
        let align = 'left';
        if (element.hasAttribute('align')) {
            align = element.getAttribute('align');
        }
        
        // Extraire les segments de texte avec leur formatage
        const segments = extractTextSegments(element.childNodes, align);
        
        // Ajouter les segments
        result.push(...segments);
    });

    return result;
}

/**
 * Extrait les segments de texte avec leur formatage
 * @param {NodeList} nodes - Les nœuds à traiter
 * @param {string} defaultAlign - L'alignement par défaut
 * @param {boolean} hasFormatting - Si vrai, on est déjà dans un élément formaté
 * @returns {Array} Tableau de segments avec text, align, isBold, isUnderline
 */
function extractTextSegments(nodes, defaultAlign, hasFormatting = false) {
    const segments = [];
    
    nodes.forEach(node => {
        // Ignorer les nœuds vides (textes vides, commentaires, etc.)
        if (node.nodeType === Node.COMMENT_NODE) return;
        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;
        
        // Si c'est un nœud texte
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text.trim()) {
                // Ne pas ajouter de segment si on est dans un élément formaté
                // (le texte sera inclus dans le segment de l'élément parent)
                if (!hasFormatting) {
                    segments.push({
                        text: text,
                        align: defaultAlign,
                        isBold: false,
                        isUnderline: false
                    });
                }
            }
            return;
        }
        
        // Si c'est un élément (balise)
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Détecter le formatage de cet élément
            const isBold = isElementBold(node) || hasFormatting;
            const isUnderline = isElementUnderlined(node) || hasFormatting;
            const currentHasFormatting = isBold || isUnderline;
            
            // Si cet élément a un formatage, extraire son texte directement
            if (currentHasFormatting) {
                const text = node.textContent;
                if (text.trim()) {
                    segments.push({
                        text: text,
                        align: defaultAlign,
                        isBold: isBold,
                        isUnderline: isUnderline
                    });
                }
                // Traiter les enfants avec hasFormatting=true pour éviter les doublons
                if (node.childNodes.length > 0) {
                    const childSegments = extractTextSegments(node.childNodes, defaultAlign, true);
                    segments.push(...childSegments);
                }
            } else {
                // Cet élément n'a pas de formatage, traiter normalement
                if (node.childNodes.length > 0) {
                    const childSegments = extractTextSegments(node.childNodes, defaultAlign, hasFormatting);
                    segments.push(...childSegments);
                }
            }
        }
    });
    
    return segments;
}

/**
 * Vérifie si un élément est en gras
 * @param {HTMLElement} element - L'élément à vérifier
 * @returns {boolean} True si l'élément est en gras
 */
function isElementBold(element) {
    // Balises b, strong
    if (element.tagName === 'B' || element.tagName === 'STRONG') {
        return true;
    }
    
    // Spans avec font-weight: bold
    const style = element.getAttribute('style') || '';
    if (style.includes('bold') || style.includes('700')) {
        return true;
    }
    
    return false;
}

/**
 * Vérifie si un élément est souligné
 * @param {HTMLElement} element - L'élément à vérifier
 * @returns {boolean} True si l'élément est souligné
 */
function isElementUnderlined(element) {
    // Balise u
    if (element.tagName === 'U') {
        return true;
    }
    
    // Spans avec text-decoration: underline
    const style = element.getAttribute('style') || '';
    if (style.includes('underline')) {
        return true;
    }
    
    return false;
}function updateTextButtonState() {
    textDownloadBtn.disabled = textEditor.textContent.trim() === '';
}

/**
 * Convertit le texte en PDF avec formatage
 */
function convertTextToPDF() {
    const formattedText = parseFormattedText();
    if (formattedText.length === 0) return;

    // Récupérer les marges
    const marginTop = parseFloat(textMarginTop.value);
    const marginBottom = parseFloat(textMarginBottom.value);
    const marginLeft = parseFloat(textMarginLeft.value);
    const marginRight = parseFloat(textMarginRight.value);

    // Créer le document PDF
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - marginLeft - marginRight;
    let yPosition = marginTop;

    // Configurer la police par défaut
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    // Regrouper les segments par ligne (même alignement)
    const lines = [];
    let currentLine = null;
    
    formattedText.forEach(segment => {
        // Si c'est un saut de ligne, finaliser la ligne courante
        if (segment.isLineBreak) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = null;
            }
            lines.push({ segments: [], align: 'left', isLineBreak: true });
            return;
        }
        
        // Si on change d'alignement, finaliser la ligne courante
        if (currentLine && currentLine.align !== segment.align) {
            lines.push(currentLine);
            currentLine = null;
        }
        
        // Créer ou ajouter à la ligne courante
        if (!currentLine) {
            currentLine = { segments: [], align: segment.align };
        }
        currentLine.segments.push(segment);
    });
    
    // Ajouter la dernière ligne si elle existe
    if (currentLine) {
        lines.push(currentLine);
    }
    
    const lineHeightMm = 12 * 0.35;
    
    // Traiter chaque ligne
    lines.forEach(line => {
        if (line.isLineBreak) {
            yPosition += lineHeightMm * 1.5;
            return;
        }
        
        // Ignorer les lignes sans segments
        if (!line.segments || line.segments.length === 0) {
            yPosition += lineHeightMm * 1.5;
            return;
        }
        
        // Calculer la largeur totale de la ligne pour le positionnement
        const lineText = line.segments.map(s => s.text).join('');
        const totalWidth = doc.getTextWidth(lineText);
        
        // Calculer la position de départ en fonction de l'alignement
        let currentX = marginLeft;
        if (line.align === 'center') {
            currentX = pageWidth / 2 - totalWidth / 2;
        } else if (line.align === 'right') {
            currentX = pageWidth - marginRight - totalWidth;
        }
        
        // Traiter chaque segment de la ligne
        line.segments.forEach(segment => {
            // Appliquer le style du segment
            const fontStyle = segment.isBold ? 'bold' : 'normal';
            doc.setFont('helvetica', fontStyle);
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            
            // Découper le texte si trop long
            const splitLines = doc.splitTextToSize(segment.text, maxWidth);
            
            // Appliquer le soulignement si nécessaire
            if (segment.isUnderline) {
                const textWidth = doc.getTextWidth(splitLines[0] || segment.text);
                const lineY = yPosition + 1;
                doc.line(currentX, lineY, currentX + textWidth, lineY);
            }
            
            // Ajouter le texte
            doc.text(splitLines, currentX, yPosition, { align: 'left' });
            
            // Mettre à jour currentX pour le prochain segment
            const textWidth = doc.getTextWidth(splitLines[0] || segment.text);
            currentX += textWidth;
        });
        
        // Mettre à jour la position Y
        yPosition += lineHeightMm * 1.5;
        
        // Passer à la page suivante si nécessaire
        if (yPosition > doc.internal.pageSize.getHeight() - marginBottom) {
            doc.addPage();
            yPosition = marginTop;
        }
    });

    doc.save('texte-converti.pdf');
}
