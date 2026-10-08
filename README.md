# GovAsset 360 Enterprise

*Autonomous Lifecycle Management, DevSecOps Security Gateway & Cryptographic Ledger for Critical Public Infrastructure.*

[![DevSecOps Security Pipeline](https://github.com/sujalpanchal/govasset-360/actions/workflows/devsecops.yml/badge.svg)](https://github.com/sujalpanchal/govasset-360/actions/workflows/devsecops.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker Hardened](https://img.shields.io/badge/Docker-Multi--Stage%20Non--Root-2496ED?logo=docker&logoColor=white)](Dockerfile)
[![Security Standard](https://img.shields.io/badge/AppSec-OWASP%20Top%2010%20Hardened-green?logo=shield)](SECURITY.md)

🌐 **Live Production Deployment:** [https://govasset-360.web.app](https://govasset-360.web.app)  
*(Alternative Mirror: [https://govasset-360.firebaseapp.com](https://govasset-360.firebaseapp.com))*

---

## 🏛️ Project Overview
GovAsset 360 is a full-stack, enterprise-grade public infrastructure lifecycle management and DevSecOps platform. Built specifically to showcase modern **Full-Stack (MERN) Engineering**, **Cybersecurity (AppSec/SecOps)**, and **DevOps / Cloud Architecture**, GovAsset 360 combines high-availability microservices, cryptographic tamper-evident audit chaining, automated CI/CD security quality gates, and active defense honeypots—all powered on a $0 free-tier cloud architecture.

---

## 🛡️ Core Architectural Pillars

### 1. DevSecOps CI/CD Automation (`.github/workflows/devsecops.yml`)
- **Automated Security Gates:** Executes GitLeaks secret detection, Software Supply Chain (SCA) dependency auditing (`npm audit`), and strict static type checking on every pull request and push to `main`.
- **High-Performance Static Analysis:** Integrated Oxlint linter executing in milliseconds.
- **Automated Container Verification:** Verifies multi-stage Docker builds and executes live HTTP health checks against running ephemeral containers in the CI pipeline.

### 2. Multi-Stage Dockerization & Container Hardening (`Dockerfile`, `Dockerfile.api`, `docker-compose.yml`)
- **Ultra-Lean Alpine Footprint:** Multi-stage build process producing minimal ~35MB production images.
- **Non-Root Execution:** Adheres to defense-in-depth security by running processes under unprivileged users (`nginx` UID 101, `node` UID 1000).
- **OWASP Hardened Nginx:** Customized `nginx.conf` stripping server version banners, enforcing HSTS, X-Frame-Options (`SAMEORIGIN`), X-Content-Type-Options (`nosniff`), and Content Security Policies.
- **Docker Compose Orchestration:** Single-command local orchestration spinning up both the frontend client and the backend security gateway on an isolated bridge network.

### 3. Cryptographic Tamper-Evident Audit Ledger (SHA-256 WORM)
- **Mathematical Hash Chaining:** Every administrative mutation, role change, and asset creation is cryptographically anchored to its previous entry via Web Crypto API SHA-256 hashing.
- **Write-Once-Read-Many (WORM):** Firestore security rules strictly prohibit updates or deletions (`allow update, delete: if false;`), ensuring immutability.
- **Live Verifier & Attack Simulation:** Interactive UI modal allowing auditors to verify 100% chain integrity in milliseconds, or simulate an adversarial database modification to witness immediate cryptographic verification failure and severed chain detection.

### 4. Node.js / Express Security Gateway & Microservice API (`server/`)
- **AppSec Hardened Gateway:** Protected with Helmet HTTP headers, strict CORS domain whitelisting, and two-tier sliding-window rate limiting.
- **Strict Schema Enforcement:** Runtime schema validation powered by Zod (`server/routes/assets.ts`) preventing injection attacks and malformed input.
- **Cloud-Native Kubernetes Probes:** Standardized `/healthz` (liveness), `/readyz` (readiness), and Prometheus OpenTelemetry `/metrics` endpoints.
- **Active Defense Honeypot Traps:** Decoy routes (`/.env`, `/wp-login.php`, `/api/admin/debug-dump`, `/api/v1/auth/internal-keys`) that automatically detect, trap, and log automated vulnerability scanners into the SecOps telemetry feed.

---

## 🏗️ System Architecture

```text
[ Browser / Client ] ───────────── HTTPS ────────────> [ Hardened Nginx 8080 ]
        │                                                     │
        ▼ (AppSec Gateway / Port 5001)                        ▼ (Static PWA)
[ Express Security Gateway ]                          [ React 19 + TypeScript ]
  ├── Helmet & CORS Defense                             ├── Leaflet GIS Mapping
  ├── Sliding Window Rate Limiting                      ├── Gemini 1.5 Flash AI
  ├── Zod Runtime Schema Validation                     └── SHA-256 Audit Ledger UI
  ├── Prometheus Metrics (/metrics)
  ├── K8s Health Probes (/healthz, /readyz)
  └── Active Defense Honeypots (Decoys)
        │
        ▼
[ Cloud Firestore & Auth ] (WORM Security Rules)
```

---

## 💻 Quick Start & Local Development

### Prerequisites
- Node.js 20+ (LTS)
- Docker & Docker Compose (Optional for containerized run)

### Running Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Frontend & Backend Development Servers:**
   - In Terminal 1 (Frontend Client):
     ```bash
     npm run dev
     ```
     *Access the web app at `http://localhost:5173`*

   - In Terminal 2 (Security Gateway Microservice):
     ```bash
     npm run server:dev
     ```
     *Access the API gateway at `http://localhost:5001`*

3. **Verify DevSecOps Quality Gate Locally:**
   ```bash
   npm run ci:verify
   ```

---

## 🐳 Docker Deployment

To spin up the complete full-stack architecture inside hardened containers:

```bash
# Build and launch both frontend (8080) and API gateway (5001) in background
docker compose up -d

# Check running container health status
docker compose ps

# View live gateway and web logs
docker compose logs -f

# Teardown containers
docker compose down
```

---

## 🛰️ Microservice API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/healthz` | Kubernetes Liveness Probe & System Resource Metrics |
| `GET` | `/readyz` | Kubernetes Readiness Probe |
| `GET` | `/metrics` | Prometheus Metrics (Request counter, uptime, memory gauge) |
| `GET` | `/api/secops/telemetry` | SecOps Live Telemetry & Threat Interception Feed |
| `POST` | `/api/secops/simulate-probe` | Interactive Threat Simulator (SQLi, PrivEsc, XSS) |
| `POST` | `/api/assets/bulk-validate` | High-Throughput Zod Schema Validator for Assets |
| `POST` | `/api/audit/verify` | Server-Side Cryptographic SHA-256 Ledger Verifier |
| `ALL` | `/.env` | 🚨 Active Defense Honeypot Decoy Trap |
| `ALL` | `/wp-login.php` | 🚨 CMS Scanner Honeypot Trap |
| `ALL` | `/api/admin/debug-dump` | 🚨 Privilege Reconnaissance Honeypot Trap |

---

## 🔒 Security Policy
For vulnerability disclosure and security incident procedures, refer to [SECURITY.md](SECURITY.md).

---
*GovAsset 360 — Built with enterprise rigor for public transparency, resilience, and security.*
