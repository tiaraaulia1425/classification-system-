// ===================================
// AI FLOWER CLASSIFIER - JAVASCRIPT
// ===================================

// Global Variables
let stream = null;
let facingMode = 'environment';
let isUploading = false;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    resetScrollToTop();
    initializeApp();
    initializeUploadZone();
    initializeNavigation();
    initializeMobileMenu();
    initializeKeyboardActivation();
    showPendingToast();
});

function initializeApp() {
    console.log('AI Flower Classifier initialized');
    
    // Set active nav link based on scroll
    updateActiveNavLink();
    
    // Add smooth scroll to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function resetScrollToTop() {
    if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
}

// ========== KEYBOARD ACTIVATION FOR BUTTONS ==========
function initializeKeyboardActivation() {
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(btn => {
        // Ensure focusable even if custom markup uses .btn on non-button elements
        if (!btn.hasAttribute('tabindex')) {
            btn.setAttribute('tabindex', '0');
        }

        // Trigger click on Enter/Space for consistent keyboard support
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                btn.click();
            }
        });
    });
}

// ========== NAVIGATION ==========
function initializeNavigation() {
    window.addEventListener('scroll', updateActiveNavLink);
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigationAway);
    });
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    // If navbar uses page routes (e.g. '/', '/clasify', '/search'),
    // keep the active state controlled by the template.
    const hasHashLinks = Array.from(navLinks).some(link => (link.getAttribute('href') || '').startsWith('#'));
    if (!hasHashLinks) return;

    const navTargets = Array.from(navLinks).map(link => link.getAttribute('href').replace('#', ''));
    
    // Default to first nav target (beranda) so indicator stays visible at top
    let currentSection = navTargets[0] || 'beranda';
    const scrollY = window.pageYOffset + 150; // Adjusted offset for better detection
    
    sections.forEach(section => {
        const sectionId = section.getAttribute('id');
        // Skip sections that are not part of navbar targets (e.g., about, tech)
        if (!navTargets.includes(sectionId)) return;

        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            currentSection = sectionId;
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + currentSection) {
            link.classList.add('active');
        }
    });
}

function handleNavigationAway(event) {
    if (!stream) return;
    
    const link = event.currentTarget;
    if (!link) return;
    
    const currentPath = window.location?.pathname || '';
    const targetPath = link.pathname || '';
    const isOnKlasifikasiPage = currentPath.includes('/clasify');
    const movingAwayFromKlasifikasi = isOnKlasifikasiPage && targetPath && !targetPath.includes('/clasify');
    
    if (movingAwayFromKlasifikasi) {
        event.preventDefault();
        sessionStorage.setItem('cameraStoppedToast', JSON.stringify({
            message: 'Kamera dimatikan',
            type: 'warning'
        }));
        deactivateCameraUI({ toastMessage: 'Kamera dimatikan', toastType: 'warning' });
        setTimeout(() => {
            window.location.href = link.href;
        }, 120);
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ========== MOBILE MENU ==========
function initializeMobileMenu() {
    // Close mobile menu when clicking nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            closeMobileMenu();
        });
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        const navbar = document.querySelector('.navbar');
        const navLinksContainer = document.querySelector('.nav-links');
        
        if (navLinksContainer?.classList.contains('active') && 
            !navbar?.contains(event.target)) {
            closeMobileMenu();
        }
    });
}

function closeMobileMenu() {
    const navLinksContainer = document.querySelector('.nav-links');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const icon = menuToggle?.querySelector('i');
    
    if (navLinksContainer?.classList.contains('active')) {
        navLinksContainer.classList.remove('active');
        if (icon) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
}

function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const icon = menuToggle?.querySelector('i');
    
    if (!navLinks || !icon) return;
    
    navLinks.classList.toggle('active');
    
    // Toggle icon between bars and times (x)
    if (navLinks.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

// ========== THEME TOGGLE ==========
// Apply theme immediately to prevent flash
(function() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update icon immediately if element exists
    const updateIcon = () => {
        const icon = document.querySelector('.theme-toggle i');
        if (icon) {
            if (theme === 'light') {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            } else {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    };
    
    // Try to update icon immediately, or wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateIcon);
    } else {
        updateIcon();
    }
})();

function initializeTheme() {
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    // Apply theme (already applied in IIFE, but ensure icon is updated)
    setTheme(theme, false);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light', true);
        }
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme, true);
}

