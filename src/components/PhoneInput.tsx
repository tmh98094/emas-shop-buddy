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
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Format based on country code
  if (countryCode === '+60') {
    // Malaysia: +60 11 1122 3455
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
  } else if (countryCode === '+65') {
    // Singapore: +65 1234 1234
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
            <SelectItem value="+60">{isMobile ? "+60" : "🇲🇾 +60"}</SelectItem>
            <SelectItem value="+65">{isMobile ? "+65" : "🇸🇬 +65"}</SelectItem>
            <SelectItem value="+86">{isMobile ? "+86" : "🇨🇳 +86"}</SelectItem>
            <SelectItem value="+1">{isMobile ? "+1" : "🇺🇸 +1"}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="tel"
          placeholder={countryCode === '+60' ? "11 1122 3455" : "1234 1234"}
          value={phoneNumber}
          onChange={handlePhoneInput}
          required={required}
          className="flex-1"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {countryCode === '+60' ? 'Format: 11 1122 3455' : 'Format: 1234 1234'}
      </p>
    </div>
  );
};
