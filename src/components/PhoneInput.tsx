import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

interface PhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

const formatPhoneNumber = (value: string, countryCode: string): string => {
  // Remove all non-digits to get clean number
  const digits = value.replace(/\D/g, '');
  
  // Format based on country code (display only - actual value is digits only)
  if (countryCode === '+60') {
    // Malaysia: XX XXXX XXXX (10 digits) or 1X XXXX XXXX (11 digits for mobile)
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 11)}`;
  } else if (countryCode === '+65') {
    // Singapore: XXXX XXXX (8 digits)
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
  }
  
  // Default formatting for other countries
  return digits;
};

export const PhoneInput = ({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  label,
  required = false,
  error,
}: PhoneInputProps) => {
  const isMobile = useIsMobile();

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value, countryCode);
    onPhoneNumberChange(formatted);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label} {required && "*"}</Label>}
      <div className="flex gap-2">
        <Select value={countryCode} onValueChange={onCountryCodeChange}>
          <SelectTrigger className={isMobile ? "w-20" : "w-32"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="+60">+60</SelectItem>
            <SelectItem value="+65">+65</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="tel"
          placeholder={countryCode === '+60' ? "12 3456 7890" : "1234 5678"}
          value={phoneNumber}
          onChange={handlePhoneInput}
          required={required}
          className="flex-1"
          inputMode="numeric"
          pattern="[0-9 ]*"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {countryCode === '+60' 
          ? 'Malaysia: 10-11 digits (e.g., 12 3456 7890)' 
          : countryCode === '+65'
          ? 'Singapore: 8 digits (e.g., 1234 5678)'
          : 'Enter phone number'}
      </p>
    </div>
  );
};
