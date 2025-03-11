/**
 * Reality Website - Main JavaScript
 * Performance-optimized version with:
 * - Improved scroll handling
 * - Better event delegation
 * - Throttled and debounced events
 * - Optimized animations
 */

document.addEventListener('DOMContentLoaded', function() {
    // ===== Utility Functions =====
    
    // Throttle function to limit frequency of event handler execution
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
    
    // Debounce function to delay execution until after events stop
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    // ===== Mobile Menu Setup =====
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;
    
    // Create overlay element for mobile menu (only if needed)
    let overlay;
    
    function createOverlay() {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.classList.add('menu-overlay');
            body.appendChild(overlay);
            
            // Add event listener to overlay
            overlay.addEventListener('click', closeMenu);
        }
    }
    
    // Toggle mobile menu
    function toggleMenu() {
        if (!overlay) createOverlay();
        
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Control body scrolling
        if (navLinks.classList.contains('active')) {
            body.style.overflow = 'hidden';
        } else {
            body.style.overflow = '';
        }
    }
    
    // Close menu
    function closeMenu() {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        body.style.overflow = '';
    }
    
    // Add event listeners
    if (hamburger) {
        hamburger.addEventListener('click', toggleMenu);
    }
    
    // Use event delegation for nav links
    if (navLinks) {
        navLinks.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                closeMenu();
            }
        });
    }
    
    // ===== Smooth Scroll for Navigation =====
    document.addEventListener('click', function(e) {
        // Only process clicks on nav links (event delegation)
        if (e.target.tagName === 'A' && e.target.closest('nav')) {
            const href = e.target.getAttribute('href');
            
            // Only handle internal hash links
            if (href && href.startsWith('#')) {
                e.preventDefault();
                
                const targetId = href;
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Use native smooth scrolling (more performant than JS)
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Update URL hash without scrolling
                    history.pushState(null, null, href);
                }
            }
        }
    });
    
    // ===== Intersection Observer for Animation on Scroll =====
    // Only create observer if we have elements to animate
    const sections = document.querySelectorAll('.section-animate');
    
    if (sections.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add a small delay for each section for a cascade effect
                    setTimeout(() => {
                        entry.target.style.opacity = "1";
                        entry.target.style.transform = "translateY(0)";
                    }, 100);
                    
                    // Stop observing once animated
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            threshold: 0.15,
            // Use rootMargin to trigger animations a bit earlier
            rootMargin: '0px 0px -50px 0px'
        });
        
        sections.forEach((section, index) => {
            // Set initial state
            section.style.opacity = "0";
            section.style.transform = "translateY(20px)";
            
            // Use hardware-accelerated properties for better performance
            section.style.transition = "opacity 0.8s ease-out, transform 0.8s ease-out";
            section.style.willChange = "opacity, transform";
            
            // Start observing
            observer.observe(section);
        });
    }
    
    // ===== Change Header Background on Scroll =====
    const nav = document.querySelector('nav');
    
    if (nav) {
        // Throttle scroll event for better performance
        const handleScroll = throttle(() => {
            // Use classList instead of style properties for better performance
            if (window.scrollY > 50) {
                nav.classList.add('sticky');
            } else {
                nav.classList.remove('sticky');
            }
        }, 100);
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Initial check in case page loads already scrolled
        handleScroll();
    }
    
    // ===== Handle Resize Events =====
    window.addEventListener('resize', debounce(function() {
        // Reset mobile menu state on window resize
        if (window.innerWidth > 900 && navLinks && navLinks.classList.contains('active')) {
            closeMenu();
        }
    }, 250));
    
    // ===== Check if page was loaded with a hash and scroll to it =====
    if (window.location.hash) {
        setTimeout(() => {
            const targetElement = document.querySelector(window.location.hash);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 500);
    }
});
