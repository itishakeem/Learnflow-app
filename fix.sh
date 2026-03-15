#!/bin/bash
set -e

echo "=== Step 1: Point Docker at Minikube ==="
eval $(minikube docker-env)

echo "=== Step 2: Rebuild progress-agent ==="
docker build -t progress-agent:latest ./services/progress

echo "=== Step 3: Reapply Dapr component ==="
kubectl apply -f ./k8s/dapr/kafka-pubsub.yaml

echo "=== Step 4: Recreate secrets ==="
kubectl create secret generic gemini-secret \
  --from-literal=api-key=AIzaSyBtpP4EKfpw0Is4gzHltcl_eb0aE4n_0fo \
  -n learnflow --dry-run=client -o yaml | kubectl apply -f -

kubectl delete secret postgres-secret -n learnflow --ignore-not-found
kubectl create secret generic postgres-secret \
  --from-literal=url=postgresql://neondb_owner:npg_LWFhinp80tRI@ep-gentle-rice-a159dao6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require \
  -n learnflow

echo "=== Step 5: Replace Bitnami Kafka with apache/kafka ==="
helm uninstall kafka -n learnflow --ignore-not-found 2>/dev/null || true
kubectl delete statefulset kafka -n learnflow --ignore-not-found 2>/dev/null || true
kubectl delete svc kafka kafka-controller-headless -n learnflow --ignore-not-found 2>/dev/null || true
sleep 5
kubectl apply -f ./k8s/kafka/deployment.yaml
echo "Waiting for Kafka (apache/kafka:3.7.0) to be ready..."
kubectl rollout status statefulset/kafka -n learnflow --timeout=180s

echo "=== Step 6: Restart all agents ==="
kubectl rollout restart deployment/concepts-agent deployment/exercise-agent deployment/debug-agent deployment/triage deployment/progress-agent -n learnflow

echo "=== Step 7: Waiting for rollout ==="
kubectl rollout status deployment/concepts-agent -n learnflow --timeout=120s
kubectl rollout status deployment/exercise-agent -n learnflow --timeout=120s
kubectl rollout status deployment/debug-agent -n learnflow --timeout=120s
kubectl rollout status deployment/progress-agent -n learnflow --timeout=120s

echo "=== Done — final pod status ==="
kubectl get pods -n learnflow
