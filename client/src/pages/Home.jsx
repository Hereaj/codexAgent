
import React from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import HeroSection from '../components/HeroSection';
import StatsSection from '../components/StatsSection';
import AboutSection from '../components/AboutSection';
import ProjectsSection from '../components/ProjectsSection';
import SkillsSection from '../components/SkillsSection';
import EducationSection from '../components/EducationSection';
import ContactSection from '../components/ContactSection';
import LoadingSpinner from '../components/LoadingSpinner';

const Home = () => {
  const { data, loading, error } = usePortfolio();

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="error">No data available</div>;

  return (
    <div className="home">
      <div className="container">
        <HeroSection hero={data.hero} />
        <StatsSection stats={data.hero.stats} />
        <AboutSection about={data.about} />
        <ProjectsSection projects={data.projects} />
        <SkillsSection skills={data.skills} />
        <EducationSection education={data.education} />
        <ContactSection contact={data.contact} />
      </div>
    </div>
  );
};

export default Home;
