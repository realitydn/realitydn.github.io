/**
 * MontserratHeaderGlitch - Performant font switching effect (WORD BASED)
 * for headers using Montserrat and Montserrat Alternates.
 * Allows natural line breaks between words.
 * Relies on CSS variable '--glitch-accent-color' being set.
 * Includes reinitializeElement method for language switching.
 */
class MontserratHeaderGlitch {
    constructor() {
      // Configuration
      this.selector = 'h1, h2, h3'; // Target headers
      this.glitchProbability = 0.056; 
      this.minDuration = 1000; 
      this.maxDuration = 8000; 
      this.visibilityThreshold = 0.3; 
      this.throttleDelay = 800; 
  
      // State management
      this.elements = []; 
      this.words = new Map(); 
      this.glitchedWords = new Set(); 
      this.visibleElements = new Set(); 
      this.lastUpdateTime = 0; 
      this.frameId = null; 
      this.isRunning = false; 
      this.initialized = false; 
      this.observer = null; 
    }
  
    // Initialize the effect
    init() {
      if (this.initialized) return;
      console.log("Initializing MontserratHeaderGlitch (Word Based)...");
  
      // Check font readiness
      document.fonts.ready.then(() => {
        const montserratLoaded = document.fonts.check("1em 'Montserrat'");
        const alternatesLoaded = document.fonts.check("1em 'Montserrat Alternates'");
        if (!montserratLoaded) console.warn('Montserrat font may not be fully loaded.');
        if (!alternatesLoaded) console.warn('Montserrat Alternates font may not be fully loaded.');
        if (montserratLoaded && alternatesLoaded) console.log("Montserrat fonts seem ready.");
      });
  
      // Find target elements
      this.elements = Array.from(document.querySelectorAll(this.selector));
      if (this.elements.length === 0) {
          console.warn(`No elements found for selector "${this.selector}".`);
          return; 
      }
       console.log(`Found ${this.elements.length} elements for word glitch effect.`);
  
      // Setup visibility observer
      this.setupVisibilityObserver();
  
      this.initialized = true;
    }
  
