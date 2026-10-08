# Security Policy: GovAsset 360

## 🛡️ Architecture & Security Posture
GovAsset 360 is engineered following modern **Zero-Trust AppSec & DevSecOps principles** to ensure public municipal infrastructure data remains integral, available, and confidential.

### Core Security Controls
1. **Granular Role-Based Access Control (RBAC):**
   - 5-Tier authorization matrix: `Super Admin`, `Government Officer`, `Field Engineer`, `Contractor`, `Public Citizen (Viewer)`.
   - Super Admin privileges strictly locked to verified identity: `emailsujallohar17@gmail.com`.
   - Dynamic elevation requests reviewed via authorized cryptographic workflow.

2. **Immutable & Tamper-Evident Auditing:**
   - Critical operations (budget disbursements, asset modifications, role approvals) utilize append-only SHA-256 hash chaining to detect unauthorized database tampering.

3. **Client-Side & Network Defensive Controls:**
   - PWA caching with strict cache invalidation.
   - Strict email structure verification with RFC 5322 compliance and rejection of numeric/disposable domains.
   - Safe-area inset mobile responsive constraints preventing UI injection or element overlap.

4. **DevSecOps Supply Chain Assurance:**
   - Automated GitLeaks secret scanning on all pull requests and pushes.
   - Continuous dependency vulnerability monitoring via Software Composition Analysis (SCA).
   - Strict TypeScript compiler type validation (`tsc -b --noEmit`) and multi-threaded static linter verification (`oxlint`).

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within the GovAsset 360 ecosystem, please report it privately:

- **Security Lead:** Sujal Lohar (System Architect)
- **Email:** `emailsujallohar17@gmail.com`
- **Response SLA:** Within 24 hours of disclosure

Please include:
- Description of the vulnerability and attack vector.
- Step-by-step reproduction steps or Proof of Concept (PoC).
- Potential impact evaluation.

We practice responsible vulnerability disclosure and will acknowledge receipt and patch status promptly.
