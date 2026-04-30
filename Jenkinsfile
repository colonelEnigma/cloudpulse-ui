pipeline {
  agent none

  options {
    disableConcurrentBuilds()
  }

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
      agent {
        kubernetes {
          defaultContainer "devops"
          yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  containers:
    - name: devops
      image: 348071628290.dkr.ecr.ap-south-1.amazonaws.com/jenkins-agent-devops:latest
      command:
        - cat
      tty: true
'''
        }
      }
      steps {
        checkout scm
      }
    }

    stage("Resolve Metadata") {
      agent {
        kubernetes {
          defaultContainer "devops"
          yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  containers:
    - name: devops
      image: 348071628290.dkr.ecr.ap-south-1.amazonaws.com/jenkins-agent-devops:latest
      command:
        - cat
      tty: true
'''
        }
      }
      steps {
        script {
          env.IMAGE_TAG = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          echo "Resolved image tag: ${env.IMAGE_TAG}"
        }
      }
    }

    stage("Toolchain Preflight") {
      agent {
        kubernetes {
          defaultContainer "devops"
          yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  containers:
    - name: devops
      image: 348071628290.dkr.ecr.ap-south-1.amazonaws.com/jenkins-agent-devops:latest
      command:
        - cat
      tty: true
'''
        }
      }
      steps {
        sh '''
          #!/usr/bin/env bash
          set -euo pipefail

          missing=0

          if ! command -v aws >/dev/null 2>&1; then
            echo "ERROR: aws CLI not found on this Jenkins agent."
            missing=1
          fi

          if ! command -v kubectl >/dev/null 2>&1; then
            echo "ERROR: kubectl not found on this Jenkins agent."
            missing=1
          fi

          if [ "$missing" -ne 0 ]; then
            echo "Install required tools on the agent (aws and kubectl),"
            echo "or run this job on an agent image that already has them."
            exit 1
          fi

          echo "Toolchain preflight passed."
          aws --version
          kubectl version --client --output=yaml | head -n 5
        '''
      }
    }

    stage("AWS + ECR Login") {
      agent {
        kubernetes {
          defaultContainer "devops"
          yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  containers:
    - name: devops
      image: 348071628290.dkr.ecr.ap-south-1.amazonaws.com/jenkins-agent-devops:latest
      command:
        - cat
      tty: true
'''
        }
      }
      steps {
        sh '''
          #!/usr/bin/env bash
          set -euo pipefail

          aws ecr get-login-password --region "$AWS_REGION" >/dev/null
          echo "ECR token retrieval successful."
        '''
      }
    }

    stage("Build & Push") {
      agent {
        kubernetes {
          defaultContainer "devops"
          yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  volumes:
    - name: shared-auth
      emptyDir: {}
  containers:
    - name: devops
      image: 348071628290.dkr.ecr.ap-south-1.amazonaws.com/jenkins-agent-devops:latest
      command:
        - cat
      tty: true
      volumeMounts:
        - name: shared-auth
          mountPath: /shared-auth
    - name: buildah
      image: quay.io/buildah/stable:latest
      command:
        - cat
      tty: true
      securityContext:
        privileged: true
      volumeMounts:
        - name: shared-auth
          mountPath: /shared-auth
'''
        }
      }
      steps {
        container("devops") {
          sh '''
            #!/usr/bin/env bash
            set -euo pipefail
            mkdir -p /shared-auth
            aws ecr get-login-password --region "$AWS_REGION" > /shared-auth/ecr-password
          '''
        }
        container("buildah") {
          sh '''
            #!/usr/bin/env bash
            set -euo pipefail

            FULL_IMAGE="${IMAGE_URI}:${IMAGE_TAG}"
            export REGISTRY_AUTH_FILE=/tmp/auth.json

            cat /shared-auth/ecr-password | buildah login --username AWS --password-stdin "$ECR_REGISTRY"
            buildah bud --format docker -f Dockerfile -t "$FULL_IMAGE" .
            buildah push "$FULL_IMAGE" "docker://$FULL_IMAGE"
          '''
        }
      }
    }

    stage("Configure kubectl") {
      agent {
        kubernetes {
          defaultContainer "devops"
          yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  containers:
    - name: devops
      image: 348071628290.dkr.ecr.ap-south-1.amazonaws.com/jenkins-agent-devops:latest
      command:
        - cat
      tty: true
'''
        }
      }
      steps {
        sh '''
          #!/usr/bin/env bash
          set -euo pipefail
          aws eks update-kubeconfig --region "$AWS_REGION" --name "$EKS_CLUSTER"
        '''
      }
    }

    stage("Deploy Frontend") {
      agent {
        kubernetes {
          defaultContainer "devops"
          yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  containers:
    - name: devops
      image: 348071628290.dkr.ecr.ap-south-1.amazonaws.com/jenkins-agent-devops:latest
      command:
        - cat
      tty: true
'''
        }
      }
      steps {
        sh '''
          #!/usr/bin/env bash
          set -euo pipefail
          sed "s|\\${IMAGE_TAG}|${IMAGE_TAG}|g" k8s/frontend/deployment.yml | kubectl apply -f -
          kubectl apply -f k8s/frontend/service.yml
        '''
      }
    }

    stage("Apply Ingress If Changed") {
      agent {
        kubernetes {
          defaultContainer "devops"
          yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  containers:
    - name: devops
      image: 348071628290.dkr.ecr.ap-south-1.amazonaws.com/jenkins-agent-devops:latest
      command:
        - cat
      tty: true
'''
        }
      }
      steps {
        sh '''
          #!/usr/bin/env bash
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
      agent {
        kubernetes {
          defaultContainer "devops"
          yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-deployer
  containers:
    - name: devops
      image: 348071628290.dkr.ecr.ap-south-1.amazonaws.com/jenkins-agent-devops:latest
      command:
        - cat
      tty: true
'''
        }
      }
      steps {
        sh '''
          #!/usr/bin/env bash
          set -euo pipefail
          kubectl rollout status deployment/frontend -n "$K8S_NAMESPACE"
        '''
      }
    }
  }
}
