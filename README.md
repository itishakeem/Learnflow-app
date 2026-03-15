# LearnFlow App

AI-powered Python tutoring platform built on Kubernetes using microservices, Kafka, and Dapr.

## Built With Skills

This application is built entirely using skills from the `Learnflow-skills` repository.

## Architecture

- **Frontend:** Next.js + Monaco editor
- **Backend:** FastAPI microservices + Dapr sidecars
- **Messaging:** Apache Kafka
- **Database:** PostgreSQL
- **Orchestration:** Kubernetes

## AI Agents

| Agent | Purpose |
|-------|---------|
| Triage Agent | Routes queries to specialist agents |
| Concepts Agent | Explains Python concepts |
| Code Review Agent | Reviews code quality |
| Debug Agent | Helps debug errors |
| Exercise Agent | Generates coding challenges |
| Progress Agent | Tracks mastery scores |

## Getting Started

Use the skills from `Learnflow-skills` to deploy:

```
# Deploy full platform (via Goose)
goose run recipes/deploy-learnflow-platform/RECIPE.md

# Or use Claude Code skill by skill
Deploy Kafka on Kubernetes
Deploy PostgreSQL on Kubernetes
Create FastAPI Dapr agent service: triage
Deploy Next.js frontend to Kubernetes
```
