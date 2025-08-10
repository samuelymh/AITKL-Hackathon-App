# Clinical AI Assistant Test Questions

This document contains a curated set of test questions to comprehensively evaluate the Clinical AI Assistant functionality across different medical scenarios and user types.

## 🩺 How to Test

1. **Login as a Doctor** in the application
2. **Navigate to a patient page** (e.g., `/doctor/patient/[digitalId]`)
3. **Click the blue brain icon** (Clinical AI Assistant) in the bottom-right corner
4. **Ask the questions below** and evaluate the responses

---

## 📋 Test Categories

### 1. **Patient Analysis & Assessment Questions**

#### Basic Patient Overview
```
Tell me about this patient
```

```
What are the key clinical concerns for this patient?
```

```
Provide a comprehensive analysis of this patient's medical history
```

#### Risk Assessment
```
What are the main risk factors I should be aware of for this patient?
```

```
Are there any red flags in this patient's medical history?
```

```
What is this patient's overall risk profile?
```

---

### 2. **Diagnosis & Differential Diagnosis Questions**

#### Symptom Analysis
```
The patient presents with chest pain and shortness of breath. What should I consider?
```

```
Patient complains of severe headache and visual disturbances. What are the differential diagnoses?
```

```
A 45-year-old patient has persistent cough for 3 weeks. What workup do you recommend?
```

#### Diagnostic Workup
```
What diagnostic tests would you recommend for this patient's current symptoms?
```

```
Based on this patient's history, what additional investigations should I order?
```

```
What lab work would be most appropriate given this patient's presentation?
```

---

### 3. **Treatment & Management Questions**

#### Medication Management
```
Are there any drug interactions I should be concerned about with this patient's current medications?
```

```
What medication adjustments would you recommend for this patient?
```

```
This patient is allergic to penicillin. What alternative antibiotics can I prescribe?
```

#### Treatment Planning
```
What would be the best treatment approach for this patient's diabetes management?
```

```
How should I adjust the treatment plan given this patient's recent lab results?
```

```
What lifestyle modifications would benefit this patient most?
```

---

### 4. **Safety & Risk Management Questions**

#### Drug Safety
```
This patient takes warfarin and has an upcoming surgery. What precautions should I take?
```

```
Are there any contraindications for prescribing NSAIDs to this patient?
```

```
What monitoring is required for this patient's current medication regimen?
```

#### Clinical Safety
```
What safety concerns should I monitor for with this patient?
```

```
Are there any early warning signs I should watch for in this patient?
```

```
What emergency protocols should be in place for this patient?
```

---

### 5. **Chronic Disease Management Questions**

#### Diabetes Management
```
How well is this patient's diabetes controlled based on their recent HbA1c?
```

```
What adjustments to diabetes management would you recommend?
```

#### Cardiovascular Health
```
Assess this patient's cardiovascular risk and management strategy
```

```
What cardiac monitoring does this patient need?
```

#### Respiratory Conditions
```
How should I manage this patient's COPD exacerbation?
```

```
What pulmonary function improvements can we target for this patient?
```

---

### 6. **Preventive Care Questions**

#### Screening Recommendations
```
What preventive screenings are due for this patient?
```

```
Based on this patient's age and risk factors, what cancer screenings do they need?
```

```
What vaccinations should this patient receive?
```

#### Health Maintenance
```
What health maintenance recommendations do you have for this patient?
```

```
How can we optimize this patient's preventive care plan?
```

---

### 7. **Complex Clinical Scenarios**

#### Multi-morbidity Management
```
This patient has diabetes, hypertension, and kidney disease. How should I coordinate their care?
```

```
What are the priorities in managing this patient's multiple chronic conditions?
```

#### Emergency Situations
```
Patient presents with severe abdominal pain and fever. What immediate actions should I take?
```

```
How should I triage this patient who presents with chest pain and elevated troponins?
```

#### Pediatric Scenarios (if applicable)
```
A 5-year-old presents with fever and rash. What should I consider?
```

