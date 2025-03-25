/**
 * Reality Website - Lazy-Loading PDF Viewer
 * Features:
 * - Loads PDF only when scrolled into view
 * - Provides fallback text and download option
 * - Better mobile compatibility
 */

document.addEventListener('DOMContentLoaded', function() {
    // Find PDF container
    const menuViewer = document.querySelector('.menu-viewer');
    if (!menuViewer) return;
    
    // Check for mobile/low-performance devices
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    
    // Create initial placeholder content with loading state
    menuViewer.innerHTML = `
        <div class="pdf-placeholder">
            <h3>Our Menu</h3>
            <p>Scroll down to view our menu or download it below.</p>
            <a href="menu.pdf" class="cta-button" download>Download Menu</a>
            <div class="pdf-loading">Loading menu preview...</div>
        </div>
    `;
    
    // Create intersection observer to load PDF only when scrolled into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadPdfViewer(menuViewer);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    // Start observing
    observer.observe(menuViewer);
    
    /**
     * Load the PDF viewer with appropriate settings for the device
     */
    function loadPdfViewer(container) {
        const placeholder = container.querySelector('.pdf-placeholder');
        const loadingElem = container.querySelector('.pdf-loading');
        
        // Different approach for mobile vs desktop
        if (isMobile) {
            // For mobile: Simplified viewer with better controls
            loadingElem.textContent = "Preparing mobile-friendly menu viewer...";
            
            // Create a more mobile-friendly container
            const mobileViewer = document.createElement('div');
            mobileViewer.className = 'mobile-pdf-viewer';
            
            // Add mobile-optimized iframe with specific settings
            // - page-fit: Fits the page to the viewport
            // - zoom=50: Start at 50% zoom for better readability
            // - toolbar=0: Hide the toolbar for more space
            mobileViewer.innerHTML = `
                <iframe 
                    src="menu.pdf#page=1&view=FitH,top&zoom=50&toolbar=0" 
                    width="100%" 
                    height="500px" 
                    style="border: none; max-width: 100%;"
                    title="Reality Menu"
                    loading="lazy">
                </iframe>
                <div class="mobile-pdf-controls">
                    <p><small>Pinch to zoom, swipe to navigate pages</small></p>
                </div>
            `;
            
            // Add mobile viewer to container
            container.appendChild(mobileViewer);
            
            // Hide loading, but keep download button
            loadingElem.style.display = 'none';
        } else {
            // For desktop: Standard PDF embed with more features
            loadingElem.textContent = "Loading menu...";
            
            // Create iframe for desktop
            const iframe = document.createElement('iframe');
            iframe.src = "menu.pdf";
            iframe.width = "100%";
            iframe.height = "1000px";
            iframe.style.border = "none";
            iframe.title = "Reality Menu";
            iframe.setAttribute('loading', 'lazy');
            
            // Add iframe after placeholder
            container.appendChild(iframe);
            
            // Hide loading indicator when iframe loads
            iframe.onload = function() {
                loadingElem.style.display = 'none';
            };
        }
        
        // Add error handling
        setTimeout(() => {
            if (loadingElem.style.display !== 'none') {
                loadingElem.innerHTML = `
                    <p>Having trouble loading the menu?</p>
                    <p>Download it instead or try again later.</p>
                `;
            }
        }, 8000);
    }
});
