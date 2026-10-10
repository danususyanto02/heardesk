pipeline {
    agent any

    options {
        skipDefaultCheckout()
        disableConcurrentBuilds()
        timestamps()
    }

    stages {
        stage('Prepare Node.js') {
            steps {
                script {
                    def nodeHome = tool name: 'NodeJS-22',
                        type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'

                    env.PATH = "${nodeHome}/bin:${env.PATH}"
                    echo "Using Jenkins NodeJS tool: ${nodeHome}"
                }

                sh '''
                    set -eu
                    command -v node
                    command -v npm
                '''
            }
        }

        stage('Check Environment') {
            steps {
                sh '''
                    set -eu
                    git --version
                    java -version
                    node --version
                    npm --version
                    node -e '
                        const [major, minor] = process.versions.node.split(".").map(Number);
                        const supported = (major === 22 && minor >= 18) || major > 24 || (major === 24 && minor >= 11);
                        if (!supported) {
                            console.error("HearDesk requires Node.js 22.18+ or 24.11+.");
                            process.exit(1);
                        }
                    '
                '''
            }
        }

        stage('Checkout GitHub') {
            steps {
                git branch: 'master',
                    credentialsId: 'github-heardesk',
                    url: 'https://github.com/danususyanto02/heardesk.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci --include=dev'
            }
        }

        stage('Generate Prisma Client') {
            environment {
                DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/ureport'
            }
            steps {
                sh 'npm run db:generate'
            }
        }

        stage('Tests and Coverage') {
            steps {
                sh '''
                    set -eu
                    rm -rf coverage
                    npm run test:coverage
                    test -s coverage/lcov.info
                '''
            }
            post {
                success {
                    archiveArtifacts artifacts: 'coverage/lcov.info', fingerprint: true
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('SonarQube-WSL') {
                        withEnv(["SCANNER_HOME=${scannerHome}"]) {
                            sh '''
                                set -eu
                                test -s sonar-project.properties
                                test -s coverage/lcov.info
                                "$SCANNER_HOME/bin/sonar-scanner" \\
                                  -Dsonar.sources=src,scripts,public \\
                                  -Dsonar.tests=tests \\
                                  '-Dsonar.exclusions=src/generated/**' \\
                                  -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \\
                                  -Dsonar.qualitygate.wait=true \\
                                  -Dsonar.qualitygate.timeout=300
                            '''
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Tests, coverage import, and SonarQube Quality Gate passed.'
        }

        failure {
            echo 'Pipeline failed. Check test results, scanner logs, and Quality Gate conditions.'
        }
    }
}
