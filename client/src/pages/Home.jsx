
import React from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import HeroSection from '../components/HeroSection';
import StatsSection from '../components/StatsSection';
import AboutSection from '../components/AboutSection';
import ProjectsSection from '../components/ProjectsSection';
import SkillsSection from '../components/SkillsSection';
import EducationSection from '../components/EducationSection';
import ContactSection from '../components/ContactSection';
import ProjectCard from '../components/ProjectCard';
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
        <section className="current-studies-section">
          <div className="section-header">
            <h2 className="section-title">What I'm Currently Studying</h2>
            <p className="section-subtitle">Current coursework and academic focus areas</p>
          </div>
          <div className="projects-grid grid grid-2">
            {data.currentStudies.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
        <ContactSection contact={data.contact} />
      </div>
    </div>
  );
};

export default Home;
