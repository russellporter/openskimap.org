# OpenSkiMap.org Development Guide

## Build Commands
- `yarn start` - Start development server
- `yarn build` - Build production version
- `yarn check-types` - Run TypeScript type checking
- `yarn pull` - Pull latest code and install dependencies

## Code Style Guidelines
- **Formatting**: Uses Prettier with 2-space indentation
- **Types**: TypeScript with strict type checking
- **Components**: React functional components with hooks
- **Naming**: 
  - PascalCase for components and interfaces
  - camelCase for variables and functions
  - Use descriptive names
- **Imports**: Organize imports automatically on save
- **State Management**: Custom state management with EventBus
- **Error Handling**: Use assertion functions where appropriate

## Repository Structure
- `src/components/` - React components
- `src/assets/` - Static assets
- `src/` - Core configuration and entry points