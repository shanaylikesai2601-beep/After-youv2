document.addEventListener('DOMContentLoaded', function() {
    const root = document.getElementById('root');
    
    root.innerHTML = `
        <header>
            <div class="container">
                <h1>Lumina AI</h1>
                <p>Illuminating the Future of Artificial Intelligence</p>
            </div>
        </header>
        
        <section class="features">
            <div class="container">
                <div class="feature">
                    <div class="feature-icon">🧠</div>
                    <h3>Advanced AI Models</h3>
                    <p>Cutting-edge machine learning models tailored for your business needs.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h3>Lightning Fast Processing</h3>
                    <p>Optimized algorithms that deliver results in real-time.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h3>Secure & Private</h3>
                    <p>Enterprise-grade security with data privacy at our core.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📊</div>
                    <h3>Actionable Insights</h3>
                    <p>Turn data into decisions with intuitive analytics dashboards.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🌐</div>
                    <h3>Seamless Integration</h3>
                    <p>Easy API integration with your existing workflows and systems.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">💡</div>
                    <h3>Innovative Solutions</h3>
                    <p>Custom AI solutions designed to solve your unique challenges.</p>
                </div>
            </div>
        </section>
        
        <section class="cta">
            <div class="container">
                <h2>Ready to Transform Your Business?</h2>
                <p>Get started with Lumina AI today and experience the power of intelligent automation.</p>
                <a href="#" class="cta-button">Request a Demo</a>
            </div>
        </section>
        
        <footer>
            <div class="container">
                <p>&copy; 2023 Lumina AI. All rights reserved.</p>
            </div>
        </footer>
    `;
});