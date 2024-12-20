export type Step = 'define' | 'design' | 'certify' | 'issue';

export interface EnsuranceForm {
  name: string;
  description: string;
  fundingFlows: {
    group: number;    // 50%
    ensurance: number; // 40%
    protocol: number;  // 10%
  };
  media: {
    buffer: Buffer | null;
    type: 'image' | 'video';
  };
  certification: {
    markId: string | null;
    style: string | null;
  };
}

// Props for each step component
export interface StepProps {
  form: EnsuranceForm;
  setForm: (form: EnsuranceForm) => void;
}

// Issue step doesn't need setForm
export interface IssueStepProps {
  form: EnsuranceForm;
} 