'use client';

import { Textarea } from '@/components/ui/textarea';

interface TextQuestionProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function TextQuestion({ label, value, placeholder, onChange }: TextQuestionProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground">Leave blank to let AI decide</p>
    </div>
  );
}