    // Set up IntersectionObserver
    setupVisibilityObserver() {
      if (!('IntersectionObserver' in window)) {
          console.warn("IntersectionObserver not supported. Glitching all headers.");
          this.elements.forEach(element => this.initElement(element));
          this.visibleElements = new Set(this.elements); 
          return;
      }
  
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const element = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= this.visibilityThreshold) {
            // Element is visible - initialize if not already done
            if (!this.visibleElements.has(element)) {
              this.initElement(element); // Wrap words
              this.visibleElements.add(element); // Start tracking
            }
          } else {
            // Element is not visible - stop tracking
            if (this.visibleElements.has(element)) {
               this.visibleElements.delete(element); 
            }
          }
        });
      }, {
        threshold: [0, this.visibilityThreshold] 
      });
  
      // Observe all target elements initially found
      this.elements.forEach(element => {
        this.observer.observe(element);
      });
    }
  
    // Prepare a header element by wrapping its WORDS in spans
    // This is the core logic for setting up an element
    _wrapWords(element) {
        const text = element.textContent || '';
        element.innerHTML = ''; // Clear existing content
  
        const wordOrSpaceRegex = /\S+|\s+/g;
        let match;
        const wordSpans = []; 
        const fragment = document.createDocumentFragment(); 
  
        while ((match = wordOrSpaceRegex.exec(text)) !== null) {
            const chunk = match[0];
            if (/\s+/.test(chunk)) {
                fragment.appendChild(document.createTextNode(chunk));
            } else {
                const span = document.createElement('span');
                span.textContent = chunk;
                span.className = 'glitch-word'; 
                fragment.appendChild(span);
                wordSpans.push(span); 
            }
        }
        element.appendChild(fragment);
        this.words.set(element, wordSpans); // Store the new word spans
        element.dataset.glitchInitialized = 'true'; 
    }
  
  
    // Initialize element only if it hasn't been done before
    initElement(element) {
      if (element.dataset.glitchInitialized) return;
      this._wrapWords(element); // Use the internal word wrapping function
    }
  
    // --- NEW PUBLIC METHOD ---
    // Re-initialize a specific element (e.g., after language change)
    reinitializeElement(element) {
        if (!this.elements.includes(element)) {
            // console.warn("Attempted to reinitialize element not targeted by glitch effect:", element);
            return; // Only re-init elements we are tracking
        }
        console.log("Re-initializing element for glitch effect:", element.textContent.substring(0,20) + "...");
        
        // Clear previous state for this element if any
        const existingSpans = this.words.get(element);
        if (existingSpans) {
            existingSpans.forEach(span => {
                if (this.glitchedWords.has(span)) {
                    this.glitchedWords.delete(span); // Stop tracking if it was glitching
                }
            });
        }
        
        delete element.dataset.glitchInitialized; // Allow re-initialization
        this._wrapWords(element); // Re-run the word wrapping logic
  
        // Ensure it's observed if needed (should already be observed if visible)
         if (!this.visibleElements.has(element) && this.observer) {
             // If it became visible *during* the language switch somehow
              const entry = this.observer.takeRecords().find(r => r.target === element);
               if (entry && entry.isIntersecting && entry.intersectionRatio >= this.visibilityThreshold) {
                   this.visibleElements.add(element);
               }
         }
    }
    // --- END NEW PUBLIC METHOD ---
  
  
    // Main animation loop
    update(timestamp) {
      if (!this.isRunning) return;
  
      // Throttle
      if (timestamp - this.lastUpdateTime < this.throttleDelay) {
        this.frameId = requestAnimationFrame(this.update.bind(this));
        return;
      }
      this.lastUpdateTime = timestamp;
  
      // Reset Finished Glitches
      // Use Array.from because Set modification during iteration can be tricky
      Array.from(this.glitchedWords).forEach(wordSpan => { 
        if (!wordSpan || !wordSpan.parentNode) { // Check if span still exists in DOM
            this.glitchedWords.delete(wordSpan);
            return;
        }
        if (wordSpan.dataset.endTime && timestamp >= parseInt(wordSpan.dataset.endTime, 10)) {
          wordSpan.classList.remove('glitching'); 
          this.glitchedWords.delete(wordSpan); 
          delete wordSpan.dataset.endTime; 
        }
      });
  
  
      // Apply New Glitches to visible elements
      for (const element of this.visibleElements) {
        const wordSpans = this.words.get(element); 
        if (!wordSpans || wordSpans.length === 0) continue; 
  
        const maxWordsToCheck = Math.max(1, Math.min(3, Math.ceil(wordSpans.length * 0.05))); 
  
        for (let i = 0; i < maxWordsToCheck; i++) {
          // Ensure wordSpans array is not empty before accessing random index
          if (wordSpans.length === 0) break; 
          const randomIndex = Math.floor(Math.random() * wordSpans.length);
          const wordSpan = wordSpans[randomIndex]; 
  
          if (!this.glitchedWords.has(wordSpan) && Math.random() < this.glitchProbability) {
            this.startGlitching(wordSpan, timestamp); 
          }
        }
      }
  
      this.frameId = requestAnimationFrame(this.update.bind(this));
    }
  
    // Apply glitch effect to a word span
    startGlitching(wordSpan, timestamp) {
      wordSpan.classList.add('glitching'); 
      const duration = this.minDuration + Math.random() * (this.maxDuration - this.minDuration);
      wordSpan.dataset.endTime = (timestamp + duration).toString();
      this.glitchedWords.add(wordSpan); 
    }
  
    // Start the animation loop
    start() {
      if (this.isRunning) return; 
      this.init(); 
      if (!this.initialized || this.elements.length === 0) {
          console.log("Word glitch effect not starting: init failed or no elements.");
          return;
      }
      console.log("Starting word glitch effect animation loop...");
      this.isRunning = true;
      this.frameId = requestAnimationFrame(this.update.bind(this));
    }
  
    // Stop the animation loop
    stop() {
      if (!this.isRunning) return;
      console.log("Stopping word glitch effect animation loop...");
      this.isRunning = false;
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      // Use Array.from for safe iteration while modifying Set
      Array.from(this.glitchedWords).forEach(wordSpan => { 
          if (wordSpan) { // Check if span exists
               wordSpan.classList.remove('glitching');
               delete wordSpan.dataset.endTime; 
          }
           this.glitchedWords.delete(wordSpan); 
      });
    }
  
    // Clean up resources
    destroy() {
      console.log("Destroying MontserratHeaderGlitch (Word Based) instance...");
      this.stop(); 
      if (this.observer) {
        // Stop observing elements before disconnecting
        this.elements.forEach(element => this.observer.unobserve(element));
        this.observer.disconnect();
        this.observer = null;
      }
      this.elements = [];
      this.words.clear(); 
      this.visibleElements.clear();
      this.glitchedWords.clear(); // Ensure glitched set is also cleared
      this.initialized = false; 
    }
  }
  