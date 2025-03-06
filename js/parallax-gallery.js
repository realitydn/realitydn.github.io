/**
 * Reality Website - Parallax Scroll Gallery
 * 
 * This script creates a parallax effect gallery that replaces the Instagram feed.
 * Images move at different speeds as the user scrolls, creating a sense of depth.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Gallery configuration
    const galleryConfig = {
        imageCount: 8,           // Number of images to display
        baseSpeed: 0.05,         // Base speed for parallax effect
        speedVariance: 0.28,     // Additional random speed variance between images
        imageFolder: 'images/gallery/', // Path to gallery images
        // Fallback images if folder images aren't available
        fallbackImages: [
            'https://picsum.photos/seed/reality1/800/800',
            'https://picsum.photos/seed/reality2/800/800',
            'https://picsum.photos/seed/reality3/800/800',
            'https://picsum.photos/seed/reality4/800/800',
            'https://picsum.photos/seed/reality5/800/800',
            'https://picsum.photos/seed/reality6/800/800',
            'https://picsum.photos/seed/reality7/800/800',
            'https://picsum.photos/seed/reality8/800/800'
        ]
    };
    
    // Reference to gallery container
    const galleryContainer = document.getElementById('parallax-gallery');
    
    if (!galleryContainer) return;
    
    // Initialize the gallery
    createGallery(galleryContainer, galleryConfig);
    
    // Set up scroll listeners for parallax effect
    setupParallaxEffect();
    
    // Handle window resize events
    window.addEventListener('resize', function() {
        // Recalculate positions and sizes when window is resized
        setupParallaxEffect();
    });
    
    /**
     * Creates the gallery by populating it with images
     * @param {HTMLElement} container - The gallery container element
     * @param {Object} config - The gallery configuration options
     */
    function createGallery(container, config) {
        // Clear any existing content
        container.innerHTML = '';
        
        // Create grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'parallax-grid';
        container.appendChild(gridContainer);
        
        // Add images
        for (let i = 0; i < config.imageCount; i++) {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'parallax-item';
            
            // Add data attribute for parallax speed
            // Create different speeds for different images
            const parallaxSpeed = config.baseSpeed + (Math.random() * config.speedVariance);
            itemContainer.dataset.speed = parallaxSpeed.toFixed(3);
            
            // Create image element
            const img = document.createElement('img');
            
            // Try to load from the local folder first
            const localImagePath = `${config.imageFolder}image${i+1}.jpg`;
            
            // Set fallback image as a backup
            img.onerror = function() {
                this.src = config.fallbackImages[i % config.fallbackImages.length];
                this.onerror = null; // Prevent infinite loop if fallback also fails
            };
            
            img.src = localImagePath;
            img.alt = 'Gallery image ' + (i + 1);
            img.loading = 'lazy'; // Lazy load images
            
            // Add image to container
            itemContainer.appendChild(img);
            
            // Add item to grid
            gridContainer.appendChild(itemContainer);
        }
    }
    
    /**
     * Sets up the parallax effect for the gallery images
     */
    function setupParallaxEffect() {
        const parallaxItems = document.querySelectorAll('.parallax-item');
        let ticking = false;
        
        // Initial positioning of items
        updateItemPositions();
        
        // Add scroll event listener
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    updateItemPositions();
                    ticking = false;
                });
                ticking = true;
            }
        });
        
        /**
         * Updates the position of all parallax items based on scroll position
         */
        function updateItemPositions() {
            const scrollTop = window.pageYOffset;
            
            parallaxItems.forEach(item => {
                // Get the item's position relative to the viewport
                const rect = item.getBoundingClientRect();
                
                // Only apply parallax if the item is visible
                if (rect.bottom >= 0 && rect.top <= window.innerHeight) {
                    // Calculate how far the item is from the center of the viewport
                    const distanceFromCenter = (rect.top + rect.height / 2) - (window.innerHeight / 2);
                    
                    // Apply parallax effect based on distance and item's speed
                    const speed = parseFloat(item.dataset.speed);
                    const translateY = distanceFromCenter * speed;
                    
                    // Apply transform
                    item.style.transform = `translateY(${translateY}px)`;
                }
            });
        }
    }
});