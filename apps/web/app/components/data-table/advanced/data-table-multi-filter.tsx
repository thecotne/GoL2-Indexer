import {
  CopyIcon,
  DotsHorizontalIcon,
  TextAlignCenterIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import type { Table } from "@tanstack/react-table";
import * as React from "react";
import type { DataTableFilterOption } from "~/components/data-table/types";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { useDebounce } from "~/hooks/use-debounce";

import { useSearchParams } from "@remix-run/react";
import { DataTableFacetedFilter } from "../data-table-faceted-filter";

const operators = [
  {
    label: "And",
    value: "and",
  },
  {
    label: "Or",
    value: "or",
  },
];

interface DataTableMultiFilterProps<TData> {
  table: Table<TData>;
  allOptions: DataTableFilterOption<TData>[];
  options: DataTableFilterOption<TData>[];
  setSelectedOptions: React.Dispatch<
    React.SetStateAction<DataTableFilterOption<TData>[]>
  >;
}

export function DataTableMultiFilter<TData>({
  table,
  allOptions,
  options,
  setSelectedOptions,
}: DataTableMultiFilterProps<TData>) {
  const [open, setOpen] = React.useState(true);
  const [operator, setOperator] = React.useState<
    (typeof operators)[0] | undefined
  >(operators[0]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 truncate rounded-full"
        >
          <TextAlignCenterIcon className="mr-2 size-3" aria-hidden="true" />
          {options.length} rule
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0 text-xs" align="start">
        <div className="space-y-2 p-4">
          {options.map((option, i) => (
            <MultiFilterRow
              key={option.id ?? i}
              i={i}
              option={option}
              table={table}
              allOptions={allOptions}
              options={options}
              setSelectedOptions={setSelectedOptions}
              operator={operator}
              setOperator={setOperator}
            />
          ))}
        </div>
        <Separator />
        <div className="p-1">
          <Button
            aria-label="Delete filter"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              setSelectedOptions((prev) =>
                prev.filter((item) => !item.isMulti),
              );
            }}
          >
            Delete filter
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface MultiFilterRowProps<TData> extends DataTableMultiFilterProps<TData> {
  i: number;
  option: DataTableFilterOption<TData>;
  operator?: (typeof operators)[number];
  setOperator: React.Dispatch<
    React.SetStateAction<(typeof operators)[number] | undefined>
  >;
}

export function MultiFilterRow<TData>({
  i,
  table,
  option,
  allOptions,
  options,
  setSelectedOptions,
  operator,
  setOperator,
}: MultiFilterRowProps<TData>) {
  const [value, setValue] = React.useState("");
  const debounceValue = useDebounce(value, 500);

  const [selectedOption, setSelectedOption] = React.useState<
    DataTableFilterOption<TData> | undefined
  >(options[0]);

  const filterVarieties = selectedOption?.items.length
    ? ["is", "is not"]
    : ["contains", "does not contain", "is", "is not"];

  const [filterVariety, setFilterVariety] = React.useState(filterVarieties[0]);

  // Update filter variety
  React.useEffect(() => {
    if (selectedOption?.items.length) {
      setFilterVariety("is");
    }
  }, [selectedOption?.items.length]);

  const [, setSearchParams] = useSearchParams();

  // Update query string
  React.useEffect(() => {
    if (debounceValue.length > 0) {
      if (selectedOption?.value != null) {
        setSearchParams((searchParams) => {
          searchParams.set(
            selectedOption.value.toString(),
            `${debounceValue}${
              debounceValue.length > 0 ? `.${filterVariety}` : ""
            }`,
          );
          return searchParams;
        });
      }
    }

    if (debounceValue.length === 0) {
      if (selectedOption?.value != null) {
        setSearchParams((searchParams) => {
          searchParams.delete(selectedOption.value.toString());
          return searchParams;
        });
      }
    }
  }, [debounceValue, filterVariety, selectedOption?.value, setSearchParams]);

  // Update operator query string
  React.useEffect(() => {
    if (operator?.value) {
      setSearchParams((searchParams) => {
        searchParams.set("operator", operator.value);
        return searchParams;
      });
    }
  }, [operator?.value, setSearchParams]);

  return (
    <div className="flex items-center space-x-2">
      {i === 0 ? (
        <div>Where</div>
      ) : i === 1 ? (
        <Select
          value={operator?.value}
          onValueChange={(value) =>
            setOperator(operators.find((o) => o.value === value))
          }
        >
          <SelectTrigger className="h-8 w-fit text-xs">
            <SelectValue placeholder={operator?.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {operators.map((operator) => (
                <SelectItem
                  key={operator.value}
                  value={operator.value}
                  className="text-xs"
                >
                  {operator.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : (
        <div key={operator?.value}>{operator?.label}</div>
      )}
      <Select
        value={String(selectedOption?.value)}
        onValueChange={(value) => {
          setSelectedOption(
            allOptions.find((option) => option.value === value),
          );
          setSelectedOptions((prev) =>
            prev.map((item) => {
              if (item.id === option.id) {
                return {
                  ...item,
                  value,
                };
              }

              return item;
            }),
          );
        }}
      >
        <SelectTrigger className="h-8 w-full text-xs capitalize">
          <SelectValue placeholder={selectedOption?.label} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {allOptions.map((option) => (
              <SelectItem
                key={String(option.value)}
                value={String(option.value)}
                className="text-xs capitalize"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        value={filterVariety}
        onValueChange={(value) => setFilterVariety(value)}
      >
        <SelectTrigger className="h-8 w-full truncate px-2 py-0.5 hover:bg-muted/50">
          <SelectValue placeholder={filterVarieties[0]} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {filterVarieties.map((variety) => (
              <SelectItem key={variety} value={variety}>
                {variety}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {selectedOption?.items.length ? (
        table.getColumn(selectedOption.value ? String(option.value) : "") && (
          <DataTableFacetedFilter
            key={selectedOption.id}
            column={table.getColumn(
              selectedOption.value ? String(selectedOption.value) : "",
            )}
            title={selectedOption.label}
            options={selectedOption.items}
          />
        )
      ) : (
        <Input
          placeholder="Type here..."
          className="h-8"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          // autoFocus
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0">
            <DotsHorizontalIcon className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => {
              setSelectedOptions((prev) =>
                prev.filter((item) => item.id !== option.id),
              );
            }}
          >
            <TrashIcon className="mr-2 size-4" aria-hidden="true" />
            Remove
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSelectedOptions((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  label: String(selectedOption?.label),
                  value: String(selectedOption?.value),
                  isMulti: true,
                  items: selectedOption?.items ?? [],
                },
              ]);
            }}
          >
            <CopyIcon className="mr-2 size-4" aria-hidden="true" />
            Duplicate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
