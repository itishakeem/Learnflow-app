# AGENTS.md — LearnFlow Application

> Generated via `agents-md-gen` skill from Learnflow-skills.

## Repository Overview

LearnFlow is an AI-powered Python tutoring platform built using microservices on Kubernetes.

## Architecture

```
learnflow-app/
├── frontend/          # Next.js + Monaco editor
├── services/
│   ├── triage/        # FastAPI triage agent
│   ├── concepts/      # FastAPI concepts agent
│   ├── exercise/      # FastAPI exercise agent
│   ├── debug/         # FastAPI debug agent
│   └── progress/      # FastAPI progress agent
├── k8s/               # Kubernetes manifests
│   ├── kafka/
│   ├── postgres/
│   ├── dapr/
│   └── services/
└── docs/              # Docusaurus documentation site
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + Monaco Editor |
| Backend | FastAPI + OpenAI SDK |
| Service Mesh | Dapr |
| Messaging | Kafka on Kubernetes |
| Database | PostgreSQL (Neon) |
| Orchestration | Kubernetes (Minikube) |

## Conventions

- All services use FastAPI (Python)
- Dapr sidecar injected via K8s annotations
- Events published to Kafka topics: `learning.*`, `code.*`, `exercise.*`, `struggle.*`
- Skills from `Learnflow-skills` used to build all components

## Skills Used

Built using skills from the `Learnflow-skills` repository:
- `kafka-k8s-setup` — Kafka deployment
- `postgres-k8s-setup` — PostgreSQL deployment
- `fastapi-dapr-agent` — all backend microservices
- `nextjs-k8s-deploy` — frontend deployment
- `mcp-code-execution` — MCP integration
- `docusaurus-deploy` — documentation site
