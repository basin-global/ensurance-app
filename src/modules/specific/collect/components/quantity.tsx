import { Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface QuantityInputProps {
  quantity: number;
  onChange: (quantity: number) => void;
  maxQuantity?: bigint;
  disabled?: boolean;
}

export function QuantityInput({ 
  quantity, 
  onChange, 
  maxQuantity,
  disabled = false 
}: QuantityInputProps) {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && (!maxQuantity || newQuantity <= Number(maxQuantity))) {
      onChange(newQuantity);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
      <p className="text-gray-400">Quantity</p>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleQuantityChange(-1)}
          disabled={disabled || quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="font-mono w-12 text-center">{quantity}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleQuantityChange(1)}
          disabled={disabled || (maxQuantity ? quantity >= Number(maxQuantity) : false)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
