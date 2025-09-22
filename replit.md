# Portfolio Website

## Overview

This is a full-stack portfolio website for Jaehyeon (AJ) Ahn, a UW Computer Science student specializing in Data Science. The application showcases academic projects, current studies, skills, and professional experience through a modern, responsive web interface. The site features a React frontend with a Node.js/Express backend, designed to dynamically display portfolio content stored in a PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite as the build tool
- **Styling**: CSS modules with custom properties for theming, featuring a mobile-first responsive design
- **Component Structure**: Modular component architecture with dedicated CSS files for each component
- **Routing**: React Router DOM for client-side navigation
- **State Management**: Custom React hooks for data fetching and state management
- **Build Tool**: Vite with hot module replacement for development

### Backend Architecture
- **Runtime**: Node.js with Express framework
- **API Design**: RESTful API structure with dedicated routes for portfolio data and admin functionality
- **Database Integration**: PostgreSQL with connection pooling for efficient database operations
- **Authentication**: Simple session-based authentication for admin access with rate limiting
- **Middleware**: CORS enabled, trust proxy configuration for deployment environments

### Data Management
- **Database**: PostgreSQL with structured tables for hero information, statistics, projects, skills, and education
- **Schema Design**: Normalized database structure with JSONB support for flexible data storage (technologies array)
- **Data Seeding**: JSON-based data initialization system for portfolio content
- **Migration System**: Automated database initialization with table creation

### Deployment & Configuration
- **Production Ready**: Environment-specific configurations with HTTPS redirect and canonical domain handling
- **Proxy Configuration**: Vite proxy setup for seamless API communication during development
- **Static Assets**: Optimized build process with proper asset handling
- **Security**: Production security headers and secure parameter handling

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React 18.2.0, React DOM, React Router DOM for navigation
- **Development Tools**: Vite build tool, TypeScript support, React plugin for Vite

### Backend Dependencies
- **Core Server**: Express 4.18.2 for HTTP server functionality
- **Database**: PostgreSQL (pg 8.11.3) for data persistence
- **Security & Utilities**: CORS for cross-origin requests, path utilities for file handling
- **Development**: Nodemon for development server auto-restart

### Build & Development Tools
- **Concurrency**: Concurrently package for running multiple development servers
- **Package Management**: npm with lock files for dependency version control
- **Development Workflow**: Separate client and server development scripts with unified commands

### Infrastructure Dependencies
- **Hosting**: Designed for Replit deployment with proxy trust configuration
- **Database Hosting**: PostgreSQL connection string support for external database providers
- **SSL/HTTPS**: Production-ready HTTPS handling with proper redirect logic
- **Domain Management**: Canonical domain redirect system for www.hereaj.com