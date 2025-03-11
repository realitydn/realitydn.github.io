/**
 * Reality Website - Multi-Image Carousel
 * Performance-optimized version with:
 * - Reliable directory scanning
 * - Proper infinite scrolling that prevents showing empty spaces
 * - Efficient image loading with preloading
 */

const RealityCarousel = (function() {
    // Track all carousels
    const carousels = [];
    
    // Shared fullscreen viewer
    let fullscreenViewer = null;
    
    // Device detection for adaptive features
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    
    // Default configuration with device-specific defaults
    const defaultConfig = {
        containerId: '',           // Container element ID (required)
        imageFolder: '',           // Path to image folder
        images: [],                // Array of image objects or paths
        visibleImages: isMobile ? 1 : 3, // Fewer images on mobile
        autoRotate: true,          // Enable automatic rotation
        rotationSpeed: 5000,       // Milliseconds between rotations
        transitionSpeed: 600,      // Transition duration in ms
        height: '400px',           // Carousel height
        gap: 20,                   // Gap between slides in pixels
        allowFullscreen: true,     // Enable fullscreen on click
        startIndex: 0,             // Starting index
        fallbackImages: [],        // Fallback images
        aspectRatio: 'auto',       // Image aspect ratio
        lazyLoad: true,            // Enable lazy loading for better performance
        infiniteScroll: true,      // Enable true infinite scrolling
        returnToStart: true        // When reaching the end, return to start (used if infiniteScroll is false)
    };
    
    /**
     * Initialize a new carousel with custom configuration
     */
    function initCarousel(customConfig) {
        const config = {...defaultConfig, ...customConfig};
        
        // Adaptive configuration based on screen size
        if (window.innerWidth < 576) {
            config.visibleImages = 1; // Single image on very small screens
        } else if (window.innerWidth < 768) {
            config.visibleImages = 2; // Two images on small screens
        }
        
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
        
        // Show loading indicator
        container.classList.add('reality-multi-carousel');
        container.style.height = config.height;
        container.innerHTML = '<div class="carousel-loading">Loading images...</div>';
        
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
        
        // Carousel state object
        const state = {
            originalImages: [],    // Original array of images (without clones)
            images: [],            // Current array including clones for infinite scroll
            currentIndex: config.startIndex,
            isDragging: false,
            startX: 0,
            currentX: 0,
            position: 0,
            itemWidth: 0,
            autoRotateTimer: null,
            isAnimating: false,
            hasClones: false,      // Whether we've added clone slides for infinite scrolling
            itemCount: 0,          // Count of original items
            cloneCount: 0,         // Number of clones added at start and end
            jumpDisabled: false    // Temp flag to prevent multiple jumps
        };
        
        // Carousel object
        const carousel = {
            container,
            track,
            config,
            state,
            prevBtn,
            nextBtn
        };
        
        // Add to collection
        carousels.push(carousel);
        
        // Add event listeners
        setupEventListeners(carousel);
        
        // Load images
        loadImages(carousel).then(() => {
            // Remove loading indicator
            const loadingIndicator = container.querySelector('.carousel-loading');
            if (loadingIndicator) {
                container.removeChild(loadingIndicator);
            }
            
            // Calculate layout
            updateLayout(carousel);
            
            // Make sure we have enough images
            ensureSufficientImages(carousel);
            
            // Create clone slides for infinite scrolling if needed
            if (config.infiniteScroll && state.originalImages.length > config.visibleImages) {
                createCloneSlides(carousel);
            }
            
            // Render slides
            renderSlides(carousel);
            
            // Initialize position
            initializePosition(carousel);
            
            // Start auto-rotation if enabled
            if (config.autoRotate && state.originalImages.length > config.visibleImages) {
                startAutoRotate(carousel);
            }
            
            // Handle window resize
            window.addEventListener('resize', debounce(function() {
                // Update responsive configuration
                if (window.innerWidth < 576) {
                    carousel.config.visibleImages = 1;
                } else if (window.innerWidth < 768) {
                    carousel.config.visibleImages = 2;
                } else if (window.innerWidth < 992) {
                    carousel.config.visibleImages = Math.min(3, customConfig.visibleImages || 3);
                } else {
                    carousel.config.visibleImages = customConfig.visibleImages || 3;
                }
                
                updateLayout(carousel);
                
                // Check if we need to update clone setup
                if (config.infiniteScroll && state.originalImages.length > config.visibleImages) {
                    // Remove existing clones and recreate them
                    state.images = [...state.originalImages];
                    createCloneSlides(carousel);
                }
                
                renderSlides(carousel);
                initializePosition(carousel);
            }, 250));
        });
        
        return carousel;
    }
    
    /**
     * Make sure we have enough images to create a proper carousel
     * If not enough original images, duplicate them to ensure proper functioning
     */
    function ensureSufficientImages(carousel) {
        const { state, config } = carousel;
        
        // We need at least visibleImages + 1 for scrolling to work well
        const minImageCount = config.visibleImages + 1;
        
        // If we don't have enough images but have at least one
        if (state.images.length > 0 && state.images.length < minImageCount) {
            const originalImages = [...state.images];
            state.originalImages = originalImages;
            
            // Duplicate existing images until we have enough
            while (state.images.length < minImageCount) {
                state.images = [...state.images, ...originalImages];
            }
            
            console.log(`[${config.containerId}] Duplicated ${originalImages.length} images to ensure proper carousel function`);
        }
        
        // Store original images if not already done
        if (state.originalImages.length === 0) {
            state.originalImages = [...state.images];
        }
        
        state.itemCount = state.originalImages.length;
    }
    
    /**
     * Create clone slides for infinite scrolling
     */
    function createCloneSlides(carousel) {
        const { state, config } = carousel;
        
        // Store original images if not already done
        if (state.originalImages.length === 0) {
            state.originalImages = [...state.images];
        }
        
        state.itemCount = state.originalImages.length;
        
        // Calculate clone count based on visible images (minimum 2)
        state.cloneCount = Math.max(2, Math.ceil(config.visibleImages));
        
        // Create expanded array with clones at both ends
        let expanded = [];
        
        // Add clones at the beginning (from end of original array)
        for (let i = 0; i < state.cloneCount; i++) {
            const sourceIndex = state.itemCount - 1 - (i % state.itemCount);
            expanded.push({
                src: state.originalImages[sourceIndex].src || state.originalImages[sourceIndex],
                isClone: true,
                originalIndex: sourceIndex
            });
        }
        
        // Reverse the beginning clones to maintain the correct order
        expanded = expanded.reverse();
        
        // Add original images with metadata
        for (let i = 0; i < state.itemCount; i++) {
            expanded.push({
                src: state.originalImages[i].src || state.originalImages[i],
                isClone: false,
                originalIndex: i
            });
        }
        
        // Add clones at the end (from beginning of original array)
        for (let i = 0; i < state.cloneCount; i++) {
            const sourceIndex = i % state.itemCount;
            expanded.push({
                src: state.originalImages[sourceIndex].src || state.originalImages[sourceIndex],
                isClone: true,
                originalIndex: sourceIndex
            });
        }
        
        // Update state
        state.images = expanded;
        state.hasClones = true;
    }
    
    /**
     * Initialize the carousel position
     */
    function initializePosition(carousel) {
        const { state, track, config } = carousel;
        
        // If using infinite scroll with clones, set initial index to after the clones
        if (config.infiniteScroll && state.hasClones) {
            state.currentIndex = state.cloneCount;
        } else {
            state.currentIndex = config.startIndex;
        }
        
        // Position the track without animation
        track.style.transition = 'none';
        updateTrackPosition(carousel);
        
        // Force reflow to ensure the position is applied immediately
        track.offsetHeight;
        
        // Restore transition for future movements
        setTimeout(() => {
            track.style.transition = `transform ${config.transitionSpeed}ms ease`;
        }, 50);
    }
    
    /**
     * Update the track position based on the current index
     */
    function updateTrackPosition(carousel) {
        const { state, track } = carousel;
        
        // Calculate position based on current index, item width, and gap
        const position = -state.currentIndex * (state.itemWidth + carousel.config.gap);
        state.position = position;
        
        // Apply position using hardware-accelerated transform
        track.style.transform = `translate3d(${position}px, 0, 0)`;
    }
    
    /**
     * Load images for the carousel
     */
    function loadImages(carousel) {
        const { config, state } = carousel;
        
        return new Promise(resolve => {
            // Use provided images if available
            if (config.images && config.images.length > 0) {
                state.images = [...config.images];
                return resolve();
            }
            
            // Try to load images from folder first
            if (config.imageFolder) {
                fetchImagesFromFolder(config.imageFolder)
                    .then(images => {
                        if (images && images.length > 0) {
                            console.log(`[${config.containerId}] Loaded ${images.length} images from folder ${config.imageFolder}`);
                            state.images = images;
                            return resolve();
                        } else {
                            // Fallback to supplied fallback images
                            if (config.fallbackImages && config.fallbackImages.length > 0) {
                                console.log(`[${config.containerId}] Using ${config.fallbackImages.length} fallback images`);
                                state.images = [...config.fallbackImages];
                                return resolve();
                            } else {
                                // Last resort default images
                                console.log(`[${config.containerId}] Using default fallback images`);
                                state.images = [
                                    'https://picsum.photos/seed/img1/800/600',
                                    'https://picsum.photos/seed/img2/800/600',
                                    'https://picsum.photos/seed/img3/800/600',
                                    'https://picsum.photos/seed/img4/800/600'
                                ];
                                return resolve();
                            }
                        }
                    });
            } else {
                // No folder specified, use fallbacks
                if (config.fallbackImages && config.fallbackImages.length > 0) {
                    state.images = [...config.fallbackImages];
                } else {
                    state.images = [
                        'https://picsum.photos/seed/img1/800/600',
                        'https://picsum.photos/seed/img2/800/600',
                        'https://picsum.photos/seed/img3/800/600',
                        'https://picsum.photos/seed/img4/800/600'
                    ];
                }
                resolve();
            }
        });
    }
    
    /**
     * Improved function to fetch all images from a folder
     */
    function fetchImagesFromFolder(folderPath) {
        return new Promise(resolve => {
            // Make sure folder path ends with a slash
            if (!folderPath.endsWith('/')) {
                folderPath += '/';
            }
            
            console.log(`Attempting to fetch images from: ${folderPath}`);
            
            // Try to use the directory index API if available (server must support it)
            fetch(folderPath)
                .then(response => response.text())
                .then(html => {
                    // Try to parse the directory listing
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const links = Array.from(doc.querySelectorAll('a'));
                    
                    // Filter for image files
                    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                    const imageLinks = links.filter(link => {
                        const href = link.getAttribute('href');
                        if (!href) return false;
                        return imageExtensions.some(ext => href.toLowerCase().endsWith(ext));
                    });
                    
                    if (imageLinks.length > 0) {
                        // Extract full URLs for images
                        const imageUrls = imageLinks.map(link => {
                            const href = link.getAttribute('href');
                            
                            // Handle relative URLs
                            if (href.startsWith('http')) {
                                return href;
                            } else if (href.startsWith('/')) {
                                // Absolute path from domain root
                                const domain = window.location.origin;
                                return `${domain}${href}`;
                            } else {
                                // Relative path
                                return `${folderPath}${href}`;
                            }
                        });
                        
                        console.log(`Found ${imageUrls.length} images via directory listing`, imageUrls);
                        return resolve(imageUrls);
                    } else {
                        // Directory listing didn't work or no images found, try common patterns
                        console.log(`No images found via directory listing, trying pattern search`);
                        fallbackToPatternSearch(folderPath).then(resolve);
                    }
                })
                .catch((error) => {
                    // If fetching the directory fails, try pattern-based searching
                    console.log(`Error fetching directory: ${error}, trying pattern search`);
                    fallbackToPatternSearch(folderPath).then(resolve);
                });
        });
    }
    
    /**
     * Fallback to pattern-based image search when directory listing is not available
     */
    function fallbackToPatternSearch(folderPath) {
        return new Promise(resolve => {
            console.log(`Starting pattern-based image search in: ${folderPath}`);
            
            // Common image extensions
            const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            
            // Naming patterns to check
            const patterns = [
                { prefix: 'image', start: 1, count: 20 },
                { prefix: '', start: 1, count: 20 },
                { prefix: 'flyer', start: 1, count: 20 },
                { prefix: 'space', start: 1, count: 20 },
                { prefix: 'photo', start: 1, count: 20 },
                { prefix: 'img', start: 1, count: 20 },
                // Try some specific names that might exist
                { prefix: 'banner', start: 1, count: 5 },
                { prefix: 'gallery', start: 1, count: 5 },
                { prefix: 'slide', start: 1, count: 10 }
            ];
            
            let checkedCount = 0;
            const foundImages = [];
            
            // Try to load images by checking common patterns
            patterns.forEach(pattern => {
                for (let i = pattern.start; i < pattern.start + pattern.count; i++) {
                    extensions.forEach(ext => {
                        const filename = `${pattern.prefix}${i}.${ext}`;
                        const url = `${folderPath}${filename}`;
                        
                        checkedCount++;
                        
                        const img = new Image();
                        
                        img.onload = function() {
                            console.log(`Found image: ${url}`);
                            foundImages.push(url);
                            checkedCount--;
                            if (checkedCount === 0) {
                                console.log(`Pattern search complete, found ${foundImages.length} images`);
                                resolve(foundImages);
                            }
                        };
                        
                        img.onerror = function() {
                            checkedCount--;
                            if (checkedCount === 0) {
                                console.log(`Pattern search complete, found ${foundImages.length} images`);
                                resolve(foundImages);
                            }
                        };
                        
                        img.src = url;
                    });
                }
            });
            
            // Safety check in case all images failed to load
            setTimeout(() => {
                if (foundImages.length === 0) {
                    console.log('No images found via pattern search after timeout');
                    resolve([]);
                }
            }, 5000);
        });
    }
    
    /**
     * Update carousel layout based on container size
     */
    function updateLayout(carousel) {
        const { container, config, state } = carousel;
        
        // Calculate item width based on container width and visible images
        const containerWidth = container.clientWidth;
        const totalGapWidth = (config.visibleImages - 1) * config.gap;
        const itemWidth = Math.floor((containerWidth - totalGapWidth) / config.visibleImages);
        
        // Update state
        state.itemWidth = itemWidth;
    }
    
    /**
     * Render all slides in the carousel
     */
    function renderSlides(carousel) {
        const { track, config, state } = carousel;
        
        // Clear track
        track.innerHTML = '';
        
        // Make sure images array isn't empty
        if (state.images.length === 0) {
            console.warn(`No images to render for carousel: ${config.containerId}`);
            return;
        }
        
        // Create slides for each image
        state.images.forEach((image, index) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.dataset.index = index;
            
            // For infinite scroll, add special classes to clones
            if (state.hasClones) {
                if (index < state.cloneCount) {
                    slide.classList.add('clone', 'clone-end');
                    slide.dataset.originalIndex = image.originalIndex !== undefined ? 
                        image.originalIndex : state.itemCount - (state.cloneCount - index);
                } else if (index >= state.cloneCount + state.itemCount) {
                    slide.classList.add('clone', 'clone-start');
                    slide.dataset.originalIndex = image.originalIndex !== undefined ? 
                        image.originalIndex : index - (state.cloneCount + state.itemCount);
                } else {
                    slide.dataset.originalIndex = image.originalIndex !== undefined ? 
                        image.originalIndex : index - state.cloneCount;
                }
            }
            
            // Set width and margin
            slide.style.width = `${state.itemWidth}px`;
            slide.style.marginRight = `${config.gap}px`;
            
            // Create image element
            const img = document.createElement('img');
            
            // Get the image source
            const imgSrc = image.src || image;
            
            // Lazy load images that are not initially visible
            if (config.lazyLoad && !isInitiallyVisible(carousel, index)) {
                img.dataset.src = imgSrc;
                img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='; // Transparent placeholder
            } else {
                img.src = imgSrc;
            }
            
            img.alt = `Image ${(image.originalIndex !== undefined ? image.originalIndex : index) + 1}`;
            
            // Apply aspect ratio if specified
            if (config.aspectRatio !== 'auto') {
                img.style.aspectRatio = config.aspectRatio;
            }
            
            slide.appendChild(img);
            track.appendChild(slide);
        });
    }
    
    /**
     * Check if a slide is initially visible
     */
    function isInitiallyVisible(carousel, index) {
        const { state, config } = carousel;
        const startIndex = config.infiniteScroll && state.hasClones ? state.cloneCount : 0;
        return index >= startIndex && index < startIndex + config.visibleImages + 1; // +1 for buffer
    }
    
    /**
     * Setup all event listeners for the carousel
     */
    function setupEventListeners(carousel) {
        const { container, track, prevBtn, nextBtn, config, state } = carousel;
        
        // Navigation buttons
        prevBtn.addEventListener('click', () => {
            goToPrevSlide(carousel);
        });
        
        nextBtn.addEventListener('click', () => {
            goToNextSlide(carousel);
        });
        
        // Touch/mouse events for dragging
        const dragStart = e => {
            if (state.isAnimating) return;
            
            state.isDragging = true;
            state.startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            state.currentX = state.startX;
            
            track.style.transition = 'none';
            
            if (config.autoRotate) {
                stopAutoRotate(carousel);
            }
            
            e.type === 'mousedown' && e.preventDefault();
        };
        
        const dragMove = e => {
            if (!state.isDragging) return;
            
            state.currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const diff = state.currentX - state.startX;
            
            // Move track with drag
            const newPosition = state.position + diff;
            track.style.transform = `translate3d(${newPosition}px, 0, 0)`;
        };
        
        const dragEnd = e => {
            if (!state.isDragging) return;
            
            state.isDragging = false;
            
            // Calculate how far the drag moved
            const diff = state.currentX - state.startX;
            const threshold = state.itemWidth * 0.2;
            
            if (Math.abs(diff) > threshold) {
                if (diff > 0) {
                    // Dragged right - go to previous slide
                    goToPrevSlide(carousel);
                } else {
                    // Dragged left - go to next slide
                    goToNextSlide(carousel);
                }
            } else {
                // Return to current slide
                track.style.transition = `transform ${config.transitionSpeed}ms ease`;
                updateTrackPosition(carousel);
            }
            
            if (config.autoRotate) {
                startAutoRotate(carousel);
            }
        };
        
        // Add listeners with passive option for better performance on touch
        container.addEventListener('mousedown', dragStart);
        container.addEventListener('touchstart', dragStart, { passive: true });
        
        window.addEventListener('mousemove', dragMove);
        window.addEventListener('touchmove', dragMove, { passive: true });
        
        window.addEventListener('mouseup', dragEnd);
        window.addEventListener('touchend', dragEnd);
        
        // Fullscreen view
        if (config.allowFullscreen) {
            // Create fullscreen viewer if needed
            if (!fullscreenViewer) {
                createFullscreenViewer();
            }
            
            container.addEventListener('click', e => {
                // Don't trigger if dragging
                if (state.isDragging || Math.abs(state.currentX - state.startX) > 10) {
                    return;
                }
                
                // Find clicked slide
                const slide = e.target.closest('.carousel-slide');
                if (slide) {
                    // Get the original index of the image (unwrapping clones)
                    let originalIndex;
                    
                    if (slide.dataset.originalIndex !== undefined) {
                        originalIndex = parseInt(slide.dataset.originalIndex, 10);
                    } else {
                        const index = parseInt(slide.dataset.index, 10);
                        originalIndex = state.hasClones ? 
                            ((index - state.cloneCount) % state.itemCount + state.itemCount) % state.itemCount : 
                            index;
                    }
                    
                    // Get the correct image source
                    const image = state.originalImages[originalIndex] || state.images[slide.dataset.index];
                    const imgSrc = image.src || image;
                    
                    openFullscreen(imgSrc);
                }
            });
        }
        
        // Track transition end for infinite scrolling reset
        track.addEventListener('transitionend', () => {
            state.isAnimating = false;
            
            if (!config.infiniteScroll || !state.hasClones || state.jumpDisabled) return;
            
            const totalItems = state.images.length;
            const lastRealIndex = state.cloneCount + state.itemCount - 1;
            const firstRealIndex = state.cloneCount;
            
            // Handle edge cases
            if (state.currentIndex <= (state.cloneCount - 1)) {
                // We're at the beginning clones, jump to the real slides at the end
                state.jumpDisabled = true; // Prevent multiple jumps
                track.style.transition = 'none';
                state.currentIndex = lastRealIndex - (state.cloneCount - 1 - state.currentIndex);
                updateTrackPosition(carousel);
                
                // Force reflow
                track.offsetHeight;
                
                // Re-enable transitions after a short delay
                setTimeout(() => {
                    track.style.transition = `transform ${config.transitionSpeed}ms ease`;
                    state.jumpDisabled = false;
                }, 50);
            } else if (state.currentIndex >= (lastRealIndex + 1)) {
                // We're at the end clones, jump to the real slides at the beginning
                state.jumpDisabled = true; // Prevent multiple jumps
                track.style.transition = 'none';
                state.currentIndex = firstRealIndex + (state.currentIndex - lastRealIndex - 1);
                updateTrackPosition(carousel);
                
                // Force reflow
                track.offsetHeight;
                
                // Re-enable transitions after a short delay
                setTimeout(() => {
                    track.style.transition = `transform ${config.transitionSpeed}ms ease`;
                    state.jumpDisabled = false;
                }, 50);
            }
            
            // Load lazy images that are now visible
            lazyLoadVisibleImages(carousel);
        });
        
        // Lazy load initially visible images
        if (config.lazyLoad) {
            // Use intersection observer if available
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target.querySelector('img');
                            if (img && img.dataset.src) {
                                img.src = img.dataset.src;
                                delete img.dataset.src;
                            }
                            observer.unobserve(entry.target);
                        }
                    });
                }, { 
                    root: null,
                    rootMargin: '100px',
                    threshold: 0.1
                });
                
                // Observe all slides after rendering
                setTimeout(() => {
                    track.querySelectorAll('.carousel-slide').forEach(slide => {
                        observer.observe(slide);
                    });
                }, 100);
            } else {
                // Fallback approach for browsers without IntersectionObserver
                lazyLoadVisibleImages(carousel);
                
                // Add scroll listener for lazy loading
                window.addEventListener('scroll', debounce(() => {
                    lazyLoadVisibleImages(carousel);
                }, 200));
            }
        }
    }
    
    /**
     * Lazy load images that are currently visible
     */
    function lazyLoadVisibleImages(carousel) {
        const { track, state, config } = carousel;
        
        if (!config.lazyLoad) return;
        
        const visibleRange = config.visibleImages + 2; // Add buffer
        const startIdx = Math.max(0, state.currentIndex - 1);
        const endIdx = Math.min(state.images.length - 1, startIdx + visibleRange);
        
        for (let i = startIdx; i <= endIdx; i++) {
            const slide = track.children[i];
            if (slide) {
                const img = slide.querySelector('img');
                if (img && img.dataset.src) {
                    img.src = img.dataset.src;
                    delete img.dataset.src;
                }
            }
        }
    }
    
    /**
     * Go to a specific slide by index
     */
    function goToSlide(carousel, index, immediate = false) {
        const { track, config, state } = carousel;
        
        if (state.isAnimating) return;
        state.isAnimating = true;
        
        // Handle the case when we reach the end with returnToStart option
        if (!config.infiniteScroll && config.returnToStart) {
            const maxIndex = state.images.length - config.visibleImages;
            
            // If going beyond the last slide, return to first slide
            if (index > maxIndex) {
                index = 0;
            }
            
            // If going before the first slide, go to the last possible position
            if (index < 0) {
                index = maxIndex;
            }
        } else if (!config.infiniteScroll) {
            // Limit index to valid range without looping
            const maxIndex = Math.max(0, state.images.length - config.visibleImages);
            index = Math.max(0, Math.min(index, maxIndex));
        }
        
        // Update index
        state.currentIndex = index;
        
        // Apply transition unless immediate is true
        track.style.transition = immediate ? 'none' : `transform ${config.transitionSpeed}ms ease`;
        
        // Update position
        updateTrackPosition(carousel);
        
        // Reset animation flag after transition if immediate
        if (immediate) {
            setTimeout(() => {
                state.isAnimating = false;
            }, 50);
        }
        
        // Lazy load newly visible images
        lazyLoadVisibleImages(carousel);
    }
    
    /**
     * Go to the previous slide
     */
    function goToPrevSlide(carousel) {
        const { state, config } = carousel;
        
        if (state.isAnimating) return;
        
        let prevIndex = state.currentIndex - 1;
        
        // Handle non-infinite scroll case
        if (!config.infiniteScroll) {
            if (prevIndex < 0) {
                // Either loop to the end or stay at the beginning
                prevIndex = config.returnToStart ? 
                    Math.max(0, state.images.length - config.visibleImages) : 0;
            }
        }
        
        goToSlide(carousel, prevIndex);
        
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
        const { state, config } = carousel;
        
        if (state.isAnimating) return;
        
        let nextIndex = state.currentIndex + 1;
        
        // Handle non-infinite scroll case
        if (!config.infiniteScroll) {
            const maxIndex = Math.max(0, state.images.length - config.visibleImages);
            
            if (nextIndex > maxIndex) {
                // Either loop to the beginning or stay at the end
                nextIndex = config.returnToStart ? 0 : maxIndex;
            }
        }
        
        goToSlide(carousel, nextIndex);
        
        // Reset auto-rotation
        if (config.autoRotate) {
            stopAutoRotate(carousel);
            startAutoRotate(carousel);
        }
    }
    
    /**
     * Start auto-rotation
     */
    function startAutoRotate(carousel) {
        const { state, config } = carousel;
        
        if (state.autoRotateTimer) {
            clearInterval(state.autoRotateTimer);
        }
        
        state.autoRotateTimer = setInterval(() => {
            goToNextSlide(carousel);
        }, config.rotationSpeed);
    }
    
    /**
     * Stop auto-rotation
     */
    function stopAutoRotate(carousel) {
        const { state } = carousel;
        
        if (state.autoRotateTimer) {
            clearInterval(state.autoRotateTimer);
            state.autoRotateTimer = null;
        }
    }
    
    /**
     * Create fullscreen viewer for displaying expanded images
     */
    function createFullscreenViewer() {
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
        
        imageContainer.appendChild(image);
        fullscreenViewer.appendChild(closeBtn);
        fullscreenViewer.appendChild(imageContainer);
        document.body.appendChild(fullscreenViewer);
        
        // Close button event
        closeBtn.addEventListener('click', closeFullscreen);
        
        // Background click to close
        fullscreenViewer.addEventListener('click', e => {
            if (e.target === fullscreenViewer || e.target === imageContainer) {
                closeFullscreen();
            }
        });
        
        // Improved mobile swipe to dismiss
        let startY, currentY, startTime;
        
        imageContainer.addEventListener('touchstart', e => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        }, { passive: true });
        
        imageContainer.addEventListener('touchmove', e => {
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            // Only move if dragging vertically
            if (Math.abs(deltaY) > 10) {
                const opacity = 1 - Math.min(Math.abs(deltaY) / window.innerHeight, 0.8);
                fullscreenViewer.style.opacity = opacity.toString();
                image.style.transform = `translateY(${deltaY}px)`;
                
                // Prevent scrolling while dragging
                e.preventDefault();
            }
        }, { passive: false });
        
        imageContainer.addEventListener('touchend', e => {
            if (!currentY) return;
            
            const deltaY = currentY - startY;
            const deltaTime = Date.now() - startTime;
            const velocity = Math.abs(deltaY) / deltaTime;
            
            // Close if dragged far enough or with enough velocity
            if (Math.abs(deltaY) > 100 || (Math.abs(deltaY) > 50 && velocity > 0.5)) {
                closeFullscreen();
            } else {
                // Spring back
                fullscreenViewer.style.opacity = '1';
                image.style.transform = '';
            }
            
            currentY = null;
        });
    }
    
    /**
     * Open fullscreen viewer with the given image
     */
    function openFullscreen(imageSrc) {
        if (!fullscreenViewer) createFullscreenViewer();
        
        const image = fullscreenViewer.querySelector('.fullscreen-image');
        
        // Show loading state
        fullscreenViewer.classList.add('loading');
        
        // Reset styles
        image.style.transform = '';
        fullscreenViewer.style.opacity = '1';
        
        // Load image
        image.onload = function() {
            fullscreenViewer.classList.remove('loading');
        };
        
        image.src = imageSrc;
        
        // Show viewer with animation
        fullscreenViewer.style.display = 'flex';
        setTimeout(() => {
            fullscreenViewer.classList.add('visible');
        }, 10);
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Close fullscreen viewer
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
    
    /**
     * Utility: Debounce function for performance
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    // Public API
    return {
        init: initCarousel,
        openFullscreen,
        closeFullscreen
    };
})();
