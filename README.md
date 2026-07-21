# AfterYou

> **The autonomous AI teammate that keeps working after you've closed your laptop.**

![AfterYou Banner](./public/og-image.png)

## 🚀 Overview

AfterYou transforms a single prompt into an autonomous mission.

Instead of acting like a chatbot, Nova plans, delegates, executes, verifies, and iterates on complex software tasks while giving you complete visibility into every step.

The experience is designed around the idea that AI should become a true teammate—not just answer questions.

---

## ✨ Features

- 🧠 Autonomous AI mission planning
- 🎯 Multi-stage "What Next" refinement workflow
- 🤖 AI-generated next-step suggestions
- 📋 Mission timeline with live progress
- 🧩 Intelligent task decomposition
- ⚡ Multi-agent architecture
- 🔍 Built-in verification and review pipeline
- 📊 Mission diagnostics
- 🎨 Premium animated interface
- 🌙 Modern glassmorphism design

---

## 🛠 Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- shadcn/ui
- Zod
- Vercel
- OpenAI-compatible AI providers

---

## 🏗 How It Works

### 1. Assign a Mission

Describe what you want Nova to accomplish.

---

### 2. Refine the Goal

Instead of immediately executing, Nova asks:

> **What Next?**

Across three rounds, Nova generates intelligent follow-up suggestions that progressively refine the mission.

---

### 3. Planning

Nova decomposes the objective into structured tasks and dependencies.

---

### 4. Execution

Specialized AI agents execute each task while tracking progress.

---

### 5. Review

Completed work is reviewed before the mission is finalized.

---

## 📸 Screenshots

### Landing Page

(Add screenshot)

### Mission Creation

(Add screenshot)

### What Next

(Add screenshot)

### Mission Timeline

(Add screenshot)

---

## 💡 Inspiration

Modern AI assistants stop helping the moment the conversation ends.

We wanted to build something different:

An AI teammate that continues moving work forward instead of waiting for the next prompt.

---

## 🧠 Challenges

- Building a multi-agent orchestration system
- Designing an intuitive refinement workflow
- Creating a production-quality UI
- Making autonomous planning transparent
- Supporting both desktop and cloud environments

---

## 📚 What We Learned

This project taught us how difficult autonomous AI systems really are—from planning and orchestration to tool execution, verification, and user experience.

We also learned the importance of balancing powerful automation with transparency so users always understand what the AI is doing.

---

## 🔮 Future Plans

- Persistent cloud mission storage
- Long-running background agents
- GitHub integration
- Slack and Discord integrations
- Cloud workspace synchronization
- Multi-user collaboration
- Autonomous scheduled missions

---

## ⚙️ Setup Instructions

### Prerequisites

- **Node.js 20.9.0 or later** (required by Next.js 16)
- **npm**, which is used by the committed `package-lock.json`
- An account and API key for at least one supported AI provider: NVIDIA, an OpenAI-compatible endpoint, Groq, or a locally running Ollama instance

No Supabase or external database is required for local development. AfterYou stores local mission and session data in the `.afteryou/` directory.

### Clone and install

```bash
git clone <repo-url>
cd after-youv2
npm ci
```

`npm install` also works, but `npm ci` installs the dependency versions recorded in the lockfile.

### Configure environment variables

Create a `.env.local` file at the project root. It is ignored by Git and must never be committed. Choose one of the following provider configurations.

**OpenAI-compatible API**

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**NVIDIA API**

```bash
AI_PROVIDER=nvidia
NVIDIA_API_KEY=your_api_key
```

**Groq API**

```bash
AI_PROVIDER=groq
GROQ_API_KEY=your_api_key
```

**Local Ollama**

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=qwen2.5:3b
```

For Ollama, install and run Ollama locally and make sure the selected model has been pulled before starting AfterYou. The app also accepts optional provider-specific model and output-token settings, such as `OPENAI_MAX_OUTPUT_TOKENS`, `NVIDIA_MODEL`, and `GROQ_MODEL`.

### Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Troubleshooting

- If a mission cannot call an AI model, confirm that `AI_PROVIDER` matches one of `nvidia`, `openai`, `groq`, or `ollama`, and that the corresponding credentials or local Ollama server are available.
- If a port conflict prevents startup, stop the process using port `3000` and run `npm run dev` again.
- To reset local mission and session history during development, remove the contents of `.afteryou/`. This deletes local data only.
- Native workspace selection is available on macOS during local development; deployment environments use a different workspace flow.

---

## ⚙ Running Locally

```bash
git clone <repo-url>

cd after-youv2

npm install

npm run dev
```

Open:

```
http://localhost:3000
```

---

## 🤝 How Codex & GPT-5.6 Were Used

AfterYou was developed with OpenAI Codex as an AI coding partner throughout the build process. Codex supported feature implementation, debugging, refactoring, architecture improvements, testing, and ongoing code-quality work. It accelerated iteration while keeping implementation details and trade-offs visible to the team.

ChatGPT powered by GPT-5.6 was used for brainstorming, system design, planning the AI-agent architecture, solving engineering challenges, and refining product decisions. GPT-5.6 helped shape AfterYou’s autonomous workflow, including mission planning, agent orchestration, tool execution, progress tracking, and verification systems.

These AI tools were development collaborators that accelerated the work—not replacements for the development process. The final architecture, product decisions, and implementation were designed, evaluated, and built as part of creating AfterYou.

---

## 👥 Team

Built for the OpenAI Build Challenge.

---

## 📄 License

MIT
