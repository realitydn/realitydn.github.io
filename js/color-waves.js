/**
 * Reality Website - Floating Color Rectangles Background
 * Enhanced version with:
 * - Canvas rendering for all devices
 * - Adaptive rectangle count based on device capabilities
 * - Distributed rectangles throughout the entire page length
 * - Subtle fade-in animation
 * - Reduced blurring for cleaner aesthetics
 */

document.addEventListener('DOMContentLoaded', function() {
    // Performance detection - carefully assess device capabilities
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    const isLowEnd = isMobile && (
        navigator.hardwareConcurrency <= 2 || 
        /(android 4|android 5\.[01])/i.test(navigator.userAgent)
    );
    const isMidRange = isMobile && !isLowEnd;
    const isHighEnd = !isMobile || (
        navigator.hardwareConcurrency >= 6 && 
        !/(android 5|android 6)/i.test(navigator.userAgent)
    );
    
    // Adaptive configuration based on device capability
    const rectConfig = {
        // Rectangle count based on device capability with increased numbers
        count: isLowEnd ? 15 : (isMidRange ? 25 : (isHighEnd ? 50 : 35)),
        
        // Size range - slightly smaller for better distribution
        minWidth: 80,
        maxWidth: isLowEnd ? 250 : (isMobile ? 350 : 600),
        minHeight: 80,
        maxHeight: isLowEnd ? 250 : (isMobile ? 350 : 600),
        
        // Speed - consistent across devices for unified aesthetic
        minSpeed: 0.006,
        maxSpeed: 0.05,
        
        // Visual effects
        blendMode: 'multiply',
        
        // Reduced blur across all devices for cleaner look
        minBlur: 2,
        maxBlur: isLowEnd ? 10 : (isMobile ? 20 : 30),
        
        // Animation cycles
        blurCycleDuration: { min: 3000, max: 20000 },
        opacityCycleDuration: { min: 12000, max: 25000 },
        minOpacity: 0.15,
        maxOpacity: 0.8,
        
        // Always use canvas rendering for consistent appearance
        useCanvas: true,
        
        // Depth layers for added dimension
        layers: 4,
        
        // Initial animation
        initialFadeDuration: 2000
    };
    
    // Choose color scheme method
    initAnimation();
    
    function initAnimation() {
        // Select a color scheme on page load
        const colorScheme = getColorScheme();
        
        // Always use canvas animation for all devices
        initCanvasAnimation(colorScheme);
    }
    
    /**
     * Generate a harmonious color scheme
     * Returns an array of rgba color strings
     */
    function getColorScheme() {
        // Possible color scheme types
        const schemeTypes = [
            'complementary',
            'analogous',
            'monochromatic',
            'triadic'
        ];
        
        // Randomly select a scheme type
        const schemeType = schemeTypes[Math.floor(Math.random() * schemeTypes.length)];
        
        // Base hue (0-360)
        const baseHue = Math.floor(Math.random() * 360);
        
        // Create colors based on scheme type
        switch (schemeType) {
            case 'complementary':
                return [
                    generateHslaColor(baseHue, 70, 70, 0.15),
                    generateHslaColor(baseHue, 50, 80, 0.15),
                    generateHslaColor(baseHue, 80, 60, 0.15),
                    generateHslaColor((baseHue + 180) % 360, 70, 70, 0.15),
                    generateHslaColor((baseHue + 180) % 360, 50, 80, 0.15)
                ];
                
            case 'analogous':
                return [
                    generateHslaColor(baseHue, 70, 70, 0.15),
                    generateHslaColor((baseHue + 30) % 360, 65, 75, 0.15),
                    generateHslaColor((baseHue + 60) % 360, 60, 80, 0.15),
                    generateHslaColor((baseHue - 30 + 360) % 360, 65, 75, 0.15),
                    generateHslaColor((baseHue - 60 + 360) % 360, 60, 80, 0.15)
                ];
                
            case 'monochromatic':
                return [
                    generateHslaColor(baseHue, 80, 60, 0.15),
                    generateHslaColor(baseHue, 70, 70, 0.15),
                    generateHslaColor(baseHue, 60, 80, 0.15),
                    generateHslaColor(baseHue, 50, 90, 0.15),
                    generateHslaColor(baseHue, 90, 50, 0.15)
                ];
                
            case 'triadic':
                return [
                    generateHslaColor(baseHue, 70, 70, 0.15),
                    generateHslaColor(baseHue, 50, 80, 0.15),
                    generateHslaColor((baseHue + 120) % 360, 70, 70, 0.15),
                    generateHslaColor((baseHue + 120) % 360, 50, 80, 0.15),
                    generateHslaColor((baseHue + 240) % 360, 70, 70, 0.15)
                ];
                
            default:
                // Fallback to a simple color scheme
                return [
                    'rgba(255, 64, 129, 0.15)',
                    'rgba(64, 196, 255, 0.15)',
                    'rgba(255, 171, 64, 0.15)',
                    'rgba(94, 53, 177, 0.15)',
                    'rgba(100, 255, 218, 0.15)'
                ];
        }
    }
    
    /**
     * Generate an HSLA color string
     */
    function generateHslaColor(hue, saturation, lightness, alpha) {
        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    }
    
    /**
     * Canvas-based animation for all devices
     * Optimized for performance with visibility checking and hardware acceleration
     */
    function initCanvasAnimation(colorScheme) {
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
        
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = document.documentElement.scrollHeight;
        
        Object.assign(canvas.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%'
        });
        
        container.appendChild(canvas);
        document.body.insertBefore(container, document.body.firstChild);
        
        const ctx = canvas.getContext('2d');
        
        // Create rectangle objects with layer assignment - distributed throughout the page
        const rectangles = [];
        const pageHeight = document.documentElement.scrollHeight;
        
        for (let i = 0; i < rectConfig.count; i++) {
            const viewportWidth = window.innerWidth;
            
            // Distribute rectangles throughout the page height instead of just near the viewport
            // This creates a more even distribution from top to bottom
            const startY = Math.random() * pageHeight * 1.1 - pageHeight * 0.05;
            
            // Assign each rectangle to a layer (0 to layers-1)
            // Layer 0 is the closest (faster, more blur)
            // Higher layers are farther away (slower, less blur)
            const layer = Math.floor(Math.random() * rectConfig.layers);
            const layerFactor = 1 - (layer / (rectConfig.layers - 1 || 1)) * 0.7; // 0.3 to 1
            
            // Adjust speed and blur based on layer
            const speedFactor = layer === 0 ? 1 : layerFactor;
            const blurFactor = layer === 0 ? 1 : layerFactor * 0.8;
            
            // Select color from the color scheme
            const color = colorScheme[Math.floor(Math.random() * colorScheme.length)];
            
            const width = Math.random() * (rectConfig.maxWidth - rectConfig.minWidth) + rectConfig.minWidth;
            const height = Math.random() * (rectConfig.maxHeight - rectConfig.minHeight) + rectConfig.minHeight;
            const startX = Math.random() * (viewportWidth * 1.5) - (viewportWidth * 0.25);
            
            rectangles.push({
                x: startX,
                y: startY,
                width: width,
                height: height,
                color: color,
                layer: layer,
                speed: (Math.random() * (rectConfig.maxSpeed - rectConfig.minSpeed) + rectConfig.minSpeed) * speedFactor,
                rotation: Math.random() * 20 - 10,
                oscAmplitude: Math.random() * 30 + 20,
                oscFrequency: Math.random() * 0.0002 + 0.0001,
                oscPhase: Math.random() * Math.PI * 2,
                blur: 0, // Start with no blur for fade-in effect
                targetBlur: rectConfig.minBlur * blurFactor,
                opacity: 0, // Start with no opacity for fade-in effect
                targetOpacity: Math.random() * (rectConfig.maxOpacity - rectConfig.minOpacity) + rectConfig.minOpacity,
                blurCycleDuration: Math.random() * (rectConfig.blurCycleDuration.max - rectConfig.blurCycleDuration.min) + rectConfig.blurCycleDuration.min,
                opacityCycleDuration: Math.random() * (rectConfig.opacityCycleDuration.max - rectConfig.opacityCycleDuration.min) + rectConfig.opacityCycleDuration.min,
                blurStartTime: performance.now() - Math.random() * 10000,
                opacityStartTime: performance.now() - Math.random() * 10000,
                fadeInStartTime: performance.now() + Math.random() * 1000, // Stagger the fade-in
                borderRadius: Math.random() * 40
            });
        }
        
        // Sort rectangles by layer to render back-to-front
        rectangles.sort((a, b) => b.layer - a.layer);
        
        // Single animation loop for all rectangles
        let lastTime = performance.now();
        
        function animate(now) {
            if (!container.isConnected) return;
            
            const deltaTime = now - lastTime;
            lastTime = now;
            
            // Clear canvas with transparent color
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate visible range based on scroll position
            const scrollY = window.scrollY;
            const visibleTop = scrollY - 200;
            const visibleBottom = scrollY + window.innerHeight + 200;
            
            // Update and draw each rectangle, back to front (highest layer to lowest)
            for (let i = 0; i < rectangles.length; i++) {
                const rect = rectangles[i];
                
                // Update position
                rect.y += rect.speed * deltaTime;
                
                // Handle initial fade-in animation
                const fadeElapsed = now - rect.fadeInStartTime;
                const fadeProgress = Math.min(1, fadeElapsed / rectConfig.initialFadeDuration);
                
                // Gradually increase blur and opacity during fade-in
                if (fadeProgress < 1) {
                    rect.opacity = rect.targetOpacity * fadeProgress;
                    rect.blur = rect.targetBlur * fadeProgress;
                } else {
                    // Calculate blur based on layer and animation cycle
                    const blurElapsed = now - rect.blurStartTime;
                    const blurCycleProgress = (blurElapsed % rect.blurCycleDuration) / rect.blurCycleDuration;
                    const layerAdjustedMaxBlur = rectConfig.maxBlur * (1 - (rect.layer / rectConfig.layers) * 0.7);
                    rect.blur = rect.targetBlur + ((Math.sin(blurCycleProgress * Math.PI * 2) + 1) / 2) * (layerAdjustedMaxBlur - rect.targetBlur);
                    
                    // Calculate opacity
                    const opacityElapsed = now - rect.opacityStartTime;
                    const opacityCycleProgress = (opacityElapsed % rect.opacityCycleDuration) / rect.opacityCycleDuration;
                    rect.opacity = rect.targetOpacity * (0.8 + ((Math.sin(opacityCycleProgress * Math.PI * 2) + 1) / 2) * 0.2);
                }
                
                // Skip rendering if far outside visible area
                if (rect.y < visibleTop - rect.height || rect.y > visibleBottom) {
                    // Reset if too far down
                    if (rect.y > document.documentElement.scrollHeight) {
                        rect.y = -rect.height;
                        rect.x = Math.random() * (window.innerWidth * 1.5) - (window.innerWidth * 0.25);
                    }
                    continue;
                }
                
                // Calculate horizontal oscillation
                const offsetX = rect.oscAmplitude * Math.sin(rect.oscFrequency * now + rect.oscPhase);
                const posX = rect.x + offsetX;
                
                // Save context state
                ctx.save();
                
                // Move to rectangle center for rotation
                ctx.translate(posX + rect.width/2, rect.y + rect.height/2);
                ctx.rotate(rect.rotation * Math.PI / 180);
                
                // Apply blur (simulated with shadow for canvas)
                ctx.shadowColor = rect.color;
                ctx.shadowBlur = rect.blur * 0.5; // Scale down for performance
                
                // Draw rounded rectangle
                const radius = rect.borderRadius;
                ctx.beginPath();
                ctx.moveTo(-rect.width/2 + radius, -rect.height/2);
                ctx.lineTo(rect.width/2 - radius, -rect.height/2);
                ctx.quadraticCurveTo(rect.width/2, -rect.height/2, rect.width/2, -rect.height/2 + radius);
                ctx.lineTo(rect.width/2, rect.height/2 - radius);
                ctx.quadraticCurveTo(rect.width/2, rect.height/2, rect.width/2 - radius, rect.height/2);
                ctx.lineTo(-rect.width/2 + radius, rect.height/2);
                ctx.quadraticCurveTo(-rect.width/2, rect.height/2, -rect.width/2, rect.height/2 - radius);
                ctx.lineTo(-rect.width/2, -rect.height/2 + radius);
                ctx.quadraticCurveTo(-rect.width/2, -rect.height/2, -rect.width/2 + radius, -rect.height/2);
                ctx.closePath();
                
                // Extract color components for opacity adjustment
                let color = rect.color;
                
                // Handle RGBA color format
                if (color.startsWith('rgba')) {
                    const parts = color.substring(5, color.length - 1).split(',');
                    const r = parts[0].trim();
                    const g = parts[1].trim();
                    const b = parts[2].trim();
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${rect.opacity})`;
                } 
                // Handle HSLA color format
                else if (color.startsWith('hsla')) {
                    const parts = color.substring(5, color.length - 1).split(',');
                    const h = parts[0].trim();
                    const s = parts[1].trim();
                    const l = parts[2].trim();
                    ctx.fillStyle = `hsla(${h}, ${s}, ${l}, ${rect.opacity})`;
                }
                
                // Fill rectangle
                ctx.fill();
                
                // Restore context
                ctx.restore();
            }
            
            // Continue animation loop
            requestAnimationFrame(animate);
        }
        
        requestAnimationFrame(animate);
        
        // Update canvas size and repopulate on window resize
        window.addEventListener('resize', function() {
            canvas.width = window.innerWidth;
            canvas.height = document.documentElement.scrollHeight;
            container.style.height = document.documentElement.scrollHeight + 'px';
        });

        // Update canvas size on page content changes (delayed to prevent excessive updates)
        let resizeTimeout;
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                canvas.height = document.documentElement.scrollHeight;
                container.style.height = document.documentElement.scrollHeight + 'px';
            }, 200);
        });
        
        // Observe body for size changes
        resizeObserver.observe(document.body);
    }
});
