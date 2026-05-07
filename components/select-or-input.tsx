"use client";

import { useState, useRef, useMemo } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  defaultOptionLabel?: string;
};

export function SelectOrInput({
  value,
  onChange,
  options,
  placeholder = "请输入...",
  className,
  defaultOptionLabel = "请选择",
}: Props) {
  const [localText, setLocalText] = useState("");
  const [isUserInTextMode, setIsUserInTextMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustomValue = useMemo(
    () => !options.some((option) => option.value === value),
    [value, options]
  );

  const showTextInput = isUserInTextMode || isCustomValue;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    const hasOtherOption = options.some((option) => option.value === "其他");

    if (hasOtherOption && selectedValue === "其他") {
      setIsUserInTextMode(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      setIsUserInTextMode(false);
      setLocalText("");
      onChange(selectedValue);
    }
  };

  const handleTextBlur = () => {
    const trimmedValue = localText.trim();
    if (trimmedValue) {
      onChange(trimmedValue);
    } else if (value) {
      onChange("");
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setIsUserInTextMode(false);
      setLocalText("");
    }
  };

  const selectedOption = options.find((option) => option.value === value);

  const inputClass =
    className ||
    "w-full rounded-2xl border border-slate-200/90 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none focus:border-teal-400";

  return (
    <div className="relative">
      {showTextInput ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            placeholder={placeholder}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => {
              setIsUserInTextMode(false);
              setLocalText("");
              onChange(selectedOption?.value || "");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
          >
            ↩
          </button>
        </div>
      ) : (
        <select
          value={selectedOption?.value || ""}
          onChange={handleSelectChange}
          className={inputClass}
        >
          <option value="">{defaultOptionLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
