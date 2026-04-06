import { Input } from "@/components/ui/input";

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  return (
    <Input
      type="datetime-local"
      className="h-9 text-xs"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
