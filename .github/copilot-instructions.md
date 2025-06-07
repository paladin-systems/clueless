# GitHub Copilot Instructions for Clueless

> **Important**: This file should be updated whenever major changes occur to the project, including:
> - Library upgrades or changes (React, Electron, Zustand, etc.)
> - Architecture modifications (state management patterns, component structure)
> - New development patterns or coding standards
> - Technology stack additions or removals
> - Environment variable changes

## Project Overview
Clueless is a real-time AI-powered desktop assistant built with Electron, React, and Google's Gemini AI. It features voice interaction, post-it note management, and real-time audio processing capabilities.

## Technology Stack
- **Frontend**: React 19 + TypeScript, Tailwind CSS v4, Framer Motion
- **Desktop Framework**: Electron with Vite build system
- **AI Integration**: Google Gemini 2.0 Flash Live API
- **Audio Processing**: Audify (RtAudio), libsamplerate-js
- **State Management**: Zustand v5 with shallow selectors
- **Package Manager**: Bun
- **Code Quality**: Biome (linting + formatting), Husky + lint-staged

## Key Architecture Patterns

### State Management
- Use Zustand with `useShallow` for optimized subscriptions
- Store structure includes: audio state, Gemini responses, post-it notes, UI state
- Example pattern:
```typescript
const audioState = useStore(useShallow((state) => ({
  micLevel: state.micLevel,
  isRecording: state.isRecording,
})));
```

### Component Structure
- Main layout: [`AppLayout.tsx`](../src/components/AppLayout.tsx)
- Modular components in [`src/components/`](../src/components/)
- Shared components in [`src/components/shared/`](../src/components/shared/)
- Custom hooks in [`src/hooks/`](../src/hooks/)

### Electron Architecture
- Main process: [`src/main.ts`](../src/main.ts)
- Preload script: [`src/preload.ts`](../src/preload.ts)
- Renderer: [`src/renderer.tsx`](../src/renderer.tsx)

## Coding Standards

### TypeScript
- Use strict typing with proper interfaces
- Define types in [`src/types/`](../src/types/) directory
- Import types with `type` keyword: `import type { PostItNote } from "../types/ui"`

### React Patterns
- Use functional components with hooks
- Prefer `memo()` for performance optimization
- Use `useCallback` for event handlers
- Error boundaries for component isolation

### Styling
- Tailwind CSS v4 with utility classes
- Custom CSS in [`src/styles/`](../src/styles/) for specific components
- Use `clsx` and `tailwind-merge` for conditional classes

### Audio Processing
- Real-time audio capture in 40ms chunks
- 16kHz sample rate, mono channel, 16-bit PCM
- Handle device selection and audio level monitoring

## File Naming Conventions
- Components: PascalCase (e.g., `AppLayout.tsx`)
- Hooks: camelCase with "use" prefix (e.g., `useKeyboardShortcuts.ts`)
- Types: camelCase files, PascalCase interfaces (e.g., `ui.ts` → `PostItNote`)
- Utils: camelCase (e.g., `exportUtils.ts`)

## Development Guidelines

### Performance
- Use `useShallow` for Zustand subscriptions
- Debounce storage operations with custom hook
- Optimize re-renders with `memo` and proper dependency arrays

### Error Handling
- Wrap components in [`ErrorBoundary`](../src/components/shared/ErrorBoundary.tsx)
- Use [`ModalErrorBoundary`](../src/components/shared/ModalErrorBoundary.tsx) for modals
- Implement proper error logging with [`logger`](../src/utils/logger.ts)

### Audio Features
- Microphone and system audio level monitoring
- Device selection for input/output
- Real-time recording with visual feedback

### AI Integration
- Stream responses from Gemini API
- Categorize responses: "answer", "advice", "follow-up"
- Handle response building state for UI updates

### Logging
- Use the [`logger`](../src/utils/logger.ts) utility for consistent logging

## Common Patterns to Follow

### Component Props
```typescript
interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  // ... specific props
}
```

### Event Handlers
```typescript
const handleEvent = useCallback((param: Type) => {
  // handler logic
}, [dependencies]);
```

### Store Actions
```typescript
// In store definition
setStateValue: (value: Type) => set({ stateKey: value }),
```

## Environment Variables
- `GEMINI_API_KEY`: Required for AI functionality
- `GEMINI_MODEL`: Model identifier (default: gemini-2.0-flash-live-001)
- `GEMINI_TEMPERATURE`: Response creativity (0-1, default: 0.7)

## Build Scripts
- `bun run dev`: Development with hot reload
- `bun run build`: Production build
- `bun run package:portable`: Create executable
- `bun run check:fix`: Format + lint with Biome

## Key Features to Consider
- Post-it note canvas with drag & drop
- Real-time voice interaction
- Audio device management
- Keyboard shortcuts system
- Settings modal with preferences
- Export/import functionality

When writing code for this project, prioritize performance, type safety, and maintainable patterns consistent with the existing codebase.

## Maintenance Note
**Remember to update this file when making significant changes to:**
- Dependencies in [`package.json`](../package.json)
- Project architecture or patterns
- Development workflows or build processes
- Code quality tools or configurations
- Environment setup requirements

This ensures GitHub Copilot always has current context about the project's structure and conventions.