function setTheme(theme, animate = true) {
    const root = document.documentElement;
    const themeToggleBtn = document.querySelector('.theme-toggle');
    const icon = themeToggleBtn?.querySelector('i');
    
    // Add transition class for smooth theme change
    if (animate) {
        root.classList.add('theme-transitioning');
    }
    
    // Set theme attribute
    root.setAttribute('data-theme', theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Update icon with animation
    if (icon) {
        if (animate) {
            // Add rotation animation
            icon.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                icon.style.transform = 'rotate(0deg)';
            }, 400);
        }
        
        // Update icon class
        if (theme === 'light') {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
    
    // Remove transition class after animation
    if (animate) {
        setTimeout(() => {
            root.classList.remove('theme-transitioning');
        }, 300);
    }
}

// Initialize theme on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
} else {
    initializeTheme();
}

// ========== UPLOAD FUNCTIONALITY ==========
let uploadZoneInitialized = false;
let uploadClickHandler = null;
let fileChangeHandler = null;
let dropHandler = null;

function initializeUploadZone() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadZone || !fileInput) return;
    
    // Prevent double initialization
    if (uploadZoneInitialized) {
        return;
    }
    
    // Define handlers
    uploadClickHandler = () => {
        fileInput.click();
    };
    
    fileChangeHandler = handleFileSelect;
    dropHandler = handleDrop;
    
    // Click to upload
    uploadZone.addEventListener('click', uploadClickHandler);
    
    // File input change
    fileInput.addEventListener('change', fileChangeHandler);
    
    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.remove('dragover');
        }, false);
    });
    
    uploadZone.addEventListener('drop', dropHandler, false);
    
    uploadZoneInitialized = true;
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        displayFilePreview(files[0]);
    }
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        document.getElementById('fileInput').files = files;
        displayFilePreview(files[0]);
    }
}

function displayFilePreview(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadZone = document.getElementById('uploadZone');
        uploadZone.innerHTML = `
            <div class="upload-preview">
                <div class="preview-image-container">
                    <img src="${e.target.result}" alt="Preview" class="preview-image">
                </div>
                <div class="preview-info">
                    <div class="preview-file-details">
                        <div class="preview-file-icon">
                            <i class="fas fa-image"></i>
                        </div>
                        <div class="preview-file-text">
                            <h4 class="preview-filename">${file.name}</h4>
                            <p class="preview-filesize">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <button class="btn btn-secondary preview-change-btn" onclick="resetUploadZone(event)">
                        <i class="fas fa-times"></i> <span>Batal</span>
                    </button>
                </div>
            </div>
        `;

        // Disable background click-to-upload once a preview is shown
        if (uploadClickHandler) {
            uploadZone.removeEventListener('click', uploadClickHandler);
        }
        if (dropHandler) {
            uploadZone.removeEventListener('drop', dropHandler);
        }
        // Avoid pointer hint on preview area; change action only via button
        uploadZone.style.cursor = 'default';
    };
    reader.readAsDataURL(file);
}

