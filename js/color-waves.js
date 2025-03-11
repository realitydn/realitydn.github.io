/**
 * Reality Website - Floating Color Rectangles Background
 * Enhanced version for mobile with:
 * - Color harmonies for more cohesive visuals
 * - Slightly increased rectangle count on capable devices
 * - Subtle depth layering effect
 * - Hardware-accelerated rendering
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
        // Rectangle count based on device capability
        // Very conservative baseline for low-end devices
        count: isLowEnd ? 10 : (isMidRange ? 20 : (isHighEnd ? 40 : 25)),
        
        // Size range
        minWidth: 100,
        maxWidth: isLowEnd ? 300 : (isMobile ? 400 : 800),
        minHeight: 100,
        maxHeight: isLowEnd ? 300 : (isMobile ? 400 : 800),
        
        // Speed - slower on mobile for better performance and aesthetics
        minSpeed: isLowEnd ? 0.004 : 0.008,
        maxSpeed: isLowEnd ? 0.03 : 0.08,
        
        // Visual effects
        blendMode: 'multiply',
        
        // Reduced blur on mobile (significant performance impact)
        minBlur: isLowEnd ? 3 : (isMobile ? 5 : 10),
        maxBlur: isLowEnd ? 15 : (isMobile ? 30 : 100),
        
        // Animation cycles
        blurCycleDuration: { min: 8000, max: 24000 },
        opacityCycleDuration: { min: 10000, max: 28000 },
        minOpacity: 0.2,
        maxOpacity: 0.75,
        
        // Use canvas rendering on mobile for better performance
        useCanvas: isMobile,
        
        // New: Depth layers for added dimension
        // Each rectangle will be assigned to a layer that affects speed and blur
        layers: 3
    };
    
    // Choose color scheme method
    initAnimation();
    
    function initAnimation() {
        // Select a color scheme on page load
        const colorScheme = getColorScheme();
        
        if (rectConfig.useCanvas) {
            initCanvasAnimation(colorScheme);
        } else {
            initDomAnimation(colorScheme);
        }
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
     * Canvas-based animation for mobile devices
     * Much better performance than DOM-based animation with filters
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
        
        // Create rectangle objects with layer assignment
        const rectangles = [];
        for (let i = 0; i < rectConfig.count; i++) {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
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
            const startY = Math.random() * (viewportHeight * 3) - viewportHeight;
            
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
                blur: rectConfig.minBlur * blurFactor,
                opacity: rectConfig.minOpacity,
                blurCycleDuration: Math.random() * (rectConfig.blurCycleDuration.max - rectConfig.blurCycleDuration.min) + rectConfig.blurCycleDuration.min,
                opacityCycleDuration: Math.random() * (rectConfig.opacityCycleDuration.max - rectConfig.opacityCycleDuration.min) + rectConfig.opacityCycleDuration.min,
                blurStartTime: performance.now() - Math.random() * 10000,
                opacityStartTime: performance.now() - Math.random() * 10000,
                initialBlur: 200,
                initialBlurDuration: Math.random() * 2000 + 1000,
                initialBlurStartTime: performance.now(),
                borderRadius: Math.random() * 40
            });
        }
        
        // Sort rectangles by layer to render back-to-front
        rectangles.sort((a, b) => b.layer - a.layer);
        
        // Single animation loop for all rectangles
        let lastTime = performance.now();
        let frameCount = 0;
        let lastFpsTime = performance.now();
        
        function animate(now) {
            if (!container.isConnected) return;
            
            const deltaTime = now - lastTime;
            lastTime = now;
            
            // Measure FPS
            frameCount++;
            if (now - lastFpsTime > 1000) {
                lastFpsTime = now;
                frameCount = 0;
            }
            
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
                
                // Calculate blur based on layer and animation cycle
                const blurElapsed = now - rect.blurStartTime;
                const blurCycleProgress = (blurElapsed % rect.blurCycleDuration) / rect.blurCycleDuration;
                const layerAdjustedMaxBlur = rectConfig.maxBlur * (1 - (rect.layer / rectConfig.layers) * 0.7);
                const blurValue = rectConfig.minBlur + ((Math.sin(blurCycleProgress * Math.PI * 2) + 1) / 2) * (layerAdjustedMaxBlur - rectConfig.minBlur);
                
                // Calculate opacity
                const opacityElapsed = now - rect.opacityStartTime;
                const opacityCycleProgress = (opacityElapsed % rect.opacityCycleDuration) / rect.opacityCycleDuration;
                const opacityValue = rectConfig.minOpacity + ((Math.sin(opacityCycleProgress * Math.PI * 2) + 1) / 2) * (rectConfig.maxOpacity - rectConfig.minOpacity);
                
                // Handle initial blur-in
                const initialElapsed = now - rect.initialBlurStartTime;
                const t = Math.min(1, initialElapsed / rect.initialBlurDuration);
                const currentBlur = rect.initialBlur * (1 - t) + blurValue * t;
                
                // Save context state
                ctx.save();
                
                // Move to rectangle center for rotation
                ctx.translate(posX + rect.width/2, rect.y + rect.height/2);
                ctx.rotate(rect.rotation * Math.PI / 180);
                
                // Apply blur (simulated with shadow for canvas)
                ctx.shadowColor = rect.color;
                ctx.shadowBlur = currentBlur * 0.5; // Scale down for performance
                
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
                let opacity = opacityValue;
                
                // Handle RGBA color format
                if (color.startsWith('rgba')) {
                    const parts = color.substring(5, color.length - 1).split(',');
                    const r = parts[0].trim();
                    const g = parts[1].trim();
                    const b = parts[2].trim();
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                } 
                // Handle HSLA color format
                else if (color.startsWith('hsla')) {
                    const parts = color.substring(5, color.length - 1).split(',');
                    const h = parts[0].trim();
                    const s = parts[1].trim();
                    const l = parts[2].trim();
                    ctx.fillStyle = `hsla(${h}, ${s}, ${l}, ${opacity})`;
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
    }
    
    /**
     * DOM-based animation for desktop
     * Uses optimized approach with a single animation frame for all rectangles
     */
    function initDomAnimation(colorScheme) {
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
        
        document.body.insertBefore(container, document.body.firstChild);
        
        const rectangles = [];
        
        // Create rectangles with layer assignments
        for (let i = 0; i < rectConfig.count; i++) {
            const rect = document.createElement('div');
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Assign layer (0 is closest)
            const layer = Math.floor(Math.random() * rectConfig.layers);
            const layerFactor = 1 - (layer / (rectConfig.layers - 1 || 1)) * 0.7; // 0.3 to 1
            
            // Adjust properties based on layer
            const speedFactor = layer === 0 ? 1 : layerFactor;
            const blurFactor = layer === 0 ? 1 : layerFactor * 0.8;
            
            // Select color from the harmonious scheme
            const color = colorScheme[Math.floor(Math.random() * colorScheme.length)];
            
            // Initial placement
            const startY = Math.random() * (viewportHeight * 3) - viewportHeight;
            const startX = Math.random() * (viewportWidth * 1.5) - (viewportWidth * 0.25);
            
            const width = Math.random() * (rectConfig.maxWidth - rectConfig.minWidth) + rectConfig.minWidth;
            const height = Math.random() * (rectConfig.maxHeight - rectConfig.minHeight) + rectConfig.minHeight;
            
            // Setup initial style with hardware acceleration
            Object.assign(rect.style, {
                position: 'absolute',
                width: `${width}px`,
                height: `${height}px`,
                backgroundColor: color,
                mixBlendMode: rectConfig.blendMode,
                borderRadius: `${Math.random() * 40}px`,
                transform: `translate3d(${startX}px, ${startY}px, 0) rotate(0deg)`,
                filter: `blur(${rectConfig.minBlur * 3}px)`,
                opacity: 0.2,
                willChange: 'transform, filter, opacity',
                zIndex: 10 - layer // Layer 0 (closest) has highest z-index
            });
            
            // Animation parameters
            const params = {
                el: rect,
                x: startX,
                y: startY,
                width: width,
                height: height,
                layer: layer,
                speed: (Math.random() * (rectConfig.maxSpeed - rectConfig.minSpeed) + rectConfig.minSpeed) * speedFactor,
                rotation: Math.random() * 20 - 10,
                oscAmplitude: Math.random() * 30 + 20,
                oscFrequency: Math.random() * 0.0002 + 0.0001,
                oscPhase: Math.random() * Math.PI * 2,
                minBlur: rectConfig.minBlur,
                maxBlur: rectConfig.maxBlur * blurFactor, // Reduce max blur for farther layers
                blurCycleDuration: Math.random() * (rectConfig.blurCycleDuration.max - rectConfig.blurCycleDuration.min) + rectConfig.blurCycleDuration.min,
                blurStartTime: performance.now() - Math.random() * 10000,
                minOpacity: rectConfig.minOpacity,
                maxOpacity: rectConfig.maxOpacity,
                opacityCycleDuration: Math.random() * (rectConfig.opacityCycleDuration.max - rectConfig.opacityCycleDuration.min) + rectConfig.opacityCycleDuration.min,
                opacityStartTime: performance.now() - Math.random() * 10000,
                initialBlur: rectConfig.minBlur * 3,
                initialBlurDuration: Math.random() * 2000 + 1000,
                initialBlurStartTime: performance.now()
            };
            
            rectangles.push(params);
            container.appendChild(rect);
        }
        
        // Use a single animation loop for all rectangles
        let lastTime = performance.now();
        
        function updateAll(now) {
            if (!container.isConnected) return;
            
            const deltaTime = now - lastTime;
            lastTime = now;
            
            // Calculate visible range based on scroll position
            const scrollY = window.scrollY;
            const visibleTop = scrollY - 200;
            const visibleBottom = scrollY + window.innerHeight + 200;
            
            // Update each rectangle
            for (let i = 0; i < rectangles.length; i++) {
                const rect = rectangles[i];
                
                // Update vertical position
                rect.y += rect.speed * deltaTime;
                
                // Skip updating DOM if far outside visible area
                if (rect.y < visibleTop - rect.height || rect.y > visibleBottom) {
                    // Reset if too far down
                    if (rect.y > document.documentElement.scrollHeight) {
                        rect.y = -rect.height;
                        rect.x = Math.random() * window.innerWidth;
                    }
                    continue;
                }
                
                // Calculate horizontal oscillation
                const offsetX = rect.oscAmplitude * Math.sin(rect.oscFrequency * now + rect.oscPhase);
                const posX = rect.x + offsetX;
                
                // Calculate rotation
                const baseRotation = rect.rotation;
                const rotationOsc = (2 * Math.sin(rect.oscFrequency * now + rect.oscPhase)) / 10;
                const totalRotation = baseRotation + rotationOsc;
                
                // Update transform with hardware acceleration
                rect.el.style.transform = `translate3d(${posX}px, ${rect.y}px, 0) rotate(${totalRotation}deg)`;
                
                // Calculate blur
                const blurElapsed = now - rect.blurStartTime;
                const blurCycleProgress = (blurElapsed % rect.blurCycleDuration) / rect.blurCycleDuration;
                const blurNormalizedSine = (Math.sin(blurCycleProgress * Math.PI * 2) + 1) / 2;
                const computedBlur = rect.minBlur + blurNormalizedSine * (rect.maxBlur - rect.minBlur);
                
                // Handle initial blur-in
                const initialElapsed = now - rect.initialBlurStartTime;
                const t = Math.min(1, initialElapsed / rect.initialBlurDuration);
                const finalBlur = rect.initialBlur * (1 - t) + computedBlur * t;
                
                // Calculate opacity
                const opacityElapsed = now - rect.opacityStartTime;
                const opacityCycleProgress = (opacityElapsed % rect.opacityCycleDuration) / rect.opacityCycleDuration;
                const opacityNormalizedSine = (Math.sin(opacityCycleProgress * Math.PI * 2) + 1) / 2;
                const currentOpacity = rect.minOpacity + opacityNormalizedSine * (rect.maxOpacity - rect.minOpacity);
                
                // Apply updates in a batch
                rect.el.style.filter = `blur(${finalBlur}px)`;
                rect.el.style.opacity = currentOpacity;
            }
            
            // Continue animation
            requestAnimationFrame(updateAll);
        }
        
        // Start animation
        requestAnimationFrame(updateAll);
        
        // Update container size on window resize
        window.addEventListener('resize', function() {
            container.style.height = document.documentElement.scrollHeight + 'px';
        });
    }
});
