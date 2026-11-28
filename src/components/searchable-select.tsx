"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableOption = { value: string; label: string };

/** Normalizes Arabic/Persian letter variants and zero-width joiners so search matches loosely. */
function fold(text: string) {
  return text
    .toLowerCase()
    .replace(/[‌‏\s]+/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا");
}

/**
 * Select-only picker with a search box, for long option lists (cities, countries).
 * Values can only come from `options`; free text is never accepted.
 */
export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  invalid,
  describedBy,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return options;
    const starts: SearchableOption[] = [];
    const contains: SearchableOption[] = [];
    for (const option of options) {
      const label = fold(option.label);
      if (label.startsWith(q)) starts.push(option);
      else if (label.includes(q)) contains.push(option);
    }
    return [...starts, ...contains];
  }, [options, query]);

  const choose = (option: SearchableOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  };

  const scrollTo = (index: number) => {
    listRef.current?.children[index]?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = Math.min(highlight + 1, filtered.length - 1);
      setHighlight(next);
      scrollTo(next);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = Math.max(highlight - 1, 0);
      setHighlight(next);
      scrollTo(next);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) choose(option);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setHighlight(Math.max(0, options.findIndex((option) => option.value === value)));
        }
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label || placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).querySelector("input")?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
          {filtered.length ? (
            filtered.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-2 text-sm",
                  index === highlight && "bg-accent text-accent-foreground",
                )}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value ? <Check className="size-4 shrink-0" /> : null}
              </li>
            ))
          ) : (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