function resetUploadZone(event) {
    // Prevent event propagation to avoid triggering parent click handlers
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    
    // Clear file input
    fileInput.value = '';
    
    // Clear result
    const resultSection = document.getElementById('resultSection');
    if (resultSection) {
        resultSection.style.display = 'none';
    }
    
    // Remove event listeners before resetting
    if (uploadClickHandler) {
        uploadZone.removeEventListener('click', uploadClickHandler);
    }
    if (fileChangeHandler) {
        fileInput.removeEventListener('change', fileChangeHandler);
    }
    if (dropHandler) {
        uploadZone.removeEventListener('drop', dropHandler);
    }
    
    // Reset HTML
    uploadZone.innerHTML = `
        <div class="upload-content">
            <div class="upload-icon">
                <i class="fas fa-image"></i>
            </div>
            <h4>Klik atau Drag & Drop</h4>
            <p>Pilih gambar bunga dari Perangkat Anda</p>
            <span class="upload-info">Format: PNG, JPG, JPEG, BMP (Maks 10MB)</span>
        </div>
    `;
    
    // Reset initialization flag and reinitialize after a small delay
    uploadZoneInitialized = false;
    setTimeout(() => {
        initializeUploadZone();
    }, 100);
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Silakan pilih gambar terlebih dahulu', 'warning');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('Ukuran file Maksimal 10MB!', 'error');
        return;
    }
    
    if (isUploading) return;
    isUploading = true;
    
    const formData = new FormData();
    formData.append('file', file);
    
    showLoading();
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            displayResult(result);
            showToast('Klasifikasi berhasil!', 'success');
        } else {
            showToast(result.message || 'Gagal mengklasifikasi gambar', 'error');
        }
        
    } catch (error) {
        hideLoading();
        showToast('Terjadi kesalahan: ' + error.message, 'error');
        console.error('Upload error:', error);
    } finally {
        isUploading = false;
    }
}

// ========== CAMERA FUNCTIONALITY ==========
async function toggleCamera() {
    if (stream) {
        deactivateCameraUI({ toastMessage: 'Kamera dimatikan', toastType: 'warning' });
        return;
    }
    
    const btn = document.getElementById('toggleCameraBtn');
    const placeholder = document.getElementById('cameraPlaceholder');
    const wrapper = document.getElementById('cameraWrapper');
    const captureBtn = document.getElementById('captureBtn');
    const switchBtn = document.getElementById('switchCameraBtn');
    
    // Start camera
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false
        });
        
        const video = document.getElementById('video');
        if (video) {
            video.srcObject = stream;
        }
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-stop"></i> Matikan Kamera';
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        if (wrapper) {
            wrapper.style.display = 'block';
        }
        if (switchBtn) {
            switchBtn.disabled = false;
        }
        if (captureBtn) {
            captureBtn.disabled = false;
        }
        
        showToast('Kamera berhasil diaktifkan', 'success');
    } catch (error) {
        showToast('Gagal mengakses kamera: ' + error.message, 'error');
        console.error('Camera error:', error);
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function deactivateCameraUI(options = {}) {
    const btn = document.getElementById('toggleCameraBtn');
    const placeholder = document.getElementById('cameraPlaceholder');
    const wrapper = document.getElementById('cameraWrapper');
    const captureBtn = document.getElementById('captureBtn');
    const switchBtn = document.getElementById('switchCameraBtn');

    stopCamera();

    if (btn) {
        btn.innerHTML = '<i class="fas fa-play"></i> Aktifkan Kamera';
    }
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
    if (wrapper) {
        wrapper.style.display = 'none';
    }
    if (switchBtn) {
        switchBtn.disabled = true;
    }
    if (captureBtn) {
        captureBtn.disabled = true;
    }

    if (options.toastMessage) {
        showToast(options.toastMessage, options.toastType || 'info');
    }
}

async function switchCamera() {
    if (!stream) return;
    
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    stopCamera();
    
    // Small delay before restarting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    toggleCamera();
}

async function captureImage() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    // Guard: ensure camera stream is active and video has dimensions
    if (!stream || !video || !video.videoWidth || !video.videoHeight) {
        showToast('Kamera belum siap. Pastikan kamera aktif sebelum menangkap gambar.', 'error');
        return;
    }
    
    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to base64 data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    
    showLoading();
    
    try {
        // Send to /capture endpoint (camera mode) with base64 data
        const response = await fetch('/capture', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            displayResult(result);
            if (result.is_flower) {
                showToast('Klasifikasi berhasil!', 'success');
            } else {
                // Untuk mode kamera real-time, jangan tampilkan toast error agar tidak mengganggu
                // Cukup tampilkan modal peringatan
                if (result.mode !== 'camera') {
                    showToast('Gambar tidak terdeteksi sebagai bunga', 'error');
                }
            }
        } else {
            showToast(result.error || 'Gagal mengklasifikasi gambar', 'error');
        }
        
    } catch (error) {
        hideLoading();
        showToast('Terjadi kesalahan: ' + error.message, 'error');
        console.error('Capture error:', error);
    }
}

