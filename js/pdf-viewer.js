/**
 * Reality Website - Enhanced PDF Menu Viewer
 * Features:
 * - Clean, minimalist design matching site aesthetic
 * - Better responsiveness across all devices
 * - Improved scrolling behavior
 * - Option to view menu directly or download
 */

document.addEventListener('DOMContentLoaded', function() {
    // Find PDF container
    const menuViewer = document.querySelector('.menu-viewer');
    if (!menuViewer) return;
    
    // Check for mobile/tablet devices
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    
    // Create initial container with options
    menuViewer.innerHTML = `
        <div class="menu-options">
            <h3 class="translatable" data-en="Our Menu" data-vn="Thực Đơn Của Chúng Tôi">Our Menu</h3>
            <p class="translatable" data-en="Check out our drinks, snacks, and more" data-vn="Khám phá đồ uống, đồ ăn nhẹ và hơn thế nữa">
                Check out our drinks, snacks, and more
            </p>
            <div class="menu-actions">
                <button class="view-menu-btn cta-button translatable" data-en="View Menu" data-vn="Xem Thực Đơn">View Menu</button>
                <a href="menu.pdf" class="download-menu-btn translatable" download data-en="Download PDF" data-vn="Tải PDF">Download PDF</a>
            </div>
        </div>
        <div class="pdf-container" style="display: none;">
            <div class="pdf-controls">
                <button class="back-btn translatable" data-en="← Back" data-vn="← Quay lại">← Back</button>
                <a href="menu.pdf" class="download-inline-btn" download>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span class="translatable" data-en="Download" data-vn="Tải xuống">Download</span>
                </a>
            </div>
            <div class="pdf-loading">
                <div class="loading-spinner"></div>
                <span class="translatable" data-en="Loading menu..." data-vn="Đang tải thực đơn...">Loading menu...</span>
            </div>
            <div class="pdf-frame-container"></div>
        </div>
    `;
    
    // Add event listeners
    const viewMenuBtn = menuViewer.querySelector('.view-menu-btn');
    const backBtn = menuViewer.querySelector('.back-btn');
    const menuOptions = menuViewer.querySelector('.menu-options');
    const pdfContainer = menuViewer.querySelector('.pdf-container');
    const pdfFrameContainer = menuViewer.querySelector('.pdf-frame-container');
    
    // Show PDF viewer when "View Menu" is clicked
    viewMenuBtn.addEventListener('click', function() {
        menuOptions.style.display = 'none';
        pdfContainer.style.display = 'block';
        
        // Only load the PDF the first time it's requested
        if (!pdfFrameContainer.querySelector('iframe')) {
            loadPdfViewer();
        }
    });
    
    // Go back to menu options
    backBtn.addEventListener('click', function() {
        pdfContainer.style.display = 'none';
        menuOptions.style.display = 'block';
    });
    
    // Apply styles
    applyPdfViewerStyles();
    
    /**
     * Load the PDF viewer based on device type
     */
    function loadPdfViewer() {
        const pdfLoading = menuViewer.querySelector('.pdf-loading');
        
        // Create the PDF iframe with appropriate settings
        const iframe = document.createElement('iframe');
        
        // Set common attributes
        iframe.title = "Reality Menu";
        iframe.setAttribute('loading', 'lazy');
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.backgroundColor = '#fff';
        
        // Different approach for mobile vs desktop
        if (isMobile) {
            // For mobile: Add extra parameters for better mobile viewing
            // - page-fit: Fits the page to the viewport
            // - zoom=50: Start at 50% zoom for better readability
            // - toolbar=0: Hide the toolbar for more space
            iframe.style.height = '65vh';
            iframe.src = `menu.pdf#page=1&view=FitH,top&zoom=50&toolbar=0`;
            
            // Add mobile controls if needed
            const mobileControls = document.createElement('div');
            mobileControls.className = 'mobile-pdf-controls';
            mobileControls.innerHTML = `
                <p class="translatable" data-en="Pinch to zoom, swipe to navigate" data-vn="Chụm để phóng to, vuốt để điều hướng">
                    <small>Pinch to zoom, swipe to navigate</small>
                </p>
            `;
            pdfFrameContainer.appendChild(mobileControls);
        } else if (isTablet) {
            // For tablets: Similar to mobile but with more height
            iframe.style.height = '70vh';
            iframe.src = `menu.pdf#page=1&view=FitH,top&zoom=75&toolbar=0`;
        } else {
            // For desktop: More standard viewing experience
            iframe.style.height = '80vh';
            iframe.src = `menu.pdf#page=1&view=FitH&toolbar=1`;
        }
        
        // Add iframe to container
        pdfFrameContainer.appendChild(iframe);
        
        // Hide loading indicator when iframe loads
        iframe.onload = function() {
            pdfLoading.style.display = 'none';
        };
        
        // Add error handling
        setTimeout(() => {
            if (pdfLoading.style.display !== 'none') {
                pdfLoading.innerHTML = `
                    <p class="translatable" data-en="Having trouble loading the menu?" data-vn="Gặp sự cố khi tải thực đơn?">
                        Having trouble loading the menu?
                    </p>
                    <a href="menu.pdf" class="cta-button translatable" download data-en="Download Instead" data-vn="Tải Xuống">
                        Download Instead
                    </a>
                `;
            }
        }, 8000);
    }
    
    /**
     * Apply custom styles for the PDF viewer
     */
    function applyPdfViewerStyles() {
        // Create a style element
        const style = document.createElement('style');
        style.textContent = `
            /* PDF Viewer Styles */
            .menu-viewer {
                background-color: rgba(255, 255, 255, 0.7);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
                padding: 0;
                overflow: hidden;
                position: relative;
                border-radius: var(--border-radius, 0px);
                height: auto !important;
                min-height: 600px;
            }
            
            .menu-options {
                padding: 2.5rem;
                text-align: left;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            
            .menu-options h3 {
                margin-bottom: 1rem;
                position: relative;
                padding-bottom: 0.5rem;
            }
            
            .menu-options h3:after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 40px;
                height: 4px;
                background: linear-gradient(90deg, #000000, #00000000);
            }
            
            .menu-options p {
                margin-bottom: 2rem;
                max-width: 30em;
            }
            
            .menu-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                align-items: center;
            }
            
            .view-menu-btn {
                margin: 0;
            }
            
            .download-menu-btn {
                color: #111;
                text-decoration: underline;
                font-weight: 600;
                padding: 0.5rem 1rem;
            }
            
            .pdf-container {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            .pdf-controls {
                display: flex;
                justify-content: space-between;
                padding: 1rem 1.5rem;
                background-color: #f8f8f8;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            }
            
            .back-btn {
                background: none;
                border: none;
                color: #111;
                font-weight: 600;
                cursor: pointer;
                padding: 0.5rem 0;
            }
            
            .back-btn:hover {
                text-decoration: underline;
            }
            
            .download-inline-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: #111;
                text-decoration: none;
                font-weight: 600;
                padding: 0.5rem 0;
            }
            
            .download-inline-btn:hover {
                text-decoration: underline;
            }
            
            .pdf-loading {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 200px;
                color: #555;
            }
            
            .loading-spinner {
                border: 3px solid rgba(0, 0, 0, 0.1);
                border-top: 3px solid #000;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin-bottom: 1rem;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .pdf-frame-container {
                flex: 1;
                width: 100%;
            }
            
            .pdf-frame-container iframe {
                width: 100%;
                height: 100%;
                border: none;
                display: block;
            }
            
            .mobile-pdf-controls {
                text-align: center;
                padding: 0.5rem;
                background-color: #f8f8f8;
                border-top: 1px solid rgba(0, 0, 0, 0.05);
                font-size: 0.8rem;
                color: #555;
            }
            
            /* Responsive adjustments */
            @media screen and (max-width: 768px) {
                .menu-viewer {
                    min-height: 500px;
                }
                .menu-options {
                    padding: 2rem;
                }
                .menu-actions {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .view-menu-btn {
                    width: 100%;
                }
            }
            
            @media screen and (max-width: 576px) {
                .menu-viewer {
                    min-height: 400px;
                }
                .menu-options {
                    padding: 1.5rem;
                }
                .pdf-controls {
                    padding: 0.8rem 1rem;
                }
            }
        `;
        
        // Append style to document head
        document.head.appendChild(style);
    }
});
