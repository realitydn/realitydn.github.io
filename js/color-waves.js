/**
 * Reality Website - Floating Color Rectangles Background
 * Revised Version: Includes a blur-in effect that transitions from 1000px blur to the computed blur value,
 * with slower oscillation/rotation and an increased rectangle count.
 */

document.addEventListener('DOMContentLoaded', function() {
    // ===== Configuration =====
    
    // Color palette for rectangles (with alpha transparency)
    const colors = [
        'rgba(255, 64, 129, 0.2)',  // Pink
        'rgba(64, 196, 255, 0.2)',  // Blue
        'rgba(255, 171, 64, 0.2)',  // Gold/Amber
        'rgba(94, 53, 177, 0.2)',   // Purple
        'rgba(100, 255, 218, 0.2)'   // Teal
    ];
    
    // Rectangle configuration settings
    const rectConfig = {
        count: 80,              // Increase to 80 rectangles
        minWidth: 100,
        maxWidth: 800,
        minHeight: 100,
        maxHeight: 800,
        // Speed in pixels per millisecond
        minSpeed: 0.01,
        maxSpeed: 0.11,
        blendMode: 'multiply',
        // New blur values: oscillate between 10 and 200 pixels
        minBlur: 10,
        maxBlur: 100,
        blurCycleDuration: { min: 5000, max: 15000 },
        opacityCycleDuration: { min: 7000, max: 20000 },
        minOpacity: 0.3,
        maxOpacity: 0.8
    };
    
    // Create the animation container covering the entire document
    createAnimationContainer();
    
    /**
     * Creates an absolutely positioned container that spans the full document height.
     * This container is inserted as the first child of the body.
     */
    function createAnimationContainer() {
        const container = document.createElement('div');
        container.id = 'floating-rectangles-container';
        
        Object.assign(container.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: document.documentElement.scrollHeight + 'px',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: '-1'
        });
        
        // Insert container so it sits behind all other content
        document.body.insertBefore(container, document.body.firstChild);
        
        populateViewport(container);
        
        // Add new rectangles when scrolling if needed
        window.addEventListener('scroll', function() {
            ensureRectanglesVisible(container);
        });
        
        // Update container height and re-populate on window resize
        window.addEventListener('resize', function() {
            container.style.height = document.documentElement.scrollHeight + 'px';
            populateViewport(container);
        });
    }
    
    /**
     * Populates the container with rectangles.
     * Rectangles are initially distributed in a vertical band that covers
     * from just above the viewport to well below it.
     * @param {HTMLElement} container 
     */
    function populateViewport(container) {
        // Clear existing rectangles
        container.innerHTML = '';
        
        for (let i = 0; i < rectConfig.count; i++) {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Place rectangles from above the viewport to below it
            const startY = Math.random() * (viewportHeight * 3) - viewportHeight;
            const startX = Math.random() * (viewportWidth * 1.5) - (viewportWidth * 0.25);
            
            createRectangle(container, startX, startY);
        }
    }
    
    /**
     * Ensures that at least five rectangles are visible in the viewport.
     * Also removes rectangles that have drifted too far away for performance.
     * @param {HTMLElement} container 
     */
    function ensureRectanglesVisible(container) {
        const visibleRects = Array.from(container.children).filter(rect => {
            const posY = parseFloat(rect.dataset.currentY);
            const rectHeight = parseFloat(rect.dataset.height);
            const scrollY = window.scrollY;
            const viewportHeight = window.innerHeight;
            return (posY + rectHeight > scrollY && posY < scrollY + viewportHeight);
        });
        
        if (visibleRects.length < 5) {
            for (let i = 0; i < 3; i++) {
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                const scrollY = window.scrollY;
                
                const startY = scrollY + Math.random() * viewportHeight;
                const startX = Math.random() * (viewportWidth * 1.5) - (viewportWidth * 0.25);
                createRectangle(container, startX, startY);
            }
        }
        
        // Remove rectangles that are far outside the viewport
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        const bufferZone = viewportHeight * 3;
        
        Array.from(container.children).forEach(rect => {
            const posY = parseFloat(rect.dataset.currentY);
            if (posY < scrollY - bufferZone || posY > scrollY + viewportHeight + bufferZone) {
                container.removeChild(rect);
                // Replace with a new rectangle near the current viewport
                const newY = Math.random() < 0.5 ?
                    scrollY - Math.random() * 100 :
                    scrollY + viewportHeight + Math.random() * 100;
                const newX = Math.random() * (window.innerWidth * 1.5) - (window.innerWidth * 0.25);
                createRectangle(container, newX, newY);
            }
        });
    }
    
    /**
     * Creates a single animated rectangle with organic movement.
     * Includes an initial blur-in effect.
     * @param {HTMLElement} container 
     * @param {number} startX 
     * @param {number} startY 
     */
    function createRectangle(container, startX, startY) {
        const rect = document.createElement('div');
        
        const width = Math.random() * (rectConfig.maxWidth - rectConfig.minWidth) + rectConfig.minWidth;
        const height = Math.random() * (rectConfig.maxHeight - rectConfig.minHeight) + rectConfig.minHeight;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const speed = Math.random() * (rectConfig.maxSpeed - rectConfig.minSpeed) + rectConfig.minSpeed;
        
        // Horizontal oscillation parameters (1/10th of original rate)
        const oscAmplitude = Math.random() * 30 + 20; // 20 to 50 px remains the same
        const oscFrequency = (Math.random() * 0.0002 + 0.0001); // Reduced frequency
        const oscPhase = Math.random() * Math.PI * 2;
        
        // Base rotation (oscillation rate reduced to 1/10th)
        const rotation = Math.random() * 20 - 10;
        
        // Blur and opacity cycle parameters
        const minBlur = rectConfig.minBlur;
        const maxBlur = rectConfig.maxBlur;
        const blurCycleDuration = Math.random() * (rectConfig.blurCycleDuration.max - rectConfig.blurCycleDuration.min) + rectConfig.blurCycleDuration.min;
        
        const minOpacity = rectConfig.minOpacity;
        const maxOpacity = rectConfig.maxOpacity;
        const opacityCycleDuration = Math.random() * (rectConfig.opacityCycleDuration.max - rectConfig.opacityCycleDuration.min) + rectConfig.opacityCycleDuration.min;
        
        // Hue rotation cycle for organic color shifting (range: -20deg to +20deg)
        const hueCycleDuration = Math.random() * 20000 + 10000; // 10s to 30s
        
        const now = performance.now();
        const blurAnimationStartTime = now - Math.random() * blurCycleDuration;
        const opacityAnimationStartTime = now - Math.random() * opacityCycleDuration;
        const hueAnimationStartTime = now - Math.random() * hueCycleDuration;
        
        // New: initial blur-in effect properties
        const initialBlur = 500;
        // Random transition duration between 1 and 3 seconds (in ms)
        const initialBlurDuration = Math.random() * 2000 + 200;
        const initialBlurStartTime = now;
        
        // Set initial style using transform for optimal performance.
        // Start with a blur of 1000px.
        Object.assign(rect.style, {
            position: 'absolute',
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: color,
            mixBlendMode: rectConfig.blendMode,
            borderRadius: `${Math.random() * 40}px`,
            transform: `translate(${startX}px, ${startY}px) rotate(${rotation}deg)`,
            filter: `blur(${initialBlur}px)`,
            opacity: minOpacity,
            willChange: 'transform, filter, opacity'
        });
        
        // Store properties in the dataset for animation use
        rect.dataset.baseX = startX;
        rect.dataset.baseY = startY;
        rect.dataset.currentY = startY; // Vertical position that will update over time
        rect.dataset.height = height;    // For visibility checking
        
        rect.dataset.speed = speed;
        rect.dataset.rotation = rotation;
        
        rect.dataset.oscillationAmplitude = oscAmplitude;
        rect.dataset.oscillationFrequency = oscFrequency;
        rect.dataset.oscillationPhase = oscPhase;
        
        rect.dataset.minBlur = minBlur;
        rect.dataset.maxBlur = maxBlur;
        rect.dataset.blurCycleDuration = blurCycleDuration;
        rect.dataset.blurAnimationStartTime = blurAnimationStartTime;
        
        rect.dataset.minOpacity = minOpacity;
        rect.dataset.maxOpacity = maxOpacity;
        rect.dataset.opacityCycleDuration = opacityCycleDuration;
        rect.dataset.opacityAnimationStartTime = opacityAnimationStartTime;
        
        rect.dataset.hueCycleDuration = hueCycleDuration;
        rect.dataset.hueAnimationStartTime = hueAnimationStartTime;
        
        // Store initial blur transition details
        rect.dataset.initialBlur = initialBlur;
        rect.dataset.initialBlurDuration = initialBlurDuration;
        rect.dataset.initialBlurStartTime = initialBlurStartTime;
        
        container.appendChild(rect);
        
        // Start the organic animation for this rectangle
        animateRectangle(rect);
    }
    
    /**
     * Animates a rectangle: vertical falling movement, horizontal oscillation,
     * subtle rotation adjustments, and smooth updates to blur, opacity, and hue.
     * Includes an initial blur-in effect that transitions from 1000px to the computed blur.
     * @param {HTMLElement} rect 
     */
    function animateRectangle(rect) {
        if (!rect || !rect.isConnected) return;
        
        let lastTime = performance.now();
        
        function update(currentTime) {
            if (!rect || !rect.isConnected) return;
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            // Vertical movement update
            const speed = parseFloat(rect.dataset.speed);
            let currentY = parseFloat(rect.dataset.currentY);
            currentY += speed * deltaTime;
            rect.dataset.currentY = currentY;
            
            // Horizontal oscillation for organic drift
            const oscAmplitude = parseFloat(rect.dataset.oscillationAmplitude);
            const oscFrequency = parseFloat(rect.dataset.oscillationFrequency);
            const oscPhase = parseFloat(rect.dataset.oscillationPhase);
            const offsetX = oscAmplitude * Math.sin(oscFrequency * currentTime + oscPhase);
            
            const baseX = parseFloat(rect.dataset.baseX);
            const posX = baseX + offsetX;
            
            // Subtle rotation oscillation (reduced rate)
            const baseRotation = parseFloat(rect.dataset.rotation);
            const rotationOsc = (2 * Math.sin(oscFrequency * currentTime + oscPhase)) / 10;
            const totalRotation = baseRotation + rotationOsc;
            
            // Update transform using translate and rotate
            rect.style.transform = `translate(${posX}px, ${currentY}px) rotate(${totalRotation}deg)`;
            
            // Compute the regular blur effect using a sinusoidal cycle
            const minBlur = parseFloat(rect.dataset.minBlur);
            const maxBlur = parseFloat(rect.dataset.maxBlur);
            const blurCycleDuration = parseFloat(rect.dataset.blurCycleDuration);
            const blurAnimationStartTime = parseFloat(rect.dataset.blurAnimationStartTime);
            const blurElapsed = currentTime - blurAnimationStartTime;
            const blurCycleProgress = (blurElapsed % blurCycleDuration) / blurCycleDuration;
            const blurNormalizedSine = (Math.sin(blurCycleProgress * Math.PI * 2) + 1) / 2;
            const computedBlur = minBlur + blurNormalizedSine * (maxBlur - minBlur);
            
            // Handle the initial blur transition by clamping the interpolation
            const initialBlur = parseFloat(rect.dataset.initialBlur);
            const initialBlurDuration = parseFloat(rect.dataset.initialBlurDuration);
            const initialBlurStartTime = parseFloat(rect.dataset.initialBlurStartTime);
            const initialElapsed = currentTime - initialBlurStartTime;
            const t = Math.min(1, initialElapsed / initialBlurDuration);
            const finalBlur = initialBlur * (1 - t) + computedBlur * t;
            
            // Update opacity with its own sinusoidal cycle
            const minOpacity = parseFloat(rect.dataset.minOpacity);
            const maxOpacity = parseFloat(rect.dataset.maxOpacity);
            const opacityCycleDuration = parseFloat(rect.dataset.opacityCycleDuration);
            const opacityAnimationStartTime = parseFloat(rect.dataset.opacityAnimationStartTime);
            const opacityElapsed = currentTime - opacityAnimationStartTime;
            const opacityCycleProgress = (opacityElapsed % opacityCycleDuration) / opacityCycleDuration;
            const opacityNormalizedSine = (Math.sin(opacityCycleProgress * Math.PI * 2) + 1) / 2;
            const currentOpacity = minOpacity + opacityNormalizedSine * (maxOpacity - minOpacity);
            
            // Update hue rotation for organic color shifting
            const hueCycleDuration = parseFloat(rect.dataset.hueCycleDuration);
            const hueAnimationStartTime = parseFloat(rect.dataset.hueAnimationStartTime);
            const hueElapsed = currentTime - hueAnimationStartTime;
            const hueCycleProgress = (hueElapsed % hueCycleDuration) / hueCycleDuration;
            const hueNormalizedSine = (Math.sin(hueCycleProgress * Math.PI * 2) + 1) / 2;
            const hueRotation = -20 + hueNormalizedSine * 40; // from -20deg to +20deg
            
            // Apply the computed filter (blur and hue-rotate)
            rect.style.filter = `blur(${finalBlur}px) hue-rotate(${hueRotation}deg)`;
            // Apply opacity
            rect.style.opacity = currentOpacity;
            
            requestAnimationFrame(update);
        }
        
        requestAnimationFrame(update);
    }
});
