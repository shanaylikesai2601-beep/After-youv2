// Carousel functionality with prefers-reduced-motion support
document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.querySelector('.carousel');
    const slides = carousel.querySelectorAll('.slide');
    const prevButton = carousel.querySelector('.prev');
    const nextButton = carousel.querySelector('.next');
    
    let currentIndex = 0;
    let autoPlayInterval;
    const slideInterval = 5000; // 5 seconds
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Function to show a specific slide
    function showSlide(index) {
        // Remove active class from all slides
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            slide.setAttribute('aria-hidden', i !== index ? 'true' : 'false');
        });
        
        // Add active class to current slide
        slides[index].classList.add('active');
        slides[index].setAttribute('aria-hidden', 'false');
        
        currentIndex = index;
    }
    
    // Function to show next slide
    function showNextSlide() {
        const nextIndex = (currentIndex + 1) % slides.length;
        showSlide(nextIndex);
    }
    
    // Function to show previous slide
    function showPrevSlide() {
        const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
        showSlide(prevIndex);
    }
    
    // Event listeners for buttons
    prevButton.addEventListener('click', function() {
        showPrevSlide();
        resetAutoPlay();
    });
    
    nextButton.addEventListener('click', function() {
        showNextSlide();
        resetAutoPlay();
    });
    
    // Function to reset auto-play (respects reduced motion)
    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        if (!prefersReducedMotion.matches) {
            autoPlayInterval = setInterval(showNextSlide, slideInterval);
        }
    }
    
    // Initialize
    showSlide(0);
    
    // Start auto-play only if not preferring reduced motion
    if (!prefersReducedMotion.matches) {
        autoPlayInterval = setInterval(showNextSlide, slideInterval);
    }
    
    // Listen for changes in reduced motion preference
    prefersReducedMotion.addEventListener('change', function(e) {
        if (e.matches) {
            // User enabled reduced motion - stop auto-play
            clearInterval(autoPlayInterval);
        } else {
            // User disabled reduced motion - start auto-play
            autoPlayInterval = setInterval(showNextSlide, slideInterval);
        }
    });
});