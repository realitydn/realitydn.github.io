/**
 * Reality Website - Multi-Image Carousel
 * 
 * Features:
 * - Displays multiple images simultaneously
 * - Smooth sliding transitions
 * - Automatic rotation at configurable speeds
 * - Continuous infinite scroll with no snap-back
 * - Click-to-fullscreen and swipe navigation
 */

const RealityCarousel = (function() {
    // Tracks all carousel instances
    const carousels = [];
    
    // Shared fullscreen viewer
    let fullscreenViewer = null;
    
    // Default configuration
    const defaultConfig = {
        containerId: '',           // Container element ID (required)
        imageFolder: '',           // Path to image folder
        images: [],                // Array of image objects or paths
        visibleImages: 3,          // Number of images visible at once
        autoRotate: true,          // Enable automatic rotation
        rotationSpeed: 5000,       // Milliseconds between rotations
        transitionSpeed: 600,      // Transition duration in ms
        height: '400px',           // Carousel height
        gap: 20,                   // Gap between slides in pixels
        allowFullscreen: true,     // Enable fullscreen on click
        startIndex: 0,             // Starting index
        momentumFactor: 0.92,      // Momentum slowdown factor (lower = faster stop)
        fallbackImages: [],        // Fallback images
        aspectRatio: 'auto'        // Image aspect ratio
    };
    
    /**
     * Initialize a new carousel with custom configuration
     */
    function initCarousel(customConfig) {
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
        
        // Create fullscreen viewer if needed
        if (!fullscreenViewer && config.allowFullscreen) {
            createFullscreenViewer();
        }
        
        // Initialize carousel state
        const state = {
            originalImages: [],    // Original image array
            images: [],            // Complete image array including clones
            currentIndex: config.startIndex,
            isDragging: false,
            dragStartX: 0,
            dragCurrentX: 0,
            lastDragPosition: 0,
            dragVelocity: 0,
            isAnimating: false,
            autoRotateTimer: null,
            preloadedImages: new Set(),
            trackPosition: 0,
            itemWidth: 0,
            cloneCount: 0          // Number of clones at each end
        };
        
        // Set up DOM elements
        container.classList.add('reality-multi-carousel');
        container.style.height = config.height;
        container.innerHTML = '';
        
        // Create track element
        const track = document.createElement('div');
        track.className = 'carousel-track';
        container.appendChild(track);
        
        // Create navigation buttons
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-nav carousel-prev';
        prevBtn.innerHTML = '<span>&#10094;</span>';
        prevBtn.setAttribute('aria-label', 'Previous');
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-nav carousel-next';
        nextBtn.innerHTML = '<span>&#10095;</span>';
        nextBtn.setAttribute('aria-label', 'Next');
        
        container.appendChild(prevBtn);
        container.appendChild(nextBtn);
        
        // Carousel object
        const carousel = {
            container,
            track,
            config,
            state,
            prevBtn,
            nextBtn
        };
        
        // Add to our collection
        carousels.push(carousel);
        
        // Add event listeners
        prevBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            goToPrevSlide(carousel);
        });
        
        nextBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            goToNextSlide(carousel);
        });
        
        // Setup other event listeners
        setupEventListeners(carousel);
        
        // Load images and initialize
        loadImages(carousel).then(() => {
            // Clone images for infinite scroll
            setupInfiniteScroll(carousel);
            
            // Set initial position
            updateCarouselLayout(carousel);
            renderSlides(carousel);
            
            // Initialize position
            initializePosition(carousel);
            
            // Start auto-rotation if enabled
            if (config.autoRotate) {
                startAutoRotate(carousel);
            }
            
            // Handle window resize
            window.addEventListener('resize', function() {
                updateCarouselLayout(carousel);
                renderSlides(carousel);
                initializePosition(carousel);
            });
        });
        
        return carousel;
    }
    
    /**
     * Set up infinite scroll by duplicating items
     */
    function setupInfiniteScroll(carousel) {
        const { state, config } = carousel;
        
        // Store original images
        state.originalImages = [...state.images];
        
        // Set clone count based on visible images
        state.cloneCount = config.visibleImages + 1;
        
        // Only proceed if we have images
        if (state.originalImages.length === 0) {
            return;
        }
        
        // Create expanded array with clones at both ends
        const originalLength = state.originalImages.length;
        let expanded = [];
        
        // Add clones at the beginning (from end of original array)
        for (let i = 0; i < state.cloneCount; i++) {
            const sourceIndex = (originalLength - 1) - (i % originalLength);
            expanded.push(state.originalImages[sourceIndex]);
        }
        
        // Add original images
        expanded = [...expanded.reverse(), ...state.originalImages];
        
        // Add clones at the end (from beginning of original array)
        for (let i = 0; i < state.cloneCount; i++) {
            const sourceIndex = i % originalLength;
            expanded.push(state.originalImages[sourceIndex]);
        }
        
        // Update state
        state.images = expanded;
    }
    
    /**
     * Initialize the carousel position
     */
    function initializePosition(carousel) {
        const { state, track, config } = carousel;
        
        // Set the initial current index to point to the first non-clone item
        state.currentIndex = state.cloneCount;
        
        // Position the track
        track.style.transition = 'none';
        updateTrackPosition(carousel);
        
        // Force reflow
        track.offsetHeight;
    }
    
    /**
     * Update the track position based on current index
     */
    function updateTrackPosition(carousel) {
        const { state, track, config } = carousel;
        
        // Calculate position
        const position = -state.currentIndex * (state.itemWidth + config.gap);
        track.style.transform = `translateX(${position}px)`;
        state.trackPosition = position;
    }
    
    /**
     * Go to the previous slide
     */
    function goToPrevSlide(carousel) {
        const { state, track, config } = carousel;
        
        // Don't proceed if animating
        if (state.isAnimating) return;
        
        state.isAnimating = true;
        state.currentIndex--;
        
        // Enable transition
        track.style.transition = `transform ${config.transitionSpeed}ms ease`;
        
        // Update position
        updateTrackPosition(carousel);
        
        // Check if we need to reposition after animation ends
        checkRepositionNeeded(carousel);
        
        // Clear animation state after transition
        setTimeout(() => {
            state.isAnimating = false;
        }, config.transitionSpeed);
        
        // Reset auto-rotation
        if (config.autoRotate) {
            stopAutoRotate(carousel);
            startAutoRotate(carousel);
        }
    }
    
    /**
     * Go to the next slide
     */
    function goToNextSlide(carousel) {
        const { state, track, config } = carousel;
        
        // Don't proceed if animating
        if (state.isAnimating) return;
        
        state.isAnimating = true;
        state.currentIndex++;
        
        // Enable transition
        track.style.transition = `transform ${config.transitionSpeed}ms ease`;
        
        // Update position
        updateTrackPosition(carousel);
        
        // Check if we need to reposition after animation ends
        checkRepositionNeeded(carousel);
        
        // Clear animation state after transition
        setTimeout(() => {
            state.isAnimating = false;
        }, config.transitionSpeed);
        
        // Reset auto-rotation
        if (config.autoRotate) {
            stopAutoRotate(carousel);
            startAutoRotate(carousel);
        }
    }
    
    /**
     * Start automatic rotation
     */
    function startAutoRotate(carousel) {
        const { state, config } = carousel;
        
        // Clear any existing timer
        if (state.autoRotateTimer) {
            clearInterval(state.autoRotateTimer);
        }
        
        // Set new timer
        state.autoRotateTimer = setInterval(() => {
            goToNextSlide(carousel);
        }, config.rotationSpeed);
    }
    
    /**
     * Stop automatic rotation
     */
    function stopAutoRotate(carousel) {
        const { state } = carousel;
        
        if (state.autoRotateTimer) {
            clearInterval(state.autoRotateTimer);
            state.autoRotateTimer = null;
        }
    }
    
    /**
     * Check if the carousel needs to reposition for infinite scrolling
     */
    function checkRepositionNeeded(carousel) {
        const { state, track } = carousel;
        
        // Only needed if we have clones
        if (state.cloneCount === 0 || state.originalImages.length === 0) {
            return;
        }
        
        // Set up the transitionend handler for this specific transition
        const handleTransitionEnd = function() {
            // Remove the event listener
            track.removeEventListener('transitionend', handleTransitionEnd);
            
            // Disable transition
            track.style.transition = 'none';
            
            const originalLength = state.originalImages.length;
            
            // If we've scrolled into the beginning clones, jump to the real items at the end
            if (state.currentIndex < state.cloneCount) {
                state.currentIndex += originalLength;
                updateTrackPosition(carousel);
            }
            // If we've scrolled into the end clones, jump to the real items at the beginning
            else if (state.currentIndex >= state.cloneCount + originalLength) {
                state.currentIndex -= originalLength;
                updateTrackPosition(carousel);
            }
            
            // Force reflow
            track.offsetHeight;
        };
        
        // Add the transition end handler
        track.addEventListener('transitionend', handleTransitionEnd, { once: true });
    }
    
    /**
     * Setup event listeners for drag and swipe
     */
    function setupEventListeners(carousel) {
        const { container, track, config, state } = carousel;
        
        // Drag start
        function handleDragStart(e) {
            if (state.isAnimating) return;
            
            state.isDragging = true;
            state.dragStartX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            state.lastDragPosition = state.dragStartX;
            
            // Disable transition during drag
            track.style.transition = 'none';
            
            // Stop auto rotation during drag
            if (config.autoRotate) {
                stopAutoRotate(carousel);
            }
            
            if (e.type === 'mousedown') {
                e.preventDefault();
            }
        }
        
        // Drag move
        function handleDragMove(e) {
            if (!state.isDragging) return;
            
            state.dragCurrentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const dragDelta = state.dragCurrentX - state.dragStartX;
            
            // Update track position
            const newPosition = state.trackPosition + dragDelta;
            track.style.transform = `translateX(${newPosition}px)`;
        }
        
        // Drag end
        function handleDragEnd(e) {
            if (!state.isDragging) return;
            
            state.isDragging = false;
            
            // Calculate final position
            const dragDelta = state.dragCurrentX - state.dragStartX;
            state.trackPosition += dragDelta;
            
            // Determine which slide to snap to
            const slideWidth = state.itemWidth + config.gap;
            const dragThreshold = slideWidth * 0.2; // 20% of slide width
            
            if (Math.abs(dragDelta) > dragThreshold) {
                // Significant drag, move to next/prev slide
                if (dragDelta > 0) {
                    state.currentIndex--;
                } else {
                    state.currentIndex++;
                }
            }
            
            // Re-enable transition
            track.style.transition = `transform ${config.transitionSpeed}ms ease`;
            
            // Update position
            updateTrackPosition(carousel);
            
            // Check if repositioning is needed
            checkRepositionNeeded(carousel);
            
            // Restart auto-rotation
            if (config.autoRotate) {
                startAutoRotate(carousel);
            }
        }
        
        // Fullscreen view on click
        if (config.allowFullscreen) {
            container.addEventListener('click', function(e) {
                // Don't trigger if we're dragging
                if (state.isDragging || Math.abs(state.dragCurrentX - state.dragStartX) > 10) {
                    return;
                }
                
                // Get the clicked slide
                const slideEl = e.target.closest('.carousel-slide');
                if (slideEl && slideEl.dataset.index) {
                    const index = parseInt(slideEl.dataset.index, 10);
                    
                    // Convert to original index
                    const originalIndex = getRealIndex(carousel, index);
                    
                    // Get the image source
                    if (originalIndex >= 0 && originalIndex < state.originalImages.length) {
                        const image = state.originalImages[originalIndex];
                        const imgSrc = image.src || image;
                        openFullscreen(imgSrc);
                    }
                }
            });
        }
        
        // Mouse events
        container.addEventListener('mousedown', handleDragStart);
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        
        // Touch events
        container.addEventListener('touchstart', handleDragStart, { passive: true });
        window.addEventListener('touchmove', handleDragMove, { passive: true });
        window.addEventListener('touchend', handleDragEnd);
        
        // Prevent drag start on buttons
        carousel.prevBtn.addEventListener('mousedown', e => e.stopPropagation());
        carousel.nextBtn.addEventListener('mousedown', e => e.stopPropagation());
        carousel.prevBtn.addEventListener('touchstart', e => e.stopPropagation());
        carousel.nextBtn.addEventListener('touchstart', e => e.stopPropagation());
    }
    
    /**
     * Convert display index to original image index
     */
    function getRealIndex(carousel, index) {
        const { state } = carousel;
        
        if (state.originalImages.length === 0) {
            return 0;
        }
        
        // Adjust for clones
        const adjustedIndex = index - state.cloneCount;
        
        // Use modulo to handle wrap-around
        return ((adjustedIndex % state.originalImages.length) + state.originalImages.length) 
               % state.originalImages.length;
    }
    
    /**
     * Update carousel layout based on container size
     */
    function updateCarouselLayout(carousel) {
        const { container, config, state } = carousel;
        
        // Calculate item width based on container width and visible images
        const containerWidth = container.clientWidth;
        const totalGapWidth = (config.visibleImages - 1) * config.gap;
        const itemWidth = (containerWidth - totalGapWidth) / config.visibleImages;
        
        // Update state
        state.itemWidth = itemWidth;
    }
    
    /**
     * Render all slides in the carousel
     */
    function renderSlides(carousel) {
        const { track, config, state } = carousel;
        
        // Clear existing slides
        track.innerHTML = '';
        
        // Create slides for each image
        state.images.forEach((image, index) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.dataset.index = index;
            
            // Apply width and gap
            slide.style.width = `${state.itemWidth}px`;
            slide.style.marginRight = `${config.gap}px`;
            
            // Create image element
            const img = document.createElement('img');
            img.src = image.src || image;
            
            // Find original index for alt text
            const originalIndex = getRealIndex(carousel, index);
            img.alt = image.alt || `Image ${originalIndex + 1}`;
            
            // Apply aspect ratio if specified
            if (config.aspectRatio !== 'auto') {
                img.style.aspectRatio = config.aspectRatio;
            }
            
            slide.appendChild(img);
            track.appendChild(slide);
        });
    }
    
    /**
     * Load images for the carousel
     */
    async function loadImages(carousel) {
        const { config, state } = carousel;
        
        // Use provided images array if available
        if (config.images && config.images.length > 0) {
            state.images = [...config.images];
            return Promise.resolve();
        }
        
        // Try to load images from the specified folder
        if (config.imageFolder) {
            console.log(`Attempting to load images from folder: ${config.imageFolder}`);
            
            try {
                // Try to load files from directory
                const folderImages = await tryLoadImagesFromFolder(config.imageFolder);
                
                if (folderImages && folderImages.length > 0) {
                    console.log(`Successfully loaded ${folderImages.length} images from ${config.imageFolder}`);
                    state.images = folderImages;
                    return Promise.resolve();
                } else {
                    console.log(`No images found in ${config.imageFolder}, using fallbacks`);
                }
            } catch (error) {
                console.warn(`Error loading images from folder: ${error.message}`);
            }
        }
        
        // Use fallback images if provided and folder loading failed
        if (config.fallbackImages && config.fallbackImages.length > 0) {
            console.log(`Using ${config.fallbackImages.length} fallback images`);
            state.images = [...config.fallbackImages];
            return Promise.resolve();
        }
        
        // Default fallback
        console.log('Using default fallback images');
        state.images = [
            'https://picsum.photos/seed/img1/800/600',
            'https://picsum.photos/seed/img2/800/600',
            'https://picsum.photos/seed/img3/800/600',
            'https://picsum.photos/seed/img4/800/600'
        ];
        
        return Promise.resolve();
    }
    
    /**
     * Try to load images from a folder by checking for common image files
     */
    async function tryLoadImagesFromFolder(folderPath) {
        // Make sure folder path ends with a slash
        if (!folderPath.endsWith('/')) {
            folderPath += '/';
        }
        
        // Common image extensions to check
        const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        // Common naming patterns
        const namingPatterns = [
            // Numbered sequence: image1.jpg, image2.jpg, etc.
            { prefix: 'image', start: 1, count: 20 },
            
            // Simple numbered: 1.jpg, 2.jpg, etc.
            { prefix: '', start: 1, count: 20 },
            
            // Specific to your project
            { prefix: 'flyer', start: 1, count: 10 },
            { prefix: 'space', start: 1, count: 10 },
            { prefix: 'photo', start: 1, count: 10 }
        ];
        
        // Array to collect found image paths
        const foundImages = [];
        const loadPromises = [];
        
        // Try each naming pattern
        for (const pattern of namingPatterns) {
            for (let i = pattern.start; i < pattern.start + pattern.count; i++) {
                for (const ext of extensions) {
                    const filename = `${pattern.prefix}${i}.${ext}`;
                    const imagePath = `${folderPath}${filename}`;
                    
                    // Create a promise that resolves with the image path if it loads successfully
                    const loadPromise = new Promise(resolve => {
                        const img = new Image();
                        img.onload = function() {
                            resolve(imagePath);
                        };
                        img.onerror = function() {
                            resolve(null); // Resolve with null if image doesn't load
                        };
                        img.src = imagePath;
                    });
                    
                    loadPromises.push(loadPromise);
                }
            }
        }
        
        // Wait for all image load attempts to complete
        const results = await Promise.all(loadPromises);
        
        // Filter out null results (images that didn't load)
        const validImages = results.filter(path => path !== null);
        
        console.log(`Found ${validImages.length} valid images in ${folderPath}`);
        return validImages;
    }
    
    /**
     * Create a fullscreen viewer for displaying expanded images
     */
    function createFullscreenViewer() {
        // Create viewer elements
        fullscreenViewer = document.createElement('div');
        fullscreenViewer.id = 'reality-fullscreen-viewer';
        fullscreenViewer.className = 'reality-fullscreen-viewer';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'fullscreen-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close fullscreen view');
        
        const imageContainer = document.createElement('div');
        imageContainer.className = 'fullscreen-image-container';
        
        const image = document.createElement('img');
        image.className = 'fullscreen-image';
        
        // Assemble elements
        imageContainer.appendChild(image);
        fullscreenViewer.appendChild(closeBtn);
        fullscreenViewer.appendChild(imageContainer);
        document.body.appendChild(fullscreenViewer);
        
        // Event listeners
        closeBtn.addEventListener('click', closeFullscreen);
        
        // Click background to close
        fullscreenViewer.addEventListener('click', function(e) {
            if (e.target === fullscreenViewer || e.target === imageContainer) {
                closeFullscreen();
            }
        });
        
        // Swipe to dismiss
        let startY, currentY;
        
        imageContainer.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        imageContainer.addEventListener('touchmove', function(e) {
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            if (Math.abs(deltaY) > 20) {
                const opacity = 1 - Math.min(Math.abs(deltaY) / window.innerHeight, 0.8);
                fullscreenViewer.style.opacity = opacity.toString();
                image.style.transform = `translateY(${deltaY}px)`;
            }
        }, { passive: true });
        
        imageContainer.addEventListener('touchend', function() {
            const deltaY = currentY - startY;
            
            if (Math.abs(deltaY) > 100) {
                closeFullscreen();
            } else {
                fullscreenViewer.style.opacity = '1';
                image.style.transform = '';
            }
        });
    }
    
    /**
     * Open the fullscreen viewer
     */
    function openFullscreen(imageSrc) {
        if (!fullscreenViewer) createFullscreenViewer();
        
        const image = fullscreenViewer.querySelector('.fullscreen-image');
        
        // Reset styles
        image.style.transform = '';
        fullscreenViewer.style.opacity = '1';
        
        // Set image source
        image.src = imageSrc;
        
        // Show viewer
        fullscreenViewer.style.display = 'flex';
        setTimeout(() => {
            fullscreenViewer.classList.add('visible');
        }, 10);
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Close the fullscreen viewer
     */
    function closeFullscreen() {
        fullscreenViewer.classList.remove('visible');
        
        setTimeout(() => {
            fullscreenViewer.style.display = 'none';
            
            // Reset styles
            const image = fullscreenViewer.querySelector('.fullscreen-image');
            image.style.transform = '';
            fullscreenViewer.style.opacity = '1';
            
            // Restore body scrolling
            document.body.style.overflow = '';
        }, 300);
    }
    
    // Public API
    return {
        init: initCarousel,
        openFullscreen,
        closeFullscreen
    };
})();