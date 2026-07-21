import React from 'react';
import styles from '../styles/HeroSection.module.css';

const HeroSection = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>Welcome to Our Platform</h1>
        <p className={styles.heroSubtitle}>
          Discover innovative solutions that transform your business and drive growth.
        </p>
        <a href="#features" className={styles.heroButton}>
          Get Started
        </a>
      </div>
    </section>
  );
};

export default HeroSection;