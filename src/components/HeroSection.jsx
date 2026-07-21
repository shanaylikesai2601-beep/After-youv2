import React from 'react';
import styles from '../styles/HeroSection.module.css';

const HeroSection = () => {
  return (
    <section
      className={styles.hero}
      role="region"
      aria-labelledby="hero-title"
      aria-describedby="hero-subtitle"
    >
      <div className={styles.heroContent}>
        <h1 id="hero-title" className={styles.heroTitle}>
          Welcome to Our Platform
        </h1>
        <p id="hero-subtitle" className={styles.heroSubtitle}>
          Discover innovative solutions that transform your business and drive growth.
        </p>
        <a
          href="#features"
          className={styles.heroButton}
          aria-label="Get started with our platform"
        >
          Get Started
        </a>
      </div>
    </section>
  );
};

export default HeroSection;