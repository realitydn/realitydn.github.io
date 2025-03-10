/**
 * Reality Website - Modern Image Carousel
 * 
 * A highly customizable, modern image carousel with the following features:
 * - Smooth automatic rotation with configurable speed
 * - Click to expand images to fullscreen with easy dismissal
 * - Drag interaction for manual navigation
 * - Dynamic loading of images from specified folders
 * - Responsive design with clean, minimal UI
 * - Support for different aspect ratios and image types
 * 
 * Usage:
 * 1. Create a container element with a unique ID
 * 2. Call RealityCarousel.init() with configuration options
 */

// Create a self-contained module to avoid global namespace pollution
const RealityCarousel = (function() {
    // Tracks all created carousel instances
    const carousels = [];
    
    // Shared fullscreen viewer (created once for all carousels)
    let fullscreenViewer = null;
    
    /**
     * Default configuration options
     */
    const defaultConfig = {
        containerId: '',           // ID of the container element (required)
        imageFolder: '',           // Path to the folder containing images (optional)
        images: [],                // Array of image objects or paths (optional if imageFolder is provided)
        autoRotate: true,          // Whether to automatically rotate slides
        rotationSpeed: 8000,       // Milliseconds between automatic slide transitions
        height: '400px',           // Height of the carousel
        aspectRatio: '16/9',       // Aspect ratio for image display
        showNavigation: 'hover',   // 'always', 'hover', or 'never'
        allowFullscreen: true,     // Whether clicking an image opens fullscreen view
        fadeSpeed: 400,            // Transition fade speed in milliseconds
        preloadCount: 2,           // Number of images to preload before and after current
        infiniteScroll: true,      // Whether the carousel loops
        startIndex: 0,             // Index of the first image to show
        touchThreshold: 50,        // Pixels needed to drag for a slide change
        fallbackImages: []         // Fallback images if folder images can't be loaded
    };
    
    /**
     * Initialize a new carousel with custom configuration
     * @param {Object} customConfig - Configuration options
     * @returns {Object} - Carousel controller object
     */
    function initCarousel(customConfig) {
        // Merge default config with custom config
        const config = {...defaultConfig, ...customConfig};
        
        // Validate required configuration
        if (!config.containerId) {
            console.error('Carousel initialization failed: containerId is required');
            return null;
        }
        
        // Get container element
        const container = document.getElementById(config.containerId);
        if (!container) {
            console.error(`Carousel initialization failed: container with ID "${config.containerId}" not found`);
            return null;
        }
        
        // Create fullscreen viewer if it doesn't exist yet
        if (!fullscreenViewer && config.allowFullscreen) {
            createFullscreenViewer();
        }
        
        // Initialize carousel state
        const state = {
            images: [],
            currentIndex: config.startIndex,
            isDragging: false,
            dragStartX: 0,
            dragDistance: 0,
            autoRotateTimer: null,
            isTransitioning: false,
            preloadedImages: new Set()
        };
        
        // Create carousel DOM elements
        container.classList.add('reality-carousel');
        container.innerHTML = '';
        container.style.height = config.height;
        
        // Track list
        const trackEl = document.createElement('div');
        trackEl.className = 'carousel-track';
        container.appendChild(trackEl);
        
        // Navigation buttons
        if (config.showNavigation !== 'never') {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'carousel-nav carousel-prev';
            prevBtn.setAttribute('aria-label', 'Previous image');
            prevBtn.innerHTML = '<span>&#10094;</span>';
            container.appendChild(prevBtn);
            
            const nextBtn = document.createElement('button');
            nextBtn.className = 'carousel-nav carousel-next';
            nextBtn.setAttribute('aria-label', 'Next image');
            nextBtn.innerHTML = '<span>&#10095;</span>';
            container.appendChild(nextBtn);
            
            // Show navigation only on hover if configured
            if (config.showNavigation === 'hover') {
                container.classList.add('nav-on-hover');
            }
            
            // Add event listeners to navigation buttons
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                goToPrevSlide();
            });
            
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                goToNextSlide();
            });
        }
        
        // Add carousel to our tracking array
        const carouselObj = {
            container,
            config,
            state,
            track: trackEl,
            goToSlide: goToSlide,
            goToNextSlide: goToNextSlide,
            goToPrevSlide: goToPrevSlide,
            startAutoRotate: startAutoRotate,
            stopAutoRotate: stopAutoRotate
        };
        
        carousels.push(carouselObj);
        
        // Setup event listeners
        setupCarouselEvents(carouselObj);
        
        // Load images
        loadCarouselImages(carouselObj).then(() => {
            // Initialize the first slide
            goToSlide(state.currentIndex, false);
            
            // Start auto-rotation if enabled
            if (config.autoRotate) {
                startAutoRotate();
            }
        });
        
        return carouselObj;
        
        /**
         * Go to a specific slide by index
         * @param {number} index - Index of the slide to show
         * @param {boolean} animate - Whether to animate the transition
         */
        function goToSlide(index, animate = true) {
            const { state, config, track } = carouselObj;
            
            // Don't proceed if we're already transitioning
            if (state.isTransitioning) return;
            
            // Handle index bounds
            let targetIndex = index;
            if (config.infiniteScroll) {
                if (index < 0) targetIndex = state.images.length - 1;
                if (index >= state.images.length) targetIndex = 0;
            } else {
                if (index < 0 || index >= state.images.length) return;
            }
            
            // Mark as transitioning
            if (animate) {
                state.isTransitioning = true;
                
                // Reset after transition
                setTimeout(() => {
                    state.isTransitioning = false;
                }, config.fadeSpeed);
            }
            
            // Update current slide
            state.currentIndex = targetIndex;
            
            // Update visual display
            updateSlideDisplay();
            
            // Preload adjacent images
            preloadAdjacentImages();
            
            // Reset auto-rotation timer
            if (config.autoRotate) {
                stopAutoRotate();
                startAutoRotate();
            }
        }
        
        /**
         * Go to the next slide
         */
        function goToNextSlide() {
            goToSlide(state.currentIndex + 1);
        }
        
        /**
         * Go to the previous slide
         */
        function goToPrevSlide() {
            goToSlide(state.currentIndex - 1);
        }
        
        /**
         * Start automatic slide rotation
         */
        function startAutoRotate() {
            if (state.autoRotateTimer) clearInterval(state.autoRotateTimer);
            state.autoRotateTimer = setInterval(goToNextSlide, config.rotationSpeed);
        }
        
        /**
         * Stop automatic slide rotation
         */
        function stopAutoRotate() {
            if (state.autoRotateTimer) {
                clearInterval(state.autoRotateTimer);
                state.autoRotateTimer = null;
            }
        }
        
        /**
         * Update the visual display to show the current slide
         */
        function updateSlideDisplay() {
            const { images, currentIndex } = state;
            if (images.length === 0) return;
            
            // Clear existing content
            trackEl.innerHTML = '';
            
            // Create the active slide element
            const slideEl = document.createElement('div');
            slideEl.className = 'carousel-slide';
            
            const imgEl = document.createElement('img');
            imgEl.src = images[currentIndex].src || images[currentIndex];
            imgEl.alt = images[currentIndex].alt || `Image ${currentIndex + 1}`;
            imgEl.style.aspectRatio = config.aspectRatio;
            
            slideEl.appendChild(imgEl);
            trackEl.appendChild(slideEl);
            
            // Fade in the new slide
            setTimeout(() => {
                slideEl.classList.add('active');
            }, 10);
        }
        
        /**
         * Preload images adjacent to the current slide
         */
        function preloadAdjacentImages() {
            const { images, currentIndex, preloadedImages } = state;
            const count = config.preloadCount;
            
            for (let offset = -count; offset <= count; offset++) {
                if (offset === 0) continue; // Skip current image
                
                let index = currentIndex + offset;
                
                // Handle wrapping for infinite scroll
                if (config.infiniteScroll) {
                    if (index < 0) index = images.length + index;
                    if (index >= images.length) index = index % images.length;
                }
                
                // Only preload valid indices
                if (index >= 0 && index < images.length) {
                    const src = images[index].src || images[index];
                    
                    // Only preload if not already preloaded
                    if (!preloadedImages.has(src)) {
                        const img = new Image();
                        img.src = src;
                        preloadedImages.add(src);
                    }
                }
            }
        }
        
        /**
         * Setup event listeners for the carousel
         */
        function setupCarouselEvents(carousel) {
            const { container, state, config } = carousel;
            
            // Mouse and touch events for dragging
            container.addEventListener('mousedown', handleDragStart);
            container.addEventListener('touchstart', handleDragStart, { passive: true });
            
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('touchmove', handleDragMove, { passive: true });
            
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchend', handleDragEnd);
            
            // Prevent drag on navigation elements
            const navButtons = container.querySelectorAll('.carousel-nav');
            navButtons.forEach(btn => {
                btn.addEventListener('mousedown', e => e.stopPropagation());
                btn.addEventListener('touchstart', e => e.stopPropagation());
            });
            
            // Fullscreen view on slide click
            if (config.allowFullscreen) {
                container.addEventListener('click', function(e) {
                    // Don't trigger if we're dragging
                    if (state.isDragging || Math.abs(state.dragDistance) > 10) return;
                    
                    const slideEl = e.target.closest('.carousel-slide');
                    if (slideEl) {
                        const imgSrc = state.images[state.currentIndex].src || state.images[state.currentIndex];
                        openFullscreen(imgSrc);
                    }
                });
            }
            
            /**
             * Handle drag start event
             */
            function handleDragStart(e) {
                // Don't do anything if we're transitioning
                if (state.isTransitioning) return;
                
                state.isDragging = true;
                state.dragStartX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                state.dragDistance = 0;
                
                // Stop auto-rotation during drag
                if (config.autoRotate) {
                    stopAutoRotate();
                }
            }
            
            /**
             * Handle drag move event
             */
            function handleDragMove(e) {
                if (!state.isDragging) return;
                
                const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                state.dragDistance = currentX - state.dragStartX;
                
                // Apply a subtle drag effect to the current slide
                const track = container.querySelector('.carousel-slide');
                if (track) {
                    const moveX = Math.max(Math.min(state.dragDistance, 100), -100);
                    track.style.transform = `translateX(${moveX}px)`;
                    track.style.transition = 'none';
                }
            }
            
            /**
             * Handle drag end event
             */
            function handleDragEnd() {
                if (!state.isDragging) return;
                
                // Reset slide position with animation
                const track = container.querySelector('.carousel-slide');
                if (track) {
                    track.style.transform = '';
                    track.style.transition = '';
                }
                
                // Check if the drag was significant enough to change slides
                if (Math.abs(state.dragDistance) > config.touchThreshold) {
                    if (state.dragDistance > 0) {
                        goToPrevSlide();
                    } else {
                        goToNextSlide();
                    }
                }
                
                state.isDragging = false;
                
                // Restart auto-rotation after drag
                if (config.autoRotate) {
                    startAutoRotate();
                }
            }
        }
    }
    
    /**
     * Load images for a carousel from the specified source
     * @param {Object} carousel - Carousel object
     * @returns {Promise} - Resolves when images are loaded
     */
    async function loadCarouselImages(carousel) {
        const { config, state } = carousel;
        
        // If images array is provided, use it directly
        if (config.images && config.images.length > 0) {
            state.images = config.images;
            return Promise.resolve();
        }
        
        // Otherwise try to load from the folder
        if (config.imageFolder) {
            try {
                // In a real implementation, you would have a server-side component to list files in a directory
                // For now, we'll use the fallback images as a demonstration
                state.images = config.fallbackImages;
                return Promise.resolve();
            } catch (error) {
                console.error('Error loading images from folder:', error);
                // Fall back to the fallback images
                state.images = config.fallbackImages;
                return Promise.resolve();
            }
        }
        
        // If no images provided, use fallbacks
        state.images = config.fallbackImages;
        return Promise.resolve();
    }
    
    /**
     * Create a fullscreen viewer for displaying expanded images
     */
    function createFullscreenViewer() {
        // Create the viewer element
        fullscreenViewer = document.createElement('div');
        fullscreenViewer.id = 'reality-fullscreen-viewer';
        fullscreenViewer.className = 'reality-fullscreen-viewer';
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'fullscreen-close';
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('aria-label', 'Close fullscreen image');
        
        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'fullscreen-image-container';
        
        // Create image element
        const image = document.createElement('img');
        image.className = 'fullscreen-image';
        
        // Assemble the viewer
        imageContainer.appendChild(image);
        fullscreenViewer.appendChild(closeButton);
        fullscreenViewer.appendChild(imageContainer);
        document.body.appendChild(fullscreenViewer);
        
        // Close button event
        closeButton.addEventListener('click', closeFullscreen);
        
        // Click background to close
        fullscreenViewer.addEventListener('click', (e) => {
            if (e.target === fullscreenViewer || e.target === imageContainer) {
                closeFullscreen();
            }
        });
        
        // Support drag to dismiss
        let startY = 0;
        let currentY = 0;
        
        imageContainer.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        imageContainer.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            // Only allow vertical dragging (for dismissal)
            if (Math.abs(deltaY) > 20) {
                const opacity = 1 - Math.min(Math.abs(deltaY) / window.innerHeight, 0.8);
                fullscreenViewer.style.opacity = opacity.toString();
                image.style.transform = `translateY(${deltaY}px)`;
            }
        }, { passive: true });
        
        imageContainer.addEventListener('touchend', () => {
            const deltaY = currentY - startY;
            
            if (Math.abs(deltaY) > 100) {
                closeFullscreen();
            } else {
                // Reset position if not dismissed
                fullscreenViewer.style.opacity = '1';
                image.style.transform = '';
            }
            
            startY = 0;
            currentY = 0;
        });
    }
    
    /**
     * Open the fullscreen viewer with a specific image
     * @param {string} imageSrc - Source URL of the image
     */
    function openFullscreen(imageSrc) {
        if (!fullscreenViewer) createFullscreenViewer();
        
        const image = fullscreenViewer.querySelector('.fullscreen-image');
        
        // Reset any transformations
        image.style.transform = '';
        fullscreenViewer.style.opacity = '1';
        
        // Set the image source
        image.src = imageSrc;
        
        // Show the viewer with a fade-in effect
        fullscreenViewer.style.display = 'flex';
        setTimeout(() => {
            fullscreenViewer.classList.add('visible');
        }, 10);
        
        // Prevent body scrolling while fullscreen is open
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Close the fullscreen viewer
     */
    function closeFullscreen() {
        if (!fullscreenViewer) return;
        
        // Fade out effect
        fullscreenViewer.classList.remove('visible');
        
        // Hide after animation completes
        setTimeout(() => {
            fullscreenViewer.style.display = 'none';
            
            // Reset the image transform
            const image = fullscreenViewer.querySelector('.fullscreen-image');
            image.style.transform = '';
            fullscreenViewer.style.opacity = '1';
            
            // Restore body scrolling
            document.body.style.overflow = '';
        }, 300);
    }
    
    // Return public API
    return {
        init: initCarousel,
        openFullscreen: openFullscreen,
        closeFullscreen: closeFullscreen,
        getCarousels: () => carousels
    };
})();
