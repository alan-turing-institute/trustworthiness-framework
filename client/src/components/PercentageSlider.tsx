import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PercentageSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  metricName?: string;
}

export function PercentageSlider({
  value,
  onChange,
  disabled,
  metricName
}: PercentageSliderProps) {
  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
    onChange(val);
  };

  return (
    <div className="space-y-3">
      {metricName && (
        <Label className="text-sm font-medium text-text-primary">{metricName}</Label>
      )}
      <div className="flex items-center gap-4">
        <Slider
          value={[value]}
          onValueChange={handleSliderChange}
          max={100}
          step={5}
          className="flex-1"
          disabled={disabled}
        />
        <div className="flex items-center gap-2 w-24">
          <Input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={handleInputChange}
            className="w-16 text-center"
            disabled={disabled}
          />
          <span className="text-sm text-text-secondary font-medium">%</span>
        </div>
      </div>
      {!disabled && (
        <div className="flex justify-between text-xs text-text-secondary px-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
}