// ========== SEARCH FUNCTIONALITY ==========
async function searchFlowers() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        showToast('Masukkan kata kunci pencarian', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        hideLoading();
        
        displaySearchResults(result);
        
    } catch (error) {
        hideLoading();
        showToast('Terjadi kesalahan: ' + error.message, 'error');
        console.error('Search error:', error);
    }
}

function quickSearch(query) {
    document.getElementById('searchInput').value = query;
    searchFlowers();
}

function displaySearchResults(result) {
    const container = document.getElementById('searchResults');
    
    if (!result.results || result.results.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 3rem;">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3>Tidak Ada Hasil</h3>
                <p style="color: var(--text-secondary);">Tidak ditemukan bunga yang cocok dengan pencarian Anda</p>
            </div>
        `;
        return;
    }
    
    const totalFound = result.results.length;
    const flowerText = totalFound === 1 ? 'bunga' : 'bunga';
    
    let html = `
        <div class="search-results-header">
            <h3 class="search-results-title">Hasil Pencarian - Ditemukan <span class="count-number">${totalFound}</span> ${flowerText}</h3>
        </div>
        <div class="popular-grid">`;
    
    result.results.forEach((flower, index) => {
        html += `
            <div class="glass-card search-result-card">
                <div class="search-result-header">
                    <div class="search-result-number">${index + 1}</div>
                    <div class="search-result-text">
                        <h4 class="search-result-title">${flower.name}</h4>
                        <p class="search-result-scientific">${flower.scientific_name || ''}</p>
                    </div>
                </div>
                
                <div class="search-result-divider"></div>
                
                <div class="search-result-details">
                    ${flower.physical_characteristics ? `
                        <div class="search-result-item">
                            <div class="search-result-label label-leaf">
                                <i class="fas fa-leaf"></i>
                                <span>Karakteristik :</span>
                            </div>
                            <div class="search-result-value">${flower.physical_characteristics}</div>
                        </div>
                    ` : ''}
                    
                    ${flower.habitat ? `
                        <div class="search-result-item">
                            <div class="search-result-label label-habitat">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Habitat :</span>
                            </div>
                            <div class="search-result-value">${flower.habitat}</div>
                        </div>
                    ` : ''}
                    
                    ${flower.benefits_or_meaning ? `
                        <div class="search-result-item">
                            <div class="search-result-label label-heart">
                                <i class="fas fa-heart"></i>
                                <span>Manfaat & Makna :</span>
                            </div>
                            <div class="search-result-value">${flower.benefits_or_meaning}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ========== DISPLAY RESULTS ==========
function displayResult(result) {
    // Show result in modal instead of inline
    showResultModal(result);
}

// ========== RESULT MODAL ==========
function showResultModal(result) {
    const modal = document.getElementById('resultModal');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalContent) return;
    
    let html = '';
    
    // Check if there's a warning (not flower or quality issue)
    if (result.warning || (result.success && !result.is_flower)) {
        // Determine mode-specific information
        const isCamera = result.mode === 'camera';
        const minConfidence = isCamera ? '75%' : '75%';
        const minBrightness = 15;
        const maxBrightness = 250;
        const minBlurScore = 15;
        const hasImage = Boolean(result.image_data);
        const topClass = hasImage ? 'modal-top with-image' : 'modal-top single-column';
        const imageSection = hasImage
            ? `<div class="modal-image-container">
                    <img src="${result.image_data}" alt="Captured image" class="modal-image">
               </div>`
            : '';
        
        // Warning Modal
        html = `
            <div class="${topClass}">
                ${imageSection}
                <div class="modal-header">
                    <div class="modal-status-icon warning">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="modal-header-text">
                        <h2 class="modal-title">Peringatan</h2>
                        <p class="modal-subtitle">Mode: ${isCamera ? 'Kamera Real-time' : 'Upload Gambar'}</p>
                    </div>
                </div>
            </div>
            
            <div class="modal-warning">
                <div style="display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <div class="modal-warning-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <h4 style="margin: 0; font-size: 0.9375rem; color: var(--text-primary); font-weight: 600;">Confidence Terlalu Rendah</h4>
                </div>
                <p style="margin: 0; color: var(--text-secondary); line-height: 1.6;">Sistem memerlukan confidence minimal ${minConfidence} untuk ${isCamera ? 'mode kamera' : 'mode upload'}. ${isCamera ? 'Arahkan kamera ke bunga dengan pencahayaan yang baik.' : 'Pastikan gambar berisi bunga yang jelas.'}</p>
            </div>
            
            ${result.predicted_name ? `
            <div class="modal-metadata">
                <div class="metadata-card">
                    <div class="metadata-header">
                        <div class="metadata-icon orange">
                            <i class="fas fa-tag"></i>
                        </div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 0.25rem 0;">Prediksi</h4>
                            <span style="display: inline-block; padding: 0.125rem 0.5rem; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 4px; font-size: 0.75rem; color: var(--accent-orange); font-weight: 600;">Tidak Pasti</span>
                        </div>
                    </div>
                    <div class="metadata-content">
                        <p style="margin: 0 0 0.5rem 0;"><strong style="font-size: 1.0625rem; color: var(--text-primary);">${result.predicted_name}</strong></p>
                        <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Tingkat kepercayaan: ${result.confidence_percent || (result.confidence * 100).toFixed(2) + '%'}</p>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${result.quality_info ? `
            <div class="modal-quality">
                <div class="quality-item">
                    <i class="fas fa-sun"></i>
                    <div class="quality-value" style="color: ${result.quality_info.brightness && result.quality_info.brightness >= minBrightness && result.quality_info.brightness <= maxBrightness ? 'var(--accent-green)' : '#ef4444'}">${result.quality_info.brightness ? result.quality_info.brightness.toFixed(1) : 'N/A'}</div>
                    <div class="quality-label">Brightness (${minBrightness}-${maxBrightness})</div>
                </div>
                <div class="quality-item">
                    <i class="fas fa-adjust"></i>
                    <div class="quality-value" style="color: ${result.quality_info.blur_score && result.quality_info.blur_score >= minBlurScore ? 'var(--accent-green)' : '#ef4444'}">${result.quality_info.blur_score ? result.quality_info.blur_score.toFixed(1) : 'N/A'}</div>
                    <div class="quality-label">Focus Score (min: ${minBlurScore})</div>
                </div>
                <div class="quality-item">
                    <i class="fas fa-check-circle"></i>
                    <div class="quality-value" style="color: var(--accent-green)">${minConfidence}</div>
                    <div class="quality-label">Min Confidence (${isCamera ? 'Kamera' : 'Upload'})</div>
                </div>
            </div>
            ` : ''}
        `;
    } else if (result.success && result.is_flower && result.metadata) {
        // Success Modal with full metadata
        const metadata = result.metadata;
        const confidence = result.confidence || 0;
        const confidencePercent = Math.round(confidence * 100);
        const isCamera = result.mode === 'camera';
        const minConfidence = isCamera ? '75%' : '75%';
        const minBrightness = 15;
        const maxBrightness = 250;
        const minBlurScore = 15;
        const hasImage = Boolean(result.image_data);
        const topClass = hasImage ? 'modal-top with-image' : 'modal-top single-column';
        const imageSection = hasImage
            ? `<div class="modal-image-container">
                    <img src="${result.image_data}" alt="${metadata.name}" class="modal-image">
               </div>`
            : '';
        
        html = `
            <div class="${topClass}">
                ${imageSection}
                <div class="modal-header">
                    <div class="modal-status-icon success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="modal-header-text">
                        <h2 class="modal-title">${metadata.name}</h2>
                        ${metadata.scientific_name ? `<p class="modal-subtitle">${metadata.scientific_name}</p>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="modal-confidence">
                <div class="confidence-label">
                    <span>Tingkat Kepercayaan (Min: ${minConfidence} untuk mode ${isCamera ? 'kamera' : 'upload'})</span>
                    <span class="confidence-percentage">${confidencePercent}%</span>
                </div>
                <div class="confidence-progress">
                    <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
                </div>
            </div>
            
            ${result.quality_info && result.quality_info.brightness && result.quality_info.blur_score ? `
            <div class="modal-quality">
                <div class="quality-item">
                    <i class="fas fa-sun"></i>
                    <div class="quality-value" style="color: ${result.quality_info.brightness >= minBrightness && result.quality_info.brightness <= maxBrightness ? 'var(--accent-green)' : 'var(--accent-orange)'}">${result.quality_info.brightness.toFixed(1)}</div>
                    <div class="quality-label">Brightness (${minBrightness}-${maxBrightness})</div>
                </div>
                <div class="quality-item">
                    <i class="fas fa-adjust"></i>
                    <div class="quality-value" style="color: ${result.quality_info.blur_score >= minBlurScore ? 'var(--accent-green)' : 'var(--accent-orange)'}">${result.quality_info.blur_score.toFixed(1)}</div>
                    <div class="quality-label">Focus Score (min: ${minBlurScore})</div>
                </div>
                <div class="quality-item">
                    <i class="fas fa-${isCamera ? 'camera' : 'cloud-upload-alt'}"></i>
                    <div class="quality-value">${isCamera ? 'Kamera' : 'Upload'}</div>
                    <div class="quality-label">Mode Deteksi</div>
                </div>
            </div>
            ` : ''}
            
            <div class="modal-metadata">
                <div class="metadata-section">
                    ${metadata.dynamic_description ? `
                    <div class="metadata-card metadata-card-vertical">
                        <div class="metadata-header">
                            <div class="metadata-icon green">
                                <i class="fas fa-info-circle"></i>
                            </div>
                            <h4>Deskripsi</h4>
                        </div>
                        <div class="metadata-content">
                            <p>${metadata.dynamic_description}</p>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${metadata.physical_characteristics ? `
                    <div class="metadata-card metadata-card-vertical">
                        <div class="metadata-header">
                            <div class="metadata-icon blue">
                                <i class="fas fa-leaf"></i>
                            </div>
                            <h4>Karakteristik</h4>
                        </div>
                        <div class="metadata-content">
                            <p>${metadata.physical_characteristics}</p>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${metadata.habitat ? `
                    <div class="metadata-card metadata-card-vertical">
                        <div class="metadata-header">
                            <div class="metadata-icon cyan">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <h4>Habitat</h4>
                        </div>
                        <div class="metadata-content">
                            <p>${metadata.habitat}</p>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${metadata.benefits_or_meaning ? `
                    <div class="metadata-card metadata-card-vertical">
                        <div class="metadata-header">
                            <div class="metadata-icon purple">
                                <i class="fas fa-heart"></i>
                            </div>
                            <h4>Manfaat & Makna</h4>
                        </div>
                        <div class="metadata-content">
                            <p>${metadata.benefits_or_meaning}</p>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    } else {
        // Error or unknown state
        html = `
            <div class="modal-header">
                <div class="modal-status-icon error">
                    <i class="fas fa-times-circle"></i>
                </div>
                <h2 class="modal-title">Gagal Memproses</h2>
            </div>
            
            <div class="modal-warning">
                <p><i class="fas fa-exclamation-circle"></i> ${result.error || result.message || 'Terjadi kesalahan saat memproses gambar.'}</p>
            </div>
        `;
    }
    
    modalContent.innerHTML = html;
    modal.classList.add('active');
    // Lock scroll and keep current scroll position to prevent page jump
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    document.body.dataset.scrollY = scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Scroll modal content to top
    setTimeout(() => {
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }, 50);
}

function closeResultModal() {
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.classList.remove('active');
        // Restore scrolling after modal is closed without jumping
        const scrollY = document.body.dataset.scrollY ? parseInt(document.body.dataset.scrollY, 10) : 0;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        window.scrollTo(0, scrollY);
        const modalContent = document.getElementById('modalContent');
        if (modalContent) {
            modalContent.innerHTML = '';
        }
        
        // Reset upload zone to clean state
        resetUploadZone();
    }
}

// Close modal on Escape or Backspace key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 8) {
        // Check if modal is active
        const modal = document.getElementById('resultModal');
        if (modal && modal.classList.contains('active')) {
            e.preventDefault(); // Prevent browser back navigation
            closeResultModal();
        }
    }
});

