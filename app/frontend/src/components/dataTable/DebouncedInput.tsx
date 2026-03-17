import { useEffect, useState } from 'react';
import Input, { InputType } from '../input/Input';
import SearchIcon from '../../assets/search.svg?react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
  placeholder?: string;
};

export default function DebouncedInput({ value, onChange, debounce = 400, placeholder = 'Search...' }: Props) {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(internalValue);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [internalValue, debounce, onChange]);

  const inputProps: InputType = {
    inputProps: {
      type: 'text',
      placeholder,
      name: 'search',
      value: internalValue,
      onChange: (e) => setInternalValue(e.target.value),
    },
    iconComponent: SearchIcon,
  };

  return <Input {...inputProps} />;
}