```
What dosing adjustments are needed for pediatric patients with this condition?
```

---

### 8. **Evidence-Based Medicine Questions**

#### Clinical Guidelines
```
What are the current guidelines for managing this patient's condition?
```

```
What does the latest evidence say about treatment options for this diagnosis?
```

#### Best Practices
```
What are the best practices for monitoring this patient's condition?
```

```
How do current clinical trials inform treatment decisions for this patient?
```

---

### 9. **Patient Communication & Education**

#### Patient Counseling
```
How should I explain this diagnosis to the patient?
```

```
What key points should I discuss with the patient about their treatment plan?
```

```
How can I help this patient better understand their condition?
```

#### Shared Decision Making
```
What treatment options should I discuss with this patient?
```

```
How do I involve this patient in decisions about their care?
```

---

### 10. **Quality Improvement & Documentation**

#### Clinical Documentation
```
What key elements should I document for this patient encounter?
```

```
Are there any quality measures I should track for this patient?
```

#### Care Coordination
```
What specialists should I refer this patient to?
```

```
How should I coordinate care transitions for this patient?
```

---

## 🧪 Testing Scenarios by Patient Type

### High-Risk Patient Testing
Use these questions with patients who have:
- Multiple chronic conditions
- Recent hospitalizations
- Complex medication regimens
- Known allergies

### Acute Care Testing
Use these for patients presenting with:
- New symptoms
- Potential emergencies
- Urgent care needs

### Routine Care Testing
Use these for:
- Annual check-ups
- Preventive care visits
- Stable chronic disease management

---

## 📊 What to Look For in Responses

### ✅ Good AI Responses Should Include:
- **Specific patient context** referenced from their actual medical history
- **Evidence-based recommendations** with confidence levels
- **Safety alerts** when relevant
- **Clear clinical reasoning** behind suggestions
- **Actionable next steps** for patient care
- **Risk stratification** when appropriate

### ❌ Red Flags to Watch For:
- Generic responses not tailored to the specific patient
- Missing safety considerations
- Contradictory advice
- Recommendations that conflict with patient allergies/contraindications
- Vague or non-actionable suggestions

---

## 🎯 Advanced Testing Scenarios

### Edge Cases
```
This patient has a rare genetic condition. How does this affect their treatment?
```

```
Patient is pregnant and needs treatment for [condition]. What are safe options?
```

```
How do I manage this patient who is non-compliant with medications?
```

### Ethical Scenarios
```
Patient refuses recommended treatment. How should I proceed?
```

```
Family disagrees with patient's treatment preferences. How do I handle this?
```

### Resource Constraints
```
Patient cannot afford recommended medications. What alternatives exist?
```

```
Limited diagnostic resources available. How do I prioritize workup?
```

---

## 📝 Testing Checklist

- [ ] **Patient Context**: Does the AI reference specific patient data?
- [ ] **Clinical Insights**: Are safety alerts and recommendations relevant?
- [ ] **Formatting**: Is the response well-formatted and readable?
- [ ] **Modal Display**: Does the modal display properly without overflow?
- [ ] **Interaction**: Do collapsible sections work correctly?
- [ ] **Performance**: Are responses generated in reasonable time?
- [ ] **Accuracy**: Do recommendations align with clinical best practices?
- [ ] **Safety**: Are contraindications and allergies considered?

---

## 🚀 Quick Start Test Sequence

For a rapid functionality test, try these questions in order:

1. **"Tell me about this patient"** (Basic overview)
2. **"What are the key safety concerns?"** (Safety assessment)
3. **"Are there any drug interactions to worry about?"** (Medication safety)
4. **"What diagnostic tests should I consider?"** (Clinical reasoning)
5. **"How should I adjust their treatment plan?"** (Treatment optimization)

This sequence tests the core functionality and will give you a good sense of the AI's capabilities and response quality.

---

*Use this guide to thoroughly test the Clinical AI Assistant and ensure it provides valuable, safe, and contextually appropriate clinical decision support.*
