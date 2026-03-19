#!/bin/bash
set -e

echo "=== Step 1: Delete existing Minikube ==="
minikube delete --all 2>/dev/null || true

echo "=== Step 2: Start Minikube with 2500MB ==="
minikube start --memory=2500 --cpus=2 --driver=docker

echo "=== Step 3: Install Dapr on Kubernetes ==="
dapr init --kubernetes --wait

echo "=== Step 4: Build images inside Minikube Docker ==="
eval $(minikube docker-env)
docker build -t triage:latest          ./services/triage
docker build -t concepts-agent:latest  ./services/concepts
docker build -t exercise-agent:latest  ./services/exercise
docker build -t debug-agent:latest     ./services/debug
docker build -t progress-agent:latest  ./services/progress

echo "=== Step 5: Create namespace ==="
kubectl create namespace learnflow --dry-run=client -o yaml | kubectl apply -f -

echo "=== Step 6: Create secrets ==="
kubectl create secret generic gemini-secret \
  --from-literal=api-key=AIzaSyBtpP4EKfpw0Is4gzHltcl_eb0aE4n_0fo \
  -n learnflow --dry-run=client -o yaml | kubectl apply -f -

kubectl delete secret postgres-secret -n learnflow --ignore-not-found
kubectl create secret generic postgres-secret \
  --from-literal=url=postgresql://neondb_owner:npg_LWFhinp80tRI@ep-gentle-rice-a159dao6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require \
  -n learnflow

echo "=== Step 7: Deploy Kafka ==="
kubectl apply -f ./k8s/kafka/deployment.yaml
echo "Waiting for Kafka..."
kubectl rollout status statefulset/kafka -n learnflow --timeout=180s

echo "=== Step 8: Apply Dapr component ==="
kubectl apply -f ./k8s/dapr/kafka-pubsub.yaml

echo "=== Step 9: Deploy all agents ==="
kubectl apply -f ./k8s/services/triage/deployment.yaml
kubectl apply -f ./k8s/services/concepts/deployment.yaml
kubectl apply -f ./k8s/services/exercise/deployment.yaml
kubectl apply -f ./k8s/services/debug/deployment.yaml
kubectl apply -f ./k8s/services/progress/deployment.yaml

echo "=== Step 10: Wait for all agents ==="
kubectl rollout status deployment/triage          -n learnflow --timeout=120s
kubectl rollout status deployment/concepts-agent  -n learnflow --timeout=120s
kubectl rollout status deployment/exercise-agent  -n learnflow --timeout=120s
kubectl rollout status deployment/debug-agent     -n learnflow --timeout=120s
kubectl rollout status deployment/progress-agent  -n learnflow --timeout=120s

echo ""
echo "=== Done ==="
kubectl get pods -n learnflow
