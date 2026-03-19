import type { AgentStep } from "@/components/chatbot-panel";

export const DEMO_PDF_PATH =
  "/COVID-19__SARS-CoV-2__Spike_Gene_Primer_Design_Report.pdf";

/** Marker prefix the chatbot panel checks to render a PDF download row. */
export const DEMO_PDF_MARKER = "__DEMO_PDF__";

export interface DemoEvent {
  /** Milliseconds to wait BEFORE showing this event */
  delay: number;
  step?: AgentStep;
  /** If set, this text is appended/set as the assistant message content */
  content?: string;
}

export const DEMO_STEPS: DemoEvent[] = [
  // ── Initial analysis ──
  {
    delay: 1200,
    step: {
      type: "thinking",
      label: "Analyzing input query",
      content:
        "Parsing user request for SARS-CoV-2 spike gene primer design. Identifying target organism, gene of interest, and design constraints.",
    },
  },
  {
    delay: 2000,
    step: {
      type: "thinking",
      label: "Identifying target regions",
      content:
        "Target: SARS-CoV-2 Spike (S) glycoprotein gene (GenBank: MN908947.3, positions 21563–25384). Selecting conserved regions across major variants (Alpha, Beta, Delta, Omicron) for robust primer binding.",
    },
  },

  // ── MCP server calls ──
  {
    delay: 2500,
    step: {
      type: "tool_call",
      label: "Calling NCBI Gene Database MCP Server",
      content:
        'MCP Tool Call: ncbi_gene_fetch\n{\n  "organism": "SARS-CoV-2",\n  "gene": "S",\n  "accession": "MN908947.3",\n  "region": "21563..25384"\n}',
    },
  },
  {
    delay: 3000,
    step: {
      type: "tool_result",
      label: "NCBI Gene Database — result",
      content:
        "Retrieved spike gene sequence (3822 bp). Identified 5 conserved regions suitable for primer design. GC content: 37.3%. No significant homopolymer runs detected in target regions.",
    },
  },
  {
    delay: 1800,
    step: {
      type: "tool_call",
      label: "Running Primer3 design tool",
      content:
        'MCP Tool Call: primer3_design\n{\n  "sequence_template": "ATGTTTGTTTTTCTTGTTTTATTGCCACTAGTCTCTAGTCAGTGTGTTAATCTTACAACCAG...",\n  "product_size_range": "400-600",\n  "primer_opt_tm": 62.0,\n  "primer_min_tm": 58.0,\n  "primer_max_tm": 65.0,\n  "primer_opt_gc": 50.0,\n  "primer_num_return": 5\n}',
    },
  },
  {
    delay: 3500,
    step: {
      type: "tool_result",
      label: "Primer3 — result",
      content:
        "Designed 5 primer pairs. Top candidate:\n  Forward: 5'-ACTTCTAATGATGATTCTTCTAATCTAAACC-3' (Tm: 61.8°C, GC: 32.3%)\n  Reverse: 5'-TGATAGTTGCAACCAGTTCTAAAGC-3' (Tm: 62.1°C, GC: 40.0%)\n  Product size: 457 bp\n  Penalty score: 0.42",
    },
  },

  // ── BLAST specificity ──
  {
    delay: 2000,
    step: {
      type: "tool_call",
      label: "Executing BLAST specificity check",
      content:
        'MCP Tool Call: blast_check\n{\n  "forward": "ACTTCTAATGATGATTCTTCTAATCTAAACC",\n  "reverse": "TGATAGTTGCAACCAGTTCTAAAGC",\n  "database": "nt",\n  "organism": "Severe acute respiratory syndrome coronavirus 2"\n}',
    },
  },
  {
    delay: 4000,
    step: {
      type: "tool_result",
      label: "BLAST specificity — result",
      content:
        "Forward primer: 100% identity to 847/847 SARS-CoV-2 sequences in database. No significant off-target hits in human genome (Homo sapiens). Reverse primer: 100% identity to 841/847 sequences. 6 mismatches are in low-frequency variants. Specificity: PASS.",
    },
  },

  // ── Secondary structure analysis ──
  {
    delay: 1500,
    step: {
      type: "tool_call",
      label: "Analyzing primer secondary structures",
      content:
        'MCP Tool Call: secondary_structure_check\n{\n  "primers": ["ACTTCTAATGATGATTCTTCTAATCTAAACC", "TGATAGTTGCAACCAGTTCTAAAGC"],\n  "check_hairpin": true,\n  "check_self_dimer": true,\n  "check_cross_dimer": true\n}',
    },
  },
  {
    delay: 2800,
    step: {
      type: "tool_result",
      label: "Secondary structure — result",
      content:
        "Hairpin analysis:\n  Forward: ΔG = -1.2 kcal/mol (acceptable, > -3.0 threshold)\n  Reverse: ΔG = -0.8 kcal/mol (acceptable)\nSelf-dimer:\n  Forward: ΔG = -3.1 kcal/mol (acceptable, > -5.0 threshold)\n  Reverse: ΔG = -2.4 kcal/mol (acceptable)\nCross-dimer: ΔG = -4.2 kcal/mol (acceptable)\nAll checks: PASS.",
    },
  },

  // ── Variant analysis ──
  {
    delay: 2000,
    step: {
      type: "thinking",
      label: "Cross-referencing variant databases",
      content:
        "Checking primer binding sites against GISAID variant database. Confirming primers bind conserved epitopes across B.1.1.7 (Alpha), B.1.351 (Beta), P.1 (Gamma), B.1.617.2 (Delta), and B.1.1.529 (Omicron BA.1–BA.5).",
    },
  },
  {
    delay: 2500,
    step: {
      type: "tool_call",
      label: "Querying GISAID variant alignment MCP Server",
      content:
        'MCP Tool Call: gisaid_variant_check\n{\n  "primer_forward": "ACTTCTAATGATGATTCTTCTAATCTAAACC",\n  "primer_reverse": "TGATAGTTGCAACCAGTTCTAAAGC",\n  "variants": ["B.1.1.7", "B.1.351", "P.1", "B.1.617.2", "BA.1", "BA.2", "BA.5"]\n}',
    },
  },
  {
    delay: 3200,
    step: {
      type: "tool_result",
      label: "GISAID variant check — result",
      content:
        "Variant coverage:\n  Alpha (B.1.1.7): 100% match\n  Beta (B.1.351): 100% match\n  Gamma (P.1): 100% match\n  Delta (B.1.617.2): 100% match\n  Omicron BA.1: 100% match\n  Omicron BA.2: 100% match\n  Omicron BA.5: 100% match\nPrimers bind conserved region — no mutations at binding sites across all checked variants.",
    },
  },

  // ── Report generation ──
  {
    delay: 2000,
    step: {
      type: "thinking",
      label: "Compiling primer design report",
      content:
        "Aggregating all analysis results into a comprehensive PCR Primer Design Report. Formatting primer pair details, thermodynamic properties, specificity data, and variant coverage.",
    },
  },
  {
    delay: 2500,
    step: {
      type: "output",
      label: "Report generated",
      content:
        "COVID-19 SARS-CoV-2 Spike Gene Primer Design Report compiled successfully. Report includes 5 primer pair candidates with full thermodynamic analysis, BLAST specificity results, secondary structure checks, and cross-variant validation.",
    },
  },

  // ── Final: trigger PDF download row ──
  {
    delay: 1500,
    content: DEMO_PDF_MARKER,
  },
];
