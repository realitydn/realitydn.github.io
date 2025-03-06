/**
 * Reality Website - FAQ Accordion Functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get all FAQ question elements
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    // Add click event listener to each question
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            // Get the parent FAQ item
            const faqItem = this.parentElement;
            
            // Check if this item is already active
            const isActive = faqItem.classList.contains('active');
            
            // Close all FAQ items first
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // If the clicked item wasn't active before, make it active now
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });
});
