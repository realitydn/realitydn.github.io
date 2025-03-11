/**
 * Reality Website - Optimized FAQ Accordion Functionality
 * Uses event delegation and more efficient DOM operations
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get the FAQ list container
    const faqList = document.querySelector('.faq-list');
    if (!faqList) return;
    
    // Use event delegation instead of attaching listeners to each question
    faqList.addEventListener('click', function(event) {
        // Find the closest question element from the click target
        const question = event.target.closest('.faq-question');
        if (!question) return;
        
        // Get the parent FAQ item
        const faqItem = question.parentElement;
        
        // Check if this item is already active
        const isActive = faqItem.classList.contains('active');
        
        // Get all currently active items (for performance, query only when needed)
        const activeItems = faqList.querySelectorAll('.faq-item.active');
        
        // Close active items
        if (activeItems.length > 0) {
            for (let i = 0; i < activeItems.length; i++) {
                activeItems[i].classList.remove('active');
            }
        }
        
        // If the clicked item wasn't active before, make it active now
        if (!isActive) {
            faqItem.classList.add('active');
            
            // Optional: Scroll into view if partially off-screen
            if (faqItem.getBoundingClientRect().bottom > window.innerHeight) {
                question.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
    
    // Pre-calculate FAQ answer heights for smoother animations
    // This prevents layout thrashing during animations
    const faqAnswers = faqList.querySelectorAll('.faq-answer');
    faqAnswers.forEach(answer => {
        // Store the content height for CSS transitions
        // This technique allows CSS to handle transitions without JS recalculation
        const height = answer.scrollHeight;
        answer.style.setProperty('--content-height', `${height}px`);
    });
});