// ========== LOADING OVERLAY ==========
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ========== TOAST NOTIFICATION ==========
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

function showPendingToast() {
    try {
        const stored = sessionStorage.getItem('cameraStoppedToast');
        if (stored) {
            const data = JSON.parse(stored);
            showToast(data.message || 'Kamera dimatikan', data.type || 'warning');
            sessionStorage.removeItem('cameraStoppedToast');
        }
    } catch (error) {
        console.error('Toast persistence error:', error);
        sessionStorage.removeItem('cameraStoppedToast');
    }
}

// ========== KEYBOARD SUPPORT FOR BUTTONS ==========
document.addEventListener('keydown', (e) => {
    // Check if key is Space (32) or Enter (13)
    if (e.keyCode === 32 || e.keyCode === 13 || e.key === ' ' || e.key === 'Enter') {
        // Don't trigger if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Allow Enter key for search input
            if (e.key === 'Enter' && e.target.id === 'searchInput') {
                e.preventDefault();
                searchFlowers();
            }
            return;
        }
        
        // Check which section is currently active/visible
        const klasifikasiSection = document.getElementById('klasifikasi');
        const pencarianSection = document.getElementById('pencarian');
        
        if (!klasifikasiSection || !pencarianSection) return;
        
        // Get viewport position
        const scrollY = window.scrollY;
        const klasifikasiTop = klasifikasiSection.offsetTop - 100;
        const pencarianTop = pencarianSection.offsetTop - 100;
        const pencarianBottom = pencarianTop + pencarianSection.offsetHeight;
        
        // Determine active mode based on scroll position
        let activeMode = null;
        
        if (scrollY >= klasifikasiTop && scrollY < pencarianTop) {
            activeMode = 'klasifikasi';
        } else if (scrollY >= pencarianTop && scrollY < pencarianBottom) {
            activeMode = 'pencarian';
        }
        
        // Execute button actions based on active mode
        if (activeMode === 'klasifikasi') {
            e.preventDefault();
            
            // Check if camera is active
            if (stream) {
                // Camera mode - trigger capture
                const captureBtn = document.getElementById('captureBtn');
                if (captureBtn && !captureBtn.disabled) {
                    captureImage();
                    showToast('Gambar diambil (Keyboard)', 'info');
                }
            } else {
                // Upload mode - trigger upload
                const fileInput = document.getElementById('fileInput');
                if (fileInput && fileInput.files.length > 0) {
                    uploadFile();
                    showToast('Mengunggah gambar (Keyboard)', 'info');
                } else {
                    // No file selected, open file picker
                    fileInput?.click();
                }
            }
        } else if (activeMode === 'pencarian') {
            e.preventDefault();
            
            // Search mode - trigger search
            const searchInput = document.getElementById('searchInput');
            const query = searchInput?.value.trim();
            
            if (query) {
                searchFlowers();
                showToast('Mencari... (Keyboard)', 'info');
            } else {
                showToast('Masukkan kata kunci pencarian', 'error');
                searchInput?.focus();
            }
        }
    }
});

// ========== CLEANUP ON PAGE UNLOAD ==========
window.addEventListener('beforeunload', () => {
    stopCamera();
});

console.log('🌸 AI Flower Classifier ready!');
