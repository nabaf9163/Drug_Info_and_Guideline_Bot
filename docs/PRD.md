# Product Requirements Document (PRD)
## MedInfo Bot

**Version:** 1.1  
**Date:** February 8, 2026  
**Status:** Approved

---

## 1. Executive Summary

The **MedInfo Bot** is an AI-powered chatbot designed for healthcare professionals (doctors, pharmacists, nurses) to quickly access drug information, clinical guidelines, drug interaction checks, and dosage recommendations via **Telegram** and **WhatsApp**. Users can select their country/region for localized guidelines.

### Vision Statement
> Empower healthcare professionals with instant, reliable, AI-driven drug and clinical information at their fingertips—reducing medication errors and improving patient outcomes.

---

## 2. Problem Statement

Healthcare professionals face daily challenges:
- **Time constraints** when looking up drug information during patient care
- **Drug interaction risks** when prescribing multiple medications
- **Guideline fragmentation** across different sources
- **Limited access** to reference materials in clinical settings
- **Need for quick dosage calculations** for special populations (renal, pediatric, geriatric)

---

## 3. Target Users & Personas

### 3.1 Primary Personas

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| **Dr. Amina (Physician)** | Busy hospital doctor, sees 30+ patients/day | Quick drug interactions, dosage for special cases, guideline summaries |
| **Pharm. Tunde (Pharmacist)** | Community pharmacist, dispenses 100+ prescriptions/day | Drug interactions, patient counseling points, alternative suggestions |
| **Nurse Blessing (Nurse)** | Ward nurse, administers medications | IV compatibility, administration guidelines, reconstitution instructions |

### 3.2 User Environment
- Mobile-first (smartphones during rounds/shifts)
- Intermittent connectivity (hospital areas with poor signal)
- Time-pressured interactions (need answers in seconds)
- Professional context (requires accurate, evidence-based information)

---

## 4. Functional Requirements

### 4.1 Core Features

#### F1: Drug Information Lookup
| ID | Requirement | Priority |
|----|-------------|----------|
| F1.1 | Query drug by generic or brand name | P0 |
| F1.2 | Return indications, contraindications, side effects | P0 |
| F1.3 | Provide dosage forms and strengths available | P0 |
| F1.4 | Show pharmacokinetics summary | P1 |
| F1.5 | Display storage requirements | P1 |

#### F2: Drug-Drug Interaction Checker
| ID | Requirement | Priority |
|----|-------------|----------|
| F2.1 | Check interaction between 2+ drugs | P0 |
| F2.2 | Classify severity (major, moderate, minor) | P0 |
| F2.3 | Explain mechanism of interaction | P0 |
| F2.4 | Suggest alternatives when major interaction detected | P1 |
| F2.5 | Check interaction with food/alcohol | P1 |

#### F3: Clinical Guidelines
| ID | Requirement | Priority |
|----|-------------|----------|
| F3.1 | Query treatment guidelines by condition | P0 |
| F3.2 | Return evidence-based recommendations | P0 |
| F3.3 | Specify guideline source (WHO, CDC, local) | P0 |
| F3.4 | Provide first-line vs second-line options | P1 |
| F3.5 | Include pediatric/geriatric specific guidelines | P1 |

#### F4: Dosage Recommendations
| ID | Requirement | Priority |
|----|-------------|----------|
| F4.1 | Provide standard adult dosages | P0 |
| F4.2 | Calculate pediatric doses by weight/age | P0 |
| F4.3 | Adjust doses for renal impairment (by CrCl/eGFR) | P0 |
| F4.4 | Adjust doses for hepatic impairment | P1 |
| F4.5 | Show maximum daily doses | P0 |

### 4.2 Platform Features

#### F5: Telegram Integration
| ID | Requirement | Priority |
|----|-------------|----------|
| F5.1 | Bot registration and /start command | P0 |
| F5.2 | Natural language query processing | P0 |
| F5.3 | Inline keyboard for common actions | P1 |
| F5.4 | Group chat support (for team consultations) | P2 |

