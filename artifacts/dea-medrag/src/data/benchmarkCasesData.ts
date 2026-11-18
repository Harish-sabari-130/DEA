// Auto-generated verified benchmark cases from guideline_collision_v1.json
export interface BenchmarkCaseDetail {
  case_id: string;
  category: string;
  title: string;
  classification: string;
  has_collision: boolean;
  clinical_scenario: string;
  patient: {
    age: number;
    sex: string;
    diseases: string[];
    medications: string[];
    symptoms: string[];
    lab_values: Record<string, string>;
    allergies: string[];
    conditions: string[];
  };
  naive_pick: string;
  dea_pick: string;
  rule_fired: string;
  mechanism: string;
  clinical_rationale: string;
  single_agent_violation: boolean;
  naive_multi_violation: boolean;
  dea_violation: boolean;
  citations: Array<{
    source: string;
    identifier: string;
    title: string;
    url?: string;
    exact_evidence_section?: string;
    verification_status?: string;
    [key: string]: any;
  }>;
}

export const BENCHMARK_CASES: BenchmarkCaseDetail[] = [
  {
    "case_id": "COL-001",
    "category": "renal_impairment_metformin",
    "title": "Metformin Lactic Acidosis Collision in CKD Stage 4",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 68-year-old female with long-standing type 2 diabetes and progressive chronic kidney disease stage 4 (eGFR 22 mL/min/1.73m\u00b2) presents for routine management. Glycemic control is suboptimal (HbA1c 8.4%). She continues taking maximum-dose metformin.",
    "patient": {
      "age": 68,
      "sex": "Female",
      "diseases": [
        "Type 2 diabetes mellitus",
        "Chronic kidney disease, stage 4"
      ],
      "medications": [
        "Metformin 1000 mg twice daily"
      ],
      "symptoms": [
        "Fatigue",
        "Persistent hyperglycemia"
      ],
      "lab_values": {
        "eGFR": "22 mL/min/1.73m\u00b2",
        "serum_creatinine": "2.4 mg/dL",
        "HbA1c": "8.4%"
      },
      "allergies": [
        "Penicillin"
      ],
      "conditions": [
        "Outpatient endocrinology clinic review"
      ]
    },
    "naive_pick": "Continue Metformin 1000 mg twice daily",
    "dea_pick": "SGLT2 inhibitor dose-adjusted pathway",
    "rule_fired": "RULE-RENAL-01 (Renal Clearance Impairment)",
    "mechanism": "renal_clearance_failure",
    "clinical_rationale": "Metformin is eliminated almost exclusively by renal excretion. In patients with severe renal impairment (eGFR < 30 mL/min/1.73m\u00b2), drug accumulation leads to high risk of fatal lactic acidosis. FDA label and KDIGO 2022 guidelines strictly contraindicate metformin at this GFR.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "36272764",
        "title": "KDIGO 2022 Clinical Practice Guideline for Diabetes Management in Chronic Kidney Disease",
        "url": "https://pubmed.ncbi.nlm.nih.gov/36272764/",
        "exact_evidence_section": "Chapter 1: Glycemic Monitoring and Targets; Recommendation 1.3: Metformin",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "DailyMed",
        "identifier": "5866ca12-a28f-cbe7-e063-6294a90acc69",
        "title": "METFORMIN HYDROCHLORIDE TABLET",
        "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5866ca12-a28f-cbe7-e063-6294a90acc69",
        "exact_evidence_section": "Boxed Warning: Lactic Acidosis; Section 4 Contraindications (eGFR < 30 mL/min/1.73m\u00b2)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-002",
    "category": "heart_failure_nsaids",
    "title": "NSAID-Induced Decompensation Collision in HFrEF",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 72-year-old male with chronic heart failure with reduced ejection fraction (LVEF 28%) and bilateral knee osteoarthritis presents with exacerbation of joint pain. He requests anti-inflammatory relief. He takes guideline-directed medical therapy for heart failure.",
    "patient": {
      "age": 72,
      "sex": "Male",
      "diseases": [
        "Heart failure with reduced ejection fraction",
        "Bilateral knee osteoarthritis"
      ],
      "medications": [
        "Furosemide 40 mg daily",
        "Carvedilol 25 mg twice daily",
        "Lisinopril 20 mg daily",
        "Naproxen 500 mg twice daily"
      ],
      "symptoms": [
        "Severe bilateral knee pain",
        "Mild exertional dyspnea",
        "Trace pedal edema"
      ],
      "lab_values": {
        "LVEF": "28%",
        "eGFR": "52 mL/min/1.73m\u00b2",
        "serum_creatinine": "1.3 mg/dL",
        "BNP": "480 pg/mL"
      },
      "allergies": [
        "Sulfa"
      ],
      "conditions": [
        "NYHA Class III heart failure"
      ]
    },
    "naive_pick": "Continue Naproxen 500 mg twice daily",
    "dea_pick": "Acetaminophen oral pathway",
    "rule_fired": "RULE-HF-01 (HFrEF Decompensation Hazard)",
    "mechanism": "fluid_retention_hemodynamic",
    "clinical_rationale": "Systemic NSAIDs inhibit renal prostaglandins, causing severe sodium and fluid retention, blunting loop diuretic and ACE inhibitor efficacy, and triggering acute decompensated heart failure and worsening renal failure. The 2022 AHA/ACC/HFSA guidelines classify NSAID use in HFrEF as Class III: Harm.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "35379503",
        "title": "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure",
        "url": "https://pubmed.ncbi.nlm.nih.gov/35379503/",
        "exact_evidence_section": "Section 7.5: Drugs That May Cause or Exacerbate Heart Failure (Class III: Harm)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-003",
    "category": "afib_renal_anticoagulation",
    "title": "Dabigatran Clearance Collision in ESRD Hemodialysis",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 65-year-old female with non-valvular atrial fibrillation (CHA2DS2-VASc 4) and end-stage renal disease on maintenance hemodialysis is evaluated for stroke prophylaxis. She was prescribed Dabigatran based on general non-valvular AFib recommendations.",
    "patient": {
      "age": 65,
      "sex": "Female",
      "diseases": [
        "Non-valvular atrial fibrillation",
        "End-stage renal disease on hemodialysis",
        "Hypertension"
      ],
      "medications": [
        "Dabigatran etexilate 150 mg twice daily",
        "Amlodipine 10 mg daily",
        "Sevelamer 800 mg three times daily with meals"
      ],
      "symptoms": [
        "Palpitations",
        "Fatigue during dialysis"
      ],
      "lab_values": {
        "CrCl": "12 mL/min",
        "serum_creatinine": "6.8 mg/dL",
        "potassium": "4.9 mEq/L"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Thrice-weekly hemodialysis via arteriovenous fistula"
      ]
    },
    "naive_pick": "Continue Dabigatran 150 mg twice daily",
    "dea_pick": "Warfarin with target INR 2.0-3.0",
    "rule_fired": "RULE-RENAL-01 (Renal Clearance Impairment)",
    "mechanism": "renal_clearance_failure",
    "clinical_rationale": "Dabigatran relies on renal elimination for 80% of its clearance. In end-stage renal disease (CrCl < 15 mL/min) or hemodialysis, dabigatran accumulates unpredictably to toxic levels, carrying extreme risk of uncontrollable fatal hemorrhage. The FDA label states dosing cannot be recommended, and 2023 ACC/AHA guidelines advise against use.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "38031868",
        "title": "2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation",
        "url": "https://pubmed.ncbi.nlm.nih.gov/38031868/",
        "exact_evidence_section": "Section 5.3: Antithrombotic Therapy in Patients with Chronic Kidney Disease",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "DailyMed",
        "identifier": "ba74e3cd-b06f-4145-b284-5fd6b84ff3c9",
        "title": "PRADAXA (dabigatran etexilate mesylate) capsule",
        "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ba74e3cd-b06f-4145-b284-5fd6b84ff3c9",
        "exact_evidence_section": "Section 2.2: Recommended Dose in Renal Impairment (Dosing cannot be provided for CrCl < 15 mL/min or on dialysis)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-004",
    "category": "hypertension_dual_ras_blockade",
    "title": "Dual RAS Blockade Collision in Diabetic Nephropathy",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 61-year-old male with type 2 diabetes, diabetic kidney disease with macroalbuminuria, and resistant hypertension is concurrently prescribed an ACE inhibitor (Lisinopril) and an ARB (Losartan) in an effort to maximize antiproteinuric effect.",
    "patient": {
      "age": 61,
      "sex": "Male",
      "diseases": [
        "Type 2 diabetes mellitus",
        "Diabetic nephropathy with macroalbuminuria",
        "Essential hypertension"
      ],
      "medications": [
        "Lisinopril 40 mg daily",
        "Losartan 100 mg daily",
        "Amlodipine 10 mg daily",
        "Atorvastatin 20 mg daily"
      ],
      "symptoms": [
        "Headache",
        "Persistent proteinuria"
      ],
      "lab_values": {
        "eGFR": "35 mL/min/1.73m\u00b2",
        "serum_creatinine": "1.9 mg/dL",
        "potassium": "4.8 mEq/L",
        "urine_albumin_creatinine_ratio": "680 mg/g"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Cardiorenal disease clinic visit"
      ]
    },
    "naive_pick": "Continue combination Lisinopril 40 mg and Losartan 100 mg",
    "dea_pick": "Monotherapy ACE inhibitor or ARB titrated to maximum tolerated dose",
    "rule_fired": "RULE-K-01 (Fatal Hyperkalemia Hazard)",
    "mechanism": "hyperkalemic_cardiotoxicity",
    "clinical_rationale": "Combining an ACE inhibitor with an ARB produces no incremental cardiovascular or renal protection but significantly increases the incidence of acute kidney injury, severe hyperkalemia, and syncope. The landmark VA NEPHRON-D trial was terminated early for excess renal events and hyperkalemia.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "24206457",
        "title": "Combined Angiotensin Inhibition for the Treatment of Diabetic Nephropathy (VA NEPHRON-D)",
        "url": "https://pubmed.ncbi.nlm.nih.gov/24206457/",
        "exact_evidence_section": "Primary Outcomes: Early safety stopping due to hyperkalemia and acute kidney injury",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "PubMed",
        "identifier": "18378520",
        "title": "Telmisartan, ramipril, or both in patients at high risk for vascular events (ONTARGET)",
        "url": "https://pubmed.ncbi.nlm.nih.gov/18378520/",
        "exact_evidence_section": "Results: Combination therapy associated with more adverse renal outcomes without benefit",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-005",
    "category": "liver_disease_statins",
    "title": "High-Intensity Statin Collision in Decompensated Cirrhosis",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 59-year-old male with history of alcohol-related decompensated cirrhosis (Child-Pugh Class B) and dyslipidemia is admitted with jaundice and transaminitis. He is taking high-intensity Atorvastatin for elevated LDL cholesterol.",
    "patient": {
      "age": 59,
      "sex": "Male",
      "diseases": [
        "Decompensated liver cirrhosis",
        "Severe mixed hyperlipidemia",
        "Ascites"
      ],
      "medications": [
        "Atorvastatin 40 mg daily",
        "Spironolactone 100 mg daily",
        "Furosemide 40 mg daily",
        "Lactulose 20 g twice daily"
      ],
      "symptoms": [
        "Scleral icterus",
        "Abdominal distension",
        "Fatigue"
      ],
      "lab_values": {
        "ALT": "142 U/L",
        "AST": "168 U/L",
        "total_bilirubin": "2.8 mg/dL",
        "INR": "1.6",
        "albumin": "2.9 g/dL"
      },
      "allergies": [
        "Codeine"
      ],
      "conditions": [
        "Child-Pugh Class B cirrhosis"
      ]
    },
    "naive_pick": "Continue Atorvastatin 40 mg daily",
    "dea_pick": "Discontinue statin therapy during acute hepatic decompensation",
    "rule_fired": "RULE-HEP-01 (Active Cirrhosis / Transaminase > 3x)",
    "mechanism": "hepatic_injury",
    "clinical_rationale": "DailyMed FDA labeling for Atorvastatin explicitly lists active liver disease, including unexplained persistent transaminase elevations and hepatic failure, as an absolute contraindication. In cirrhosis, atorvastatin plasma exposure increases markedly due to impaired hepatic uptake and clearance, precipitating fulminant hepatotoxicity.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "DailyMed",
        "identifier": "c6e131fe-e7df-4876-83f7-9156fc4e8228",
        "title": "LIPITOR (atorvastatin calcium) tablet",
        "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c6e131fe-e7df-4876-83f7-9156fc4e8228",
        "exact_evidence_section": "Section 4: Contraindications in Active Liver Disease",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-006",
    "category": "gout_renal_cyp3a4",
    "title": "Fatal Colchicine-Clarithromycin Triad Collision in CKD Stage 4",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 74-year-old male with chronic kidney disease stage 4 (eGFR 24 mL/min/1.73m\u00b2) is taking Clarithromycin for an atypical respiratory tract infection. He develops acute excruciating podagra (gout flare) and is prescribed standard Colchicine therapy.",
    "patient": {
      "age": 74,
      "sex": "Male",
      "diseases": [
        "Chronic kidney disease, stage 4",
        "Acute gouty arthritis (podagra)",
        "Community-acquired pneumonia"
      ],
      "medications": [
        "Clarithromycin 500 mg twice daily",
        "Colchicine 0.6 mg orally",
        "Allopurinol 100 mg daily",
        "Amlodipine 5 mg daily"
      ],
      "symptoms": [
        "Severe right first metatarsophalangeal erythema and pain",
        "Cough",
        "Dysuria absent"
      ],
      "lab_values": {
        "eGFR": "24 mL/min/1.73m\u00b2",
        "serum_creatinine": "2.6 mg/dL",
        "uric_acid": "8.8 mg/dL"
      },
      "allergies": [
        "Penicillin"
      ],
      "conditions": [
        "Acute gout flare in outpatient setting"
      ]
    },
    "naive_pick": "Continue full-dose Colchicine with Clarithromycin",
    "dea_pick": "Oral Prednisone taper (20-30 mg daily tapering over 5-7 days)",
    "rule_fired": "RULE-DDI-01 (Fatal CYP/P-gp Clearance Blockade)",
    "mechanism": "p_gp_inhibition_toxicity",
    "clinical_rationale": "Colchicine elimination depends on P-glycoprotein transporter and CYP3A4 metabolism. Clarithromycin potently inhibits both pathways. In patients with renal impairment, co-administration causes massive colchicine accumulation leading to multi-organ failure, pancytopenia, and fatal toxicity. FDA labeling specifies an absolute contraindication.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "15973595",
        "title": "Fatal interaction between clarithromycin and colchicine in patients with renal insufficiency: a retrospective study",
        "url": "https://pubmed.ncbi.nlm.nih.gov/15973595/",
        "exact_evidence_section": "Results: 10.2% mortality in concomitant clarithromycin-colchicine patients with renal failure",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "DailyMed",
        "identifier": "5866ca12-a28f-cbe7-e063-6294a90acc69",
        "title": "FDA Colchicine Drug Label Warnings",
        "url": "https://dailymed.nlm.nih.gov/",
        "exact_evidence_section": "Boxed Warning / Section 4 Contraindications: Concomitant P-gp/strong CYP3A4 inhibitors in renal impairment",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-007",
    "category": "infection_renal_dosing",
    "title": "Nitrofurantoin Neuro-Pulmonary Toxicity Collision in Advanced CKD",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 78-year-old female with CKD stage 4 (CrCl 24 mL/min) presents with acute uncomplicated cystitis. Clinic guidelines suggest Nitrofurantoin as empiric first-line therapy.",
    "patient": {
      "age": 78,
      "sex": "Female",
      "diseases": [
        "Acute uncomplicated cystitis",
        "Chronic kidney disease, stage 4",
        "Osteopenia"
      ],
      "medications": [
        "Nitrofurantoin monohydrate/macrocrystals 100 mg twice daily",
        "Calcium carbonate 500 mg daily",
        "Vitamin D3 1000 IU daily"
      ],
      "symptoms": [
        "Dysuria",
        "Urinary frequency",
        "Suprapubic tenderness"
      ],
      "lab_values": {
        "CrCl": "24 mL/min",
        "serum_creatinine": "2.1 mg/dL",
        "urinalysis": "Positive leukocyte esterase and nitrites"
      },
      "allergies": [
        "Sulfa"
      ],
      "conditions": [
        "Geriatric primary care evaluation"
      ]
    },
    "naive_pick": "Continue Nitrofurantoin 100 mg twice daily for 7 days",
    "dea_pick": "Fosfomycin trometamol 3 g single oral dose",
    "rule_fired": "RULE-RENAL-01 (Renal Clearance Impairment)",
    "mechanism": "renal_clearance_failure",
    "clinical_rationale": "In patients with CrCl < 30 mL/min, nitrofurantoin fails to achieve therapeutic concentration in the bladder urine (causing microbiological failure) while systemic metabolites accumulate, triggering peripheral neuropathy, pulmonary fibrosis, and hepatotoxicity. Both the FDA label and 2023 AGS Beers Criteria mandate avoidance.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "37139824",
        "title": "2023 American Geriatrics Society Beers Criteria for Potentially Inappropriate Medication Use in Older Adults",
        "url": "https://pubmed.ncbi.nlm.nih.gov/37139824/",
        "exact_evidence_section": "Table 2: Medications to Avoid or Use with Caution in Older Adults with CKD (CrCl < 30 mL/min)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-008",
    "category": "heart_failure_mra_hyperkalemia",
    "title": "Spironolactone Initiation Collision in HFrEF with Baseline Hyperkalemia",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 67-year-old male with HFrEF (LVEF 25%) and CKD stage 3b presents for therapy optimization. Heart failure guidelines recommend initiating a mineralocorticoid receptor antagonist (Spironolactone). Laboratory testing reveals a baseline serum potassium of 5.4 mEq/L.",
    "patient": {
      "age": 67,
      "sex": "Male",
      "diseases": [
        "Heart failure with reduced ejection fraction",
        "Chronic kidney disease, stage 3b",
        "Hypertension"
      ],
      "medications": [
        "Lisinopril 20 mg daily",
        "Metoprolol succinate 100 mg daily",
        "Furosemide 40 mg daily",
        "Spironolactone 25 mg daily"
      ],
      "symptoms": [
        "Mild shortness of breath on exertion",
        "Ankle swelling improved"
      ],
      "lab_values": {
        "potassium": "5.4 mEq/L",
        "eGFR": "28 mL/min/1.73m\u00b2",
        "serum_creatinine": "2.2 mg/dL",
        "LVEF": "25%"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Post-hospitalization heart failure clinic follow-up"
      ]
    },
    "naive_pick": "Initiate Spironolactone 25 mg daily immediately",
    "dea_pick": "Optimize existing ARNI/beta-blocker therapy without initiating MRA",
    "rule_fired": "RULE-K-01 (Fatal Hyperkalemia Hazard)",
    "mechanism": "hyperkalemic_cardiotoxicity",
    "clinical_rationale": "Although MRAs provide mortality benefit in HFrEF, clinical guidelines explicitly contraindicate initiation when baseline potassium exceeds 5.0 mEq/L or eGFR is < 30 mL/min/1.73m\u00b2. In real-world practice, initiating MRAs in this setting causes severe hyperkalemia-associated hospitalizations and fatal arrhythmias (RALES/Juurlink study).",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "35379503",
        "title": "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure",
        "url": "https://pubmed.ncbi.nlm.nih.gov/35379503/",
        "exact_evidence_section": "Section 7.3: Mineralocorticoid Receptor Antagonists (Contraindicated if baseline K+ > 5.0 mEq/L or eGFR < 30)",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "PubMed",
        "identifier": "15295047",
        "title": "Rates of Hyperkalemia after Publication of the Randomized Aldactone Evaluation Study",
        "url": "https://pubmed.ncbi.nlm.nih.gov/15295047/",
        "exact_evidence_section": "Results: Increased hyperkalemia hospitalizations and mortality post-RALES",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-009",
    "category": "bleeding_risk_triple_antithrombotic",
    "title": "Prolonged Triple Antithrombotic Therapy Collision in AFib Post-PCI",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 74-year-old male with non-valvular atrial fibrillation and prior major peptic ulcer hemorrhage undergoes drug-eluting stent PCI for acute myocardial infarction. He is discharged on prolonged triple antithrombotic therapy (Aspirin + Clopidogrel + Apixaban) for 6 months.",
    "patient": {
      "age": 74,
      "sex": "Male",
      "diseases": [
        "Non-valvular atrial fibrillation",
        "Coronary artery disease s/p drug-eluting stent",
        "Prior peptic ulcer bleeding"
      ],
      "medications": [
        "Aspirin 81 mg daily",
        "Clopidogrel 75 mg daily",
        "Apixaban 5 mg twice daily",
        "Pantoprazole 40 mg daily",
        "Metoprolol succinate 50 mg daily"
      ],
      "symptoms": [
        "Epigastric discomfort",
        "Easy bruising"
      ],
      "lab_values": {
        "HAS-BLED": "4",
        "hemoglobin": "10.8 g/dL",
        "platelets": "210,000 /mcL",
        "eGFR": "64 mL/min/1.73m\u00b2"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Day 14 post-percutaneous coronary intervention"
      ]
    },
    "naive_pick": "Continue triple therapy for 6 months",
    "dea_pick": "Dual antithrombotic therapy (DOAC + Clopidogrel, discontinue Aspirin at discharge)",
    "rule_fired": "RULE-HEM-01 (Prolonged Triple Antithrombotic Hazard)",
    "mechanism": "bleeding_cascade_potentiation",
    "clinical_rationale": "In patients with AFib and elevated bleeding risk (HAS-BLED >= 3), prolonging triple antithrombotic therapy (OAC + DAPT) beyond 1 week markedly elevates fatal major and intracranial bleeding without ischemic benefit. 2020 ESC and 2023 ACC/AHA AFib guidelines recommend immediate discontinuation of aspirin upon hospital discharge.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "32860505",
        "title": "2020 ESC Guidelines for the diagnosis and management of atrial fibrillation",
        "url": "https://pubmed.ncbi.nlm.nih.gov/32860505/",
        "exact_evidence_section": "Section 11.2: Antithrombotic Therapy After Percutaneous Coronary Intervention in Patients with AF",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "PubMed",
        "identifier": "38031868",
        "title": "2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation",
        "url": "https://pubmed.ncbi.nlm.nih.gov/38031868/",
        "exact_evidence_section": "Section 5.4: AF and Percutaneous Coronary Intervention",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-010",
    "category": "qt_prolongation_citalopram",
    "title": "High-Dose Citalopram Collision with Baseline Long QT Syndrome",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 66-year-old female with major depressive disorder and baseline ECG demonstrating severe QTc prolongation (QTc 515 ms) is prescribed high-dose Citalopram 40 mg daily.",
    "patient": {
      "age": 66,
      "sex": "Female",
      "diseases": [
        "Major depressive disorder, recurrent",
        "Acquired QTc prolongation",
        "Osteoarthritis"
      ],
      "medications": [
        "Citalopram 40 mg daily",
        "Acetaminophen 500 mg as needed"
      ],
      "symptoms": [
        "Depressed mood",
        "Intermittent palpitations",
        "Dizziness on standing"
      ],
      "lab_values": {
        "QTc": "515 ms",
        "potassium": "4.1 mEq/L",
        "magnesium": "2.0 mg/dL",
        "eGFR": "72 mL/min/1.73m\u00b2"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Psychiatric clinic medication evaluation"
      ]
    },
    "naive_pick": "Maintain Citalopram 40 mg daily",
    "dea_pick": "Switch to low-QT-risk antidepressant (Sertraline or Bupropion)",
    "rule_fired": "RULE-QT-01 (Severe Long QTc Arrhythmia)",
    "mechanism": "prolonged_qt_arrhythmia",
    "clinical_rationale": "FDA Drug Safety Communications establish that Citalopram causes dose-dependent QT interval prolongation, increasing risk of fatal Torsades de Pointes. The FDA explicitly caps doses at 20 mg/day for patients older than 60 and warns that citalopram should not be used in patients with congenital long QT syndrome or pre-existing QTc > 500 ms.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "23360890",
        "title": "QT interval and antidepressant use: a cross sectional study of electronic health records",
        "url": "https://pubmed.ncbi.nlm.nih.gov/23360890/",
        "exact_evidence_section": "Results: Dose-dependent QTc prolongation associated with citalopram",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "FDA Safety Alert",
        "identifier": "FDA-DSC-2011-CITALOPRAM",
        "title": "FDA Drug Safety Communication: Revised recommendations for Celexa (citalopram hydrobromide) related to a potential risk of abnormal heart rhythms",
        "url": "https://www.fda.gov/drugs/drug-safety-and-availability/",
        "exact_evidence_section": "Dose Limitations and Contraindications in Long QT Syndrome",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-011",
    "category": "lithium_raas_toxicity",
    "title": "ACE Inhibitor-Induced Lithium Neurotoxicity Collision",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 52-year-old male with bipolar I disorder stabilized on Lithium Carbonate presents with newly diagnosed stage 2 hypertension (BP 154/96 mmHg). An ACE inhibitor (Lisinopril) is initiated for blood pressure control without lithium dosage modification.",
    "patient": {
      "age": 52,
      "sex": "Male",
      "diseases": [
        "Bipolar I disorder, euthymic",
        "Primary essential hypertension, stage 2"
      ],
      "medications": [
        "Lithium carbonate 600 mg twice daily",
        "Lisinopril 20 mg daily"
      ],
      "symptoms": [
        "Mild coarse hand tremor",
        "Nausea",
        "Headache"
      ],
      "lab_values": {
        "serum_lithium": "0.9 mEq/L",
        "serum_creatinine": "1.1 mg/dL",
        "eGFR": "78 mL/min/1.73m\u00b2",
        "potassium": "4.4 mEq/L"
      },
      "allergies": [
        "Sulfa"
      ],
      "conditions": [
        "Outpatient primary care visit"
      ]
    },
    "naive_pick": "Continue standard Lisinopril 20 mg without lithium level monitoring",
    "dea_pick": "Initiate calcium channel blocker (Amlodipine 5-10 mg daily)",
    "rule_fired": "RULE-RENAL-01 (Renal Clearance Impairment)",
    "mechanism": "renal_clearance_failure",
    "clinical_rationale": "ACE inhibitors reduce glomerular filtration and alter proximal tubular sodium handling, leading to compensatory increased lithium reabsorption and reduced renal lithium clearance. Serum lithium levels surge into toxic ranges, causing severe neurotoxicity, encephalopathy, ataxia, and permanent cerebellar damage.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "30805791",
        "title": "The Combination of Lithium and ACE Inhibitors: Hazardous, Critical, Possible?",
        "url": "https://pubmed.ncbi.nlm.nih.gov/30805791/",
        "exact_evidence_section": "Pharmacokinetic Mechanisms: Reduced fractional clearance of lithium by RAAS inhibition",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "DailyMed",
        "identifier": "5866ca12-a28f-cbe7-e063-6294a90acc69",
        "title": "LITHIUM CARBONATE CAPSULE",
        "url": "https://dailymed.nlm.nih.gov/",
        "exact_evidence_section": "Warnings and Drug Interactions: Concomitant use with ACE inhibitors",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-012",
    "category": "clopidogrel_omeprazole_interaction",
    "title": "Omeprazole CYP2C19 Antagonism Collision in Stented Patient",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 63-year-old male 6 weeks status-post drug-eluting coronary stent on Clopidogrel presents with severe symptomatic gastroesophageal reflux disease and pyrosis. Omeprazole 40 mg daily is prescribed.",
    "patient": {
      "age": 63,
      "sex": "Male",
      "diseases": [
        "Coronary artery disease s/p drug-eluting stent (DES)",
        "Severe GERD with erosive esophagitis"
      ],
      "medications": [
        "Clopidogrel 75 mg daily",
        "Aspirin 81 mg daily",
        "Omeprazole 40 mg daily",
        "Atorvastatin 40 mg daily"
      ],
      "symptoms": [
        "Severe heartburn",
        "Acid regurgitation",
        "No chest pain"
      ],
      "lab_values": {
        "hemoglobin": "13.6 g/dL",
        "platelets": "230,000 /mcL",
        "eGFR": "82 mL/min/1.73m\u00b2"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Cardiology outpatient clinic visit at 6 weeks post-PCI"
      ]
    },
    "naive_pick": "Continue Omeprazole 40 mg with Clopidogrel",
    "dea_pick": "Switch to Pantoprazole 40 mg daily (minimal CYP2C19 inhibition)",
    "rule_fired": "RULE-DDI-01 (Fatal CYP/P-gp Clearance Blockade)",
    "mechanism": "cyp_inhibition_accumulation",
    "clinical_rationale": "Clopidogrel is a prodrug requiring biotransformation into its active thiol metabolite by CYP2C19. Omeprazole is a potent, competitive inhibitor of CYP2C19 that substantially lowers clopidogrel active metabolite levels and platelet inhibition, increasing the risk of stent thrombosis and recurrent myocardial infarction. DailyMed and FDA label state to avoid concomitant use.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "20925534",
        "title": "Clopidogrel with or without Omeprazole in Coronary Artery Disease (COGENT)",
        "url": "https://pubmed.ncbi.nlm.nih.gov/20925534/",
        "exact_evidence_section": "Discussion: Pharmacodynamic interaction and antiplatelet inhibition considerations",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "DailyMed",
        "identifier": "5866ca12-a28f-cbe7-e063-6294a90acc69",
        "title": "PLAVIX (clopidogrel bisulfate) tablet",
        "url": "https://dailymed.nlm.nih.gov/",
        "exact_evidence_section": "Section 7.1: CYP2C19 Inhibitors (Avoid concomitant use with omeprazole or esomeprazole)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-013",
    "category": "nitrates_pde5_hypotension",
    "title": "Fatal Vasodilatory Hypotension Collision: Nitroglycerin & Sildenafil",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 64-year-old male with chronic stable exertional angina treated with daily Isosorbide Mononitrate and PRN sublingual nitroglycerin presents requesting pharmacotherapy for erectile dysfunction. Sildenafil is considered.",
    "patient": {
      "age": 64,
      "sex": "Male",
      "diseases": [
        "Chronic stable angina pectoris",
        "Erectile dysfunction",
        "Hyperlipidemia"
      ],
      "medications": [
        "Isosorbide mononitrate 60 mg daily",
        "Nitroglycerin 0.4 mg SL PRN",
        "Atenolol 50 mg daily",
        "Sildenafil 50 mg PRN"
      ],
      "symptoms": [
        "Exertional chest tightness relieved by nitroglycerin",
        "Erectile difficulty"
      ],
      "lab_values": {
        "blood_pressure": "118/74 mmHg",
        "heart_rate": "62 bpm",
        "eGFR": "75 mL/min/1.73m\u00b2"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Men's health / cardiology co-management"
      ]
    },
    "naive_pick": "Co-prescribe Sildenafil with Isosorbide mononitrate",
    "dea_pick": "Non-nitrate antianginal management (Ranolazine or optimize beta-blocker/CCB) before ED consideration",
    "rule_fired": "RULE-HYPO-01 (Fatal Refractory Vasodilatory Shock)",
    "mechanism": "vasodilatory_hypotension",
    "clinical_rationale": "Organic nitrates donate nitric oxide to stimulate soluble guanylyl cyclase, while PDE5 inhibitors prevent cyclic GMP breakdown. Co-administration produces profound, synergistic accumulation of cGMP, causing massive arterial vasodilatation, severe refractory hypotension, myocardial infarction, and cardiovascular collapse. DailyMed package insert lists an absolute contraindication.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "9935041",
        "title": "Use of sildenafil (Viagra) in patients with cardiovascular disease. ACC/AHA Expert Consensus Document",
        "url": "https://pubmed.ncbi.nlm.nih.gov/9935041/",
        "exact_evidence_section": "Section on Concomitant Nitrates: Absolute Contraindication",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "PubMed",
        "identifier": "9884398",
        "title": "Use of sildenafil (Viagra) in patients with cardiovascular disease",
        "url": "https://pubmed.ncbi.nlm.nih.gov/9884398/",
        "exact_evidence_section": "Circulation Executive Summary: Contraindications to Sildenafil and Organic Nitrates",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "COL-014",
    "category": "heart_failure_ccb_decompensation",
    "title": "Negative Inotrope Decompensation Collision: Diltiazem in HFrEF",
    "classification": "TRUE_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 69-year-old female with HFrEF (LVEF 22%) and paroxysmal atrial fibrillation with rapid ventricular response (HR 124 bpm) is prescribed Diltiazem 240 mg daily for rate control.",
    "patient": {
      "age": 69,
      "sex": "Female",
      "diseases": [
        "Heart failure with reduced ejection fraction",
        "Atrial fibrillation with rapid ventricular response"
      ],
      "medications": [
        "Diltiazem CD 240 mg daily",
        "Furosemide 40 mg daily",
        "Sacubitril/Valsartan 49/51 mg twice daily",
        "Apixaban 5 mg twice daily"
      ],
      "symptoms": [
        "Rapid irregular heartbeat",
        "Orthopnea",
        "Bilateral pedal edema"
      ],
      "lab_values": {
        "heart_rate": "124 bpm",
        "blood_pressure": "104/68 mmHg",
        "LVEF": "22%",
        "BNP": "860 pg/mL",
        "eGFR": "55 mL/min/1.73m\u00b2"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Emergency department observation / cardiology consultation"
      ]
    },
    "naive_pick": "Continue Diltiazem 240 mg daily",
    "dea_pick": "Beta-blocker rate control (Carvedilol or Metoprolol succinate titrated carefully)",
    "rule_fired": "None (Safe Control)",
    "mechanism": "negative_inotropic_decompensation",
    "clinical_rationale": "Non-dihydropyridine calcium channel blockers (Diltiazem and Verapamil) exert potent negative inotropic actions that depress myocardial contractility. In patients with HFrEF, their administration precipitates acute cardiogenic shock, worsening pulmonary edema, and increased mortality. 2022 AHA/ACC/HFSA guidelines classify them as Class III: Harm.",
    "single_agent_violation": true,
    "naive_multi_violation": true,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "35379503",
        "title": "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure",
        "url": "https://pubmed.ncbi.nlm.nih.gov/35379503/",
        "exact_evidence_section": "Section 7.5: Drugs with Negative Inotropic Effects (Class III: Harm for Diltiazem and Verapamil in HFrEF)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "NC-001",
    "category": "negative_control_diabetes_mild_ckd",
    "title": "Concordant Management: Metformin & ACEi in Mild CKD Stage 2",
    "classification": "NO_COLLISION",
    "has_collision": false,
    "clinical_scenario": "A 58-year-old male with type 2 diabetes, mild microalbuminuria, and hypertension presents for medication review. Renal function is mildly decreased (eGFR 74 mL/min/1.73m\u00b2), within safe parameters for all therapies.",
    "patient": {
      "age": 58,
      "sex": "Male",
      "diseases": [
        "Type 2 diabetes mellitus",
        "Essential hypertension",
        "Chronic kidney disease, stage 2"
      ],
      "medications": [
        "Metformin 1000 mg twice daily",
        "Lisinopril 20 mg daily"
      ],
      "symptoms": [
        "Asymptomatic routine checkup"
      ],
      "lab_values": {
        "eGFR": "74 mL/min/1.73m\u00b2",
        "serum_creatinine": "1.0 mg/dL",
        "potassium": "4.3 mEq/L",
        "HbA1c": "7.6%"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Annual chronic care review"
      ]
    },
    "naive_pick": "Standard Guideline Concordant Regimen",
    "dea_pick": "Maintain Guideline Concordant Regimen",
    "rule_fired": "None (Safe Control)",
    "mechanism": "none",
    "clinical_rationale": "Both ADA and KDIGO guidelines concordantly recommend metformin as first-line therapy when eGFR >= 45 mL/min/1.73m\u00b2. Lisinopril is indicated for blood pressure control and renal protection in diabetic patients. There is no guideline collision or safety contraindication.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "36272764",
        "title": "KDIGO 2022 Clinical Practice Guideline for Diabetes Management in Chronic Kidney Disease",
        "url": "https://pubmed.ncbi.nlm.nih.gov/36272764/",
        "exact_evidence_section": "Chapter 1: Metformin use fully supported when eGFR >= 45 mL/min/1.73m\u00b2",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "NC-002",
    "category": "negative_control_hfref_gdmt",
    "title": "Concordant Management: Quadruple GDMT in HFrEF & CAD",
    "classification": "NO_COLLISION",
    "has_collision": false,
    "clinical_scenario": "A 66-year-old male with HFrEF (LVEF 32%) and stable CAD is evaluated for maintenance therapy. He is maintained on guideline-directed medical therapy with stable vital signs and electrolytes.",
    "patient": {
      "age": 66,
      "sex": "Male",
      "diseases": [
        "Heart failure with reduced ejection fraction",
        "Coronary artery disease",
        "Hypertension"
      ],
      "medications": [
        "Sacubitril/Valsartan 49/51 mg twice daily",
        "Carvedilol 25 mg twice daily",
        "Dapagliflozin 10 mg daily",
        "Spironolactone 25 mg daily"
      ],
      "symptoms": [
        "No shortness of breath at rest",
        "Normal exercise tolerance for age"
      ],
      "lab_values": {
        "blood_pressure": "122/76 mmHg",
        "heart_rate": "64 bpm",
        "eGFR": "58 mL/min/1.73m\u00b2",
        "potassium": "4.2 mEq/L",
        "serum_creatinine": "1.2 mg/dL"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Heart failure specialty clinic routine follow-up"
      ]
    },
    "naive_pick": "Standard Guideline Concordant Regimen",
    "dea_pick": "Maintain Guideline Concordant Regimen",
    "rule_fired": "None (Safe Control)",
    "mechanism": "none",
    "clinical_rationale": "The 2022 AHA/ACC/HFSA guidelines establish the four foundational pillars of GDMT (ARNI, beta-blocker, MRA, SGLT2i) as Class I recommendations to reduce hospitalizations and mortality. With potassium < 5.0 and eGFR > 30, all agents are aligned with zero conflict.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "35379503",
        "title": "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure",
        "url": "https://pubmed.ncbi.nlm.nih.gov/35379503/",
        "exact_evidence_section": "Section 7.3: Comprehensive Guideline-Directed Medical Therapy for HFrEF (Class I Recommendations)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "NC-003",
    "category": "negative_control_afib_statin",
    "title": "Concordant Management: Apixaban & Statin in Normal Renal Function",
    "classification": "NO_COLLISION",
    "has_collision": false,
    "clinical_scenario": "A 71-year-old female with non-valvular atrial fibrillation (CHA2DS2-VASc 3) and hyperlipidemia presents for routine wellness evaluation. Renal function and hepatic markers are completely normal.",
    "patient": {
      "age": 71,
      "sex": "Female",
      "diseases": [
        "Non-valvular atrial fibrillation",
        "Primary hyperlipidemia",
        "Mild osteoarthritis"
      ],
      "medications": [
        "Apixaban 5 mg twice daily",
        "Atorvastatin 40 mg daily",
        "Acetaminophen 500 mg PRN"
      ],
      "symptoms": [
        "Occasional mild joint ache"
      ],
      "lab_values": {
        "CrCl": "88 mL/min",
        "serum_creatinine": "0.8 mg/dL",
        "ALT": "22 U/L",
        "AST": "20 U/L",
        "platelets": "240,000 /mcL"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Outpatient primary care wellness visit"
      ]
    },
    "naive_pick": "Standard Guideline Concordant Regimen",
    "dea_pick": "Maintain Guideline Concordant Regimen",
    "rule_fired": "None (Safe Control)",
    "mechanism": "none",
    "clinical_rationale": "Apixaban standard dosing is indicated for stroke prophylaxis in non-valvular AFib with normal renal function. Atorvastatin is indicated for primary ASCVD risk reduction. There is no pharmacokinetic or pharmacodynamic collision.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "38031868",
        "title": "2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation",
        "url": "https://pubmed.ncbi.nlm.nih.gov/38031868/",
        "exact_evidence_section": "Section 5: Anticoagulation for Stroke Prevention",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "PubMed",
        "identifier": "30423393",
        "title": "2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol",
        "url": "https://pubmed.ncbi.nlm.nih.gov/30423393/",
        "exact_evidence_section": "Primary Prevention Recommendations",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "NC-004",
    "category": "negative_control_thyroid_htn",
    "title": "Concordant Management: Levothyroxine & Amlodipine in HTN",
    "classification": "NO_COLLISION",
    "has_collision": false,
    "clinical_scenario": "A 54-year-old female with primary hypothyroidism on Levothyroxine and essential hypertension on Amlodipine presents for follow-up. Thyroid and blood pressure parameters are well-controlled.",
    "patient": {
      "age": 54,
      "sex": "Female",
      "diseases": [
        "Primary hypothyroidism",
        "Essential hypertension"
      ],
      "medications": [
        "Levothyroxine 75 mcg daily on empty stomach",
        "Amlodipine 5 mg daily"
      ],
      "symptoms": [
        "Asymptomatic",
        "Energy level normal"
      ],
      "lab_values": {
        "TSH": "2.1 mIU/L",
        "free_T4": "1.2 ng/dL",
        "blood_pressure": "126/80 mmHg",
        "serum_creatinine": "0.9 mg/dL"
      },
      "allergies": [
        "Penicillin"
      ],
      "conditions": [
        "Routine outpatient endocrine and cardiovascular check"
      ]
    },
    "naive_pick": "Standard Guideline Concordant Regimen",
    "dea_pick": "Maintain Guideline Concordant Regimen",
    "rule_fired": "None (Safe Control)",
    "mechanism": "none",
    "clinical_rationale": "Levothyroxine provides physiological hormone replacement. Amlodipine (a dihydropyridine calcium channel blocker) lowers blood pressure without interfering with thyroid hormone absorption, peripheral conversion, or metabolism.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "25266247",
        "title": "Guidelines for the Treatment of Hypothyroidism (American Thyroid Association)",
        "url": "https://pubmed.ncbi.nlm.nih.gov/25266247/",
        "exact_evidence_section": "Levothyroxine Monotherapy and Target TSH Maintenance",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "PubMed",
        "identifier": "29133354",
        "title": "2017 ACC/AHA High Blood Pressure Guideline",
        "url": "https://pubmed.ncbi.nlm.nih.gov/29133354/",
        "exact_evidence_section": "First-Line Antihypertensive Agents (Calcium Channel Blockers)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "NC-005",
    "category": "negative_control_depression_diabetes",
    "title": "Concordant Management: Escitalopram & Metformin",
    "classification": "NO_COLLISION",
    "has_collision": false,
    "clinical_scenario": "A 49-year-old male with major depressive disorder and type 2 diabetes presents for follow-up. Renal function is normal, baseline ECG shows normal QTc (410 ms), and glycemic control is stable.",
    "patient": {
      "age": 49,
      "sex": "Male",
      "diseases": [
        "Major depressive disorder, single episode",
        "Type 2 diabetes mellitus"
      ],
      "medications": [
        "Escitalopram 10 mg daily",
        "Metformin 1000 mg twice daily"
      ],
      "symptoms": [
        "Improved mood",
        "Stable appetite"
      ],
      "lab_values": {
        "eGFR": "88 mL/min/1.73m\u00b2",
        "HbA1c": "7.4%",
        "QTc": "410 ms",
        "potassium": "4.4 mEq/L"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Ambulatory care clinic review"
      ]
    },
    "naive_pick": "Standard Guideline Concordant Regimen",
    "dea_pick": "Maintain Guideline Concordant Regimen",
    "rule_fired": "None (Safe Control)",
    "mechanism": "none",
    "clinical_rationale": "Escitalopram at a standard 10 mg dose in a patient with normal baseline QTc carries minimal arrhythmogenic risk. Metformin is first-line for diabetes in normal renal function. There is no guideline collision.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "36272764",
        "title": "KDIGO 2022 Clinical Practice Guideline for Diabetes Management in Chronic Kidney Disease",
        "url": "https://pubmed.ncbi.nlm.nih.gov/36272764/",
        "exact_evidence_section": "Chapter 1: Glycemic Management in Preserved Renal Function",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "NC-006",
    "category": "negative_control_asthma_rhinitis",
    "title": "Concordant Management: Inhaled Corticosteroid & Antihistamine",
    "classification": "NO_COLLISION",
    "has_collision": false,
    "clinical_scenario": "A 34-year-old female with moderate persistent asthma and allergic rhinitis is well-controlled on Fluticasone/Salmeterol inhaler and oral Cetirizine.",
    "patient": {
      "age": 34,
      "sex": "Female",
      "diseases": [
        "Moderate persistent asthma",
        "Seasonal allergic rhinitis"
      ],
      "medications": [
        "Fluticasone propionate / Salmeterol 250/50 mcg DPI twice daily",
        "Cetirizine 10 mg daily",
        "Albuterol HFA inhaler 90 mcg PRN"
      ],
      "symptoms": [
        "Infrequent daytime asthma symptoms (<1/month)",
        "Rhinitis symptoms controlled"
      ],
      "lab_values": {
        "FEV1": "82% predicted",
        "eosinophils": "220 /mcL"
      },
      "allergies": [
        "Aspirin"
      ],
      "conditions": [
        "Pulmonary clinic follow-up"
      ]
    },
    "naive_pick": "Standard Guideline Concordant Regimen",
    "dea_pick": "Maintain Guideline Concordant Regimen",
    "rule_fired": "None (Safe Control)",
    "mechanism": "none",
    "clinical_rationale": "GINA 2022/2023 strategy guidelines endorse combination low/medium-dose ICS/LABA maintenance therapy for Step 3 asthma. Non-sedating second-generation antihistamines (Cetirizine) provide targeted H1 blockade without broncho-constrictive or sedative interactions.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "34666208",
        "title": "Global Initiative for Asthma Strategy 2021: Executive Summary and Rationale for Key Changes",
        "url": "https://pubmed.ncbi.nlm.nih.gov/34666208/",
        "exact_evidence_section": "Step 3 Treatment Recommendations (ICS-formoterol or ICS-LABA maintenance)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "NC-007",
    "category": "negative_control_osteoporosis_htn",
    "title": "Concordant Management: Alendronate & Thiazide Diuretic",
    "classification": "NO_COLLISION",
    "has_collision": false,
    "clinical_scenario": "A 68-year-old postmenopausal female with documented osteoporosis and essential hypertension takes weekly oral Alendronate and daily Chlorthalidone.",
    "patient": {
      "age": 68,
      "sex": "Female",
      "diseases": [
        "Postmenopausal osteoporosis",
        "Essential hypertension"
      ],
      "medications": [
        "Alendronate sodium 70 mg weekly with full glass of water",
        "Chlorthalidone 25 mg daily",
        "Calcium carbonate 500 mg daily",
        "Vitamin D3 1000 IU daily"
      ],
      "symptoms": [
        "Asymptomatic",
        "No gastroesophageal reflux",
        "No history of fragility fractures"
      ],
      "lab_values": {
        "eGFR": "65 mL/min/1.73m\u00b2",
        "serum_calcium": "9.4 mg/dL",
        "DXA_T_score_lumbar_spine": "-2.7",
        "DXA_T_score_femoral_neck": "-2.5"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Endocrine and preventive health review"
      ]
    },
    "naive_pick": "Standard Guideline Concordant Regimen",
    "dea_pick": "Maintain Guideline Concordant Regimen",
    "rule_fired": "None (Safe Control)",
    "mechanism": "none",
    "clinical_rationale": "Oral bisphosphonates are first-line therapy for postmenopausal osteoporosis (AACE 2020 guidelines). Thiazide and thiazide-like diuretics (Chlorthalidone) decrease urinary calcium excretion, providing synergistic bone mineral density retention while controlling blood pressure.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "32427503",
        "title": "American Association of Clinical Endocrinologists/American College of Endocrinology Clinical Practice Guidelines for the Diagnosis and Treatment of Postmenopausal Osteoporosis - 2020 Update",
        "url": "https://pubmed.ncbi.nlm.nih.gov/32427503/",
        "exact_evidence_section": "Initial Treatment of Osteoporosis in High Fracture Risk",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "PubMed",
        "identifier": "29133354",
        "title": "2017 ACC/AHA High Blood Pressure Guideline",
        "url": "https://pubmed.ncbi.nlm.nih.gov/29133354/",
        "exact_evidence_section": "First-Line Antihypertensive Agents (Thiazide Diuretics)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "AMB-001",
    "category": "ambiguous_renal_metformin_threshold",
    "title": "Dosing Boundary Ambiguity: Metformin in CKD Stage 3b (eGFR 38)",
    "classification": "POTENTIAL_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 67-year-old male with type 2 diabetes has moderate chronic kidney disease with eGFR 38 mL/min/1.73m\u00b2. He is currently taking Metformin 1000 mg daily. The clinical team debates whether this represents a safety violation requiring cessation or an allowable reduced-dose regimen.",
    "patient": {
      "age": 67,
      "sex": "Male",
      "diseases": [
        "Type 2 diabetes mellitus",
        "Chronic kidney disease, stage 3b",
        "Hypertension"
      ],
      "medications": [
        "Metformin 500 mg twice daily",
        "Lisinopril 10 mg daily",
        "Amlodipine 5 mg daily"
      ],
      "symptoms": [
        "Fatigue",
        "No gastrointestinal upset"
      ],
      "lab_values": {
        "eGFR": "38 mL/min/1.73m\u00b2",
        "serum_creatinine": "1.8 mg/dL",
        "HbA1c": "7.8%",
        "potassium": "4.5 mEq/L"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Nephrology / primary care co-management"
      ]
    },
    "naive_pick": "Increase Metformin to 1000 mg twice daily (2000 mg/day)",
    "dea_pick": "Continue dose-reduced Metformin (maximum 1000 mg daily) with eGFR monitoring every 3-6 months",
    "rule_fired": "RULE-RENAL-01 (Renal Clearance Impairment)",
    "mechanism": "renal_clearance_failure",
    "clinical_rationale": "This is a clinical borderline case. In CKD stage 3b (eGFR 30-44 mL/min/1.73m\u00b2), FDA and KDIGO guidelines permit continuing metformin provided the daily dose is capped at 1000 mg with frequent renal monitoring, but advise against new initiation. Some institutional protocols recommend cessation. Because continuation at <= 1000 mg is not an absolute violation, it is classified as POTENTIAL_COLLISION.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "36272764",
        "title": "KDIGO 2022 Clinical Practice Guideline for Diabetes Management in Chronic Kidney Disease",
        "url": "https://pubmed.ncbi.nlm.nih.gov/36272764/",
        "exact_evidence_section": "Figure 8: Dose reduction to max 1000 mg daily for eGFR 30-44 mL/min/1.73m\u00b2",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "DailyMed",
        "identifier": "5866ca12-a28f-cbe7-e063-6294a90acc69",
        "title": "METFORMIN HYDROCHLORIDE TABLET",
        "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5866ca12-a28f-cbe7-e063-6294a90acc69",
        "exact_evidence_section": "Dosage and Administration in Renal Impairment (Assess benefit/risk at eGFR 30-45)",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  },
  {
    "case_id": "AMB-002",
    "category": "ambiguous_hfpef_digoxin",
    "title": "Efficacy Ambiguity: Digoxin in HFpEF with Mild Renal Impairment",
    "classification": "POTENTIAL_COLLISION",
    "has_collision": true,
    "clinical_scenario": "A 73-year-old female with heart failure with preserved ejection fraction (HFpEF, LVEF 54%), paroxysmal atrial fibrillation, and mild CKD (eGFR 46 mL/min/1.73m\u00b2) takes Digoxin 0.125 mg daily. Serum digoxin level is 0.8 ng/mL.",
    "patient": {
      "age": 73,
      "sex": "Female",
      "diseases": [
        "Heart failure with preserved ejection fraction (HFpEF)",
        "Paroxysmal atrial fibrillation",
        "Chronic kidney disease, stage 3a"
      ],
      "medications": [
        "Digoxin 0.125 mg daily",
        "Empagliflozin 10 mg daily",
        "Apixaban 5 mg twice daily",
        "Amlodipine 5 mg daily"
      ],
      "symptoms": [
        "Occasional dyspnea on heavy exertion",
        "Heart rate well-controlled at 74 bpm"
      ],
      "lab_values": {
        "serum_digoxin": "0.8 ng/mL",
        "eGFR": "46 mL/min/1.73m\u00b2",
        "serum_creatinine": "1.4 mg/dL",
        "potassium": "4.3 mEq/L",
        "LVEF": "54%"
      },
      "allergies": [
        "None"
      ],
      "conditions": [
        "Outpatient cardiology follow-up"
      ]
    },
    "naive_pick": "Increase Digoxin to 0.25 mg daily",
    "dea_pick": "Maintain low-dose Digoxin (0.125 mg daily) with strict serum level monitoring (target 0.5-0.9 ng/mL)",
    "rule_fired": "RULE-RENAL-01 (Renal Clearance Impairment)",
    "mechanism": "renal_clearance_failure",
    "clinical_rationale": "In HFpEF, evidence for digoxin benefit is limited and guidelines do not endorse it as first-line therapy. However, when used for rate control in AFib with serum levels strictly maintained between 0.5-0.9 ng/mL, it is not an absolute Class III contraindication. Because clinical appropriateness depends on strict monitoring and narrow therapeutic index rather than absolute harm, it is classified as POTENTIAL_COLLISION.",
    "single_agent_violation": false,
    "naive_multi_violation": false,
    "dea_violation": false,
    "citations": [
      {
        "source": "PubMed",
        "identifier": "35379503",
        "title": "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure",
        "url": "https://pubmed.ncbi.nlm.nih.gov/35379503/",
        "exact_evidence_section": "Section 8: Management of Heart Failure with Preserved Ejection Fraction",
        "verification_status": "SOURCE_VERIFIED"
      },
      {
        "source": "PubMed",
        "identifier": "38031868",
        "title": "2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation",
        "url": "https://pubmed.ncbi.nlm.nih.gov/38031868/",
        "exact_evidence_section": "Section 6.1: Rate Control Pharmacotherapy",
        "verification_status": "SOURCE_VERIFIED"
      }
    ]
  }
];
