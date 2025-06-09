# TODO - Clueless AI Assistant Improvements

## 🚀 Feature Enhancements

- [ ] Fix auto-arrange, use dnd sorting library
- [ ] Post-it notes are being added not in a random position one over the other, we should better format the position of the post-it notes when they are added
- [ ] Post-it notes are being added too fast,  we should make sure Gemini waits a bit before adding a new post-it note, so that the user can read the previous one
- [ ] Fix the selected note to z-index front
- [ ] Fix click-through on the transparent background
- [ ] Background blur effect is not working properly
- [ ] Make the AI able to edit previous notes, adding a note id
- [ ] Bug, note boomerang when drag release

## 🧠 Memory & Context Management (RAG Implementation)

### Core Memory System
- [ ] **Implement RAG (Retrieval-Augmented Generation) system**
  - [ ] Set up vector database (ChromaDB, Pinecone, ...)
  - [ ] Create document embedding pipeline using sentence transformers
  - [ ] Implement conversation history storage with semantic search
  - [ ] Add memory persistence across app sessions
  - [ ] Create memory cleanup and pruning mechanisms

### Context Insertion Features
- [ ] **Resume/Profile Context Management**
  - [ ] Create UI for uploading and managing personal documents (PDF, DOCX, TXT)
  - [ ] Implement document parsing and chunking
  - [ ] Add context templates for common scenarios (job interviews, meetings, etc.)
  - [ ] Build context selection interface for active conversations

- [ ] **Job Position Context**
  - [ ] Add job description upload and parsing
  - [ ] Create job-specific context templates
  - [ ] Add company information context integration

- [ ] **Dynamic Context Injection**
  - [ ] Build context relevance scoring system
  - [ ] Implement automatic context selection based on conversation topic
  - [ ] Add manual context toggle controls in UI
  - [ ] Create context preview and editing capabilities

## 🎨 Output Formatting & User Experience

### Real-time Output Management
- [ ] **Streaming Response Improvements**
  - [ ] Change the UI to be like post-it notes fade infinity scrollable list.
  - [ ] The AI can also edit previous post-it notes, so that the user can see the changes made by the AI.
  - [ ] Divide screen in sections for better readability, be able to collapse sections, ex. "Follow-up questions", "Reference Information", "Contextual Notes", etc. Need to think more about this on how to best structure it (some options are: using tabs, collapsible sections, color different the post-it notes, etc).
  - [ ] Create pause/resume controls for AI responses

- [ ] **Output Formatting**
  - [ ] Add better markdown rendering for AI responses
  - [ ] Implement code syntax highlighting

- [ ] **Conversation Management**
  - [ ] Build conversation history UI with search
  - [ ] Add conversation export (PDF, TXT, Markdown)
  - [ ] Implement conversation branching and threading
  - [ ] Be able to continue conversations from previous sessions

### Configuration & Settings
- [x] **Configuration Window/Panel** ✅ **PARTIALLY COMPLETED**
  - [x] ~~Create settings UI with tabbed interface~~ (Using HeroUI Cards/sections)
  - [ ] Add Gemini API token configuration through UI
  - [ ] Implement API key validation and testing
  - [ ] Build model selection dropdown
  - [ ] Add temperature and response parameter controls
  - [x] ~~Create audio input/output device selection~~ (Already implemented with HeroUI Select)
  - [ ] Add keyboard shortcuts customization

## 🕵️ Undetectable Configuration

### Stealth Features
- [ ] **System Integration**
  - [ ] Build process hiding mechanisms
  - [ ] Add system tray stealth mode
  - [ ] Implement hotkey-only activation/deactivation
  
- [ ] **Detection Countermeasures**
  - [ ] Be invisible to meetings like Zoom, Teams, etc.
  - [ ] Implement keystroke timing randomization

## 📚 Documentation & Website

### Documentation Improvements
- [ ] **Technical Documentation**
  - [ ] Create comprehensive documentation
  - [ ] Add code architecture diagrams
  - [ ] Write deployment and configuration guides

- [ ] **User Documentation**
    - [ ] Select the best documentation platform (starlight, docusaurus, etc.)
  - [ ] Create user manual with screenshots
  - [ ] Add quick start guide
  - [ ] Write feature-specific tutorials
  - [ ] Build keyboard shortcuts reference

### Website Development
- [ ] **Project Website**
  - [ ] Design and build landing page
  - [ ] Create feature showcase with demos
  - [ ] Add download page with version management

- [ ] **Video Content**
  - [ ] Record installation walkthrough video
  - [ ] Create feature demonstration videos
  - [ ] Build use-case scenario videos
  - [ ] Add troubleshooting video guides

## 📦 Build & Distribution

### Easy Installation
- [ ] **Automated Builds**
  - [ ] Set up GitHub Actions CI/CD pipeline
  - [ ] Create automated release generation
  - [ ] Implement cross-platform build automation
  - [ ] Add code signing for Windows/macOS

- [ ] **Installation Packages**
  - [ ] Create Windows installer (NSIS/WiX)
  - [ ] Build macOS DMG with proper app signing
  - [ ] Generate Linux AppImage/Snap packages
  - [ ] Add portable executable versions

- [ ] **Distribution Channels**
  - [ ] Set up automatic GitHub releases
  - [ ] Create Homebrew formula for macOS
  - [ ] Build Chocolatey package for Windows
  - [ ] Submit to Linux package repositories

### Update System
- [ ] **Auto-updater Implementation**
  - [ ] Integrate electron-updater
  - [ ] Create update notification system
  - [ ] Implement delta updates for efficiency
  - [ ] Add rollback functionality

## 🔧 Technical Improvements

### Audio System Improvements
- [ ] **Multichannel Audio Support**
  - [ ] Be able to use a LLLM (Large Language Model) with multiple audio channels
  - [ ] Implement audio channel selection in settings

- [ ] **Migration from Audify to Display Media Capture**
  - [ ] Replace Audify dependency with native Web APIs
  - [ ] Implement getDisplayMedia() for screen audio capture
  - [ ] Add getUserMedia() for microphone access
  - [ ] Create fallback mechanisms for browser compatibility
  - [ ] Update audio processing pipeline for new APIs
  - [ ] Remove native audio dependencies (RtAudio, libsamplerate-js)
  - [ ] Test cross-platform compatibility with new audio system

- [ ] **Memory Management**
  - [ ] Implement conversation history limits
  - [ ] Add memory usage monitoring

### Testing & Quality
- [ ] **Test Coverage**
  - [ ] Add unit tests for core functionality
  - [ ] Create integration tests
  - [ ] Implement E2E testing with Playwright
  - [ ] Add performance benchmarking