#### F6: WhatsApp Integration
| ID | Requirement | Priority |
|----|-------------|----------|
| F6.1 | WhatsApp Business API integration | P0 |
| F6.2 | Natural language query processing | P0 |
| F6.3 | Quick reply buttons | P1 |
| F6.4 | Message templates for common queries | P1 |

### 4.3 Supporting Features

#### F7: Conversation Management
| ID | Requirement | Priority |
|----|-------------|----------|
| F7.1 | Maintain context within a session | P0 |
| F7.2 | Handle follow-up questions | P0 |
| F7.3 | Provide /help and usage instructions | P0 |
| F7.4 | Allow /cancel to reset conversation | P1 |

#### F8: User Management (Future)
| ID | Requirement | Priority |
|----|-------------|----------|
| F8.1 | Optional user registration | P2 |
| F8.2 | Query history for registered users | P2 |
| F8.3 | Favorite drugs list | P2 |

---

## 5. Non-Functional Requirements

### 5.1 Performance
| Requirement | Target |
|-------------|--------|
| Response time (simple query) | < 3 seconds |
| Response time (complex interaction check) | < 5 seconds |
| Concurrent users supported | 500+ |
| Uptime | 99.5% |

### 5.2 Security & Compliance
| Requirement | Description |
|-------------|-------------|
| Data encryption | TLS 1.3 for all communications |
| No PHI storage | Bot does NOT store patient health information |
| Query logging | Anonymized usage logs for analytics |
| Rate limiting | Prevent abuse (max 30 queries/user/minute) |

### 5.3 Reliability
| Requirement | Description |
|-------------|-------------|
| Graceful degradation | Fallback responses when LLM unavailable |
| Error handling | User-friendly error messages |
| Retry logic | Automatic retry for transient failures |

### 5.4 Scalability
| Requirement | Description |
|-------------|-------------|
| Horizontal scaling | Stateless design for easy scaling |
| Cloud-native | Deploy on serverless/container platforms |

---

## 6. Compliance & Disclaimers

> [!CAUTION]
> This bot provides **informational support only**. All clinical decisions must be verified by qualified healthcare professionals. The bot does not replace professional medical judgment.

### 6.1 Required Disclaimers
- "This information is for healthcare professionals only"
- "Always verify critical drug information with official sources"
- "Not intended for patient self-medication"
- Clear source attribution for guidelines

### 6.2 Medical Information Standards
- Use Evidence-Based Medicine (EBM) principles
- Reference reputable sources (WHO, FDA, BNF, local formularies)
- Regular content review and updates
- Clear versioning of guideline information

---

## 7. Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| Daily Active Users (DAU) | 200+ |
| Queries per day | 1,000+ |
| User satisfaction rating | > 4.5/5 |
| Average response time | < 3 seconds |
| Query resolution rate | > 90% |

---

## 8. Out of Scope (v1.0)

- Patient-facing features
- Electronic prescribing
- Integration with EHR/EMR systems
- Voice input processing
- Image/prescription scanning
- Offline mode

---

## 9. Open Questions

1. **Licensing**: Which drug database sources will be used (open-source vs licensed)?
2. **Localization**: Should the bot support multiple languages initially?
3. **Verification**: Should there be a healthcare professional verification process?
4. **Monetization**: Free tier vs premium features?
5. **Regional Focus**: Which country's formulary/guidelines take priority?

---

## 10. Appendices

### A. Glossary
| Term | Definition |
|------|------------|
| CrCl | Creatinine Clearance |
| eGFR | Estimated Glomerular Filtration Rate |
| BNF | British National Formulary |
| EBM | Evidence-Based Medicine |
| PHI | Protected Health Information |

### B. References
- WHO Essential Medicines List
- FDA Drug Database
- British National Formulary (BNF)
- Clinical Pharmacology textbooks
