pipeline {
  agent any

  environment {
    AWS_REGION = "ap-south-1"
    AWS_ACCOUNT_ID = "348071628290"
    ECR_REPOSITORY = "frontend"
    ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    IMAGE_URI = "${ECR_REGISTRY}/${ECR_REPOSITORY}"
    EKS_CLUSTER = "self-healing-cluster"
    K8S_NAMESPACE = "prod"
  }

  stages {
    stage("Checkout") {
      steps {
        checkout scm
      }
    }

    stage("Resolve Metadata") {
      steps {
        script {
          env.IMAGE_TAG = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          echo "Resolved image tag: ${env.IMAGE_TAG}"
        }
      }
    }

    stage("AWS + ECR Login") {
      steps {
        sh '''
          set -euo pipefail
          PASSWORD="$(aws ecr get-login-password --region "$AWS_REGION")"

          if command -v buildah >/dev/null 2>&1; then
            echo "$PASSWORD" | buildah login --username AWS --password-stdin "$ECR_REGISTRY"
          fi

          if command -v docker >/dev/null 2>&1; then
            echo "$PASSWORD" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
          fi
        '''
      }
    }

    stage("Build & Push") {
      steps {
        sh '''
          set -euo pipefail
          FULL_IMAGE="${IMAGE_URI}:${IMAGE_TAG}"

          if command -v buildah >/dev/null 2>&1; then
            echo "Using Buildah for image build and push"
            buildah bud --format docker -f Dockerfile -t "$FULL_IMAGE" .
            buildah push "$FULL_IMAGE" "docker://$FULL_IMAGE"
          elif command -v docker >/dev/null 2>&1; then
            echo "Using Docker for image build and push"
            docker build -t "$FULL_IMAGE" .
            docker push "$FULL_IMAGE"
          else
            echo "Neither buildah nor docker is available"
            exit 1
          fi
        '''
      }
    }

    stage("Configure kubectl") {
      steps {
        sh '''
          set -euo pipefail
          aws eks update-kubeconfig --region "$AWS_REGION" --name "$EKS_CLUSTER"
        '''
      }
    }

    stage("Deploy Frontend") {
      steps {
        sh '''
          set -euo pipefail
          sed "s|\\${IMAGE_TAG}|${IMAGE_TAG}|g" k8s/frontend/deployment.yml | kubectl apply -f -
          kubectl apply -f k8s/frontend/service.yml
        '''
      }
    }

    stage("Apply Ingress If Changed") {
      steps {
        sh '''
          set -euo pipefail
          INGRESS_FILE="k8s/frontend/ingress.yml"
          SHOULD_APPLY="false"

          if [ -z "${GIT_PREVIOUS_SUCCESSFUL_COMMIT:-}" ]; then
            SHOULD_APPLY="true"
          elif git cat-file -e "${GIT_PREVIOUS_SUCCESSFUL_COMMIT}^{commit}" 2>/dev/null; then
            if git diff --name-only "${GIT_PREVIOUS_SUCCESSFUL_COMMIT}" HEAD | grep -Fxq "$INGRESS_FILE"; then
              SHOULD_APPLY="true"
            fi
          else
            SHOULD_APPLY="true"
          fi

          if [ "$SHOULD_APPLY" = "true" ]; then
            kubectl apply -f "$INGRESS_FILE"
          else
            echo "Ingress unchanged; skipping apply."
          fi
        '''
      }
    }

    stage("Rollout Wait") {
      steps {
        sh '''
          set -euo pipefail
          kubectl rollout status deployment/frontend -n "$K8S_NAMESPACE"
        '''
      }
    }
  }
}
