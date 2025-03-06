/**
 * Reality Website - Language Switching
 * 
 * This file handles the language switching functionality between English and Vietnamese.
 * It uses data attributes in the HTML to store translations and updates the text content
 * based on the selected language.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Language switching functionality
    const langButtons = document.querySelectorAll('.language-btn');
    
    // Check if there's a saved language preference
    const savedLang = localStorage.getItem('realityLanguage');
    
    // Set initial language
    if (savedLang) {
        setLanguage(savedLang);
    }
    
    // Toggle active class for language buttons
    langButtons.forEach(button => {
        if (savedLang === button.dataset.lang) {
            langButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        }
        
        button.addEventListener('click', function() {
            const language = this.dataset.lang;
            
            // Update active state
            langButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Set language
            setLanguage(language);
            
            // Save preference to localStorage
            localStorage.setItem('realityLanguage', language);
        });
    });
    
    // Function to set language
    function setLanguage(language) {
        // Find all elements with translatable content
        const translatableElements = document.querySelectorAll('.translatable');
        
        translatableElements.forEach(element => {
            // Get the translation text from the data attribute
            const translatedText = element.dataset[language];
            
            // Only update if there's a translation available
            if (translatedText) {
                element.textContent = translatedText;
            }
        });
        
        // Update HTML lang attribute
        document.documentElement.lang = language;
        
        // Update active state on language buttons
        langButtons.forEach(btn => {
            if (btn.dataset.lang === language) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
});
