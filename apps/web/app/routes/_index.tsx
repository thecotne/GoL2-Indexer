import type { MetaFunction, SerializeFrom } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Jsonify } from "@remix-run/server-runtime/dist/jsonify";
import {
  CellContext,
  ColumnDef,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { DataTable } from "~/components/data-table/data-table";
import { DataTableColumnHeader } from "~/components/data-table/data-table-column-header";
import { DataTableSearchableColumn } from "~/components/data-table/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { contracts, db } from "~/env.server";
import { Event } from "~/schemas/public/Event";

export const meta: MetaFunction = () => {
  return [
    { title: "GoL2" },
    { name: "description", content: "Game of Life 2" },
  ];
};

function LongTextCell(props: CellContext<SerializeFrom<Event>, unknown>) {
  const value = props.cell.getValue();

  if (typeof value !== "string") {
    return value;
  }

  if (value.length < 10) {
    return value;
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        {value.slice(0, 6)}...{value.slice(-4)}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function JSONCell(props: CellContext<SerializeFrom<Event>, unknown>) {
  const value = props.cell.getValue();

  if (typeof value !== "object") {
    return value;
  }

  return (
    <Tooltip>
      <TooltipTrigger>{JSON.stringify(value).slice(0, 6)}...</TooltipTrigger>
      <TooltipContent>
        <pre>{JSON.stringify(value, null, 2)}</pre>
      </TooltipContent>
    </Tooltip>
  );
}

export const columns = [
  {
    meta: { title: "Network" },
    accessorKey: "networkName",
  },
  {
    meta: { title: "Contract Address" },
    accessorKey: "contractAddress",
    cell: LongTextCell,
  },
  {
    meta: { title: "Block Hash" },
    accessorKey: "blockHash",
    cell: LongTextCell,
  },
  {
    meta: { title: "Block Index" },
    accessorKey: "blockIndex",
  },
  {
    meta: { title: "Transaction Hash" },
    accessorKey: "transactionHash",
    cell: LongTextCell,
  },
  {
    meta: { title: "Transaction Index" },
    accessorKey: "transactionIndex",
  },
  {
    meta: { title: "Event Index" },
    accessorKey: "eventIndex",
  },
  {
    meta: { title: "Event Name" },
    accessorKey: "eventName",
  },
  {
    meta: { title: "Event Data" },
    accessorKey: "eventData",
    cell: JSONCell,
  },
  {
    meta: { title: "Created At" },
    accessorKey: "createdAt",
  },
  {
    meta: { title: "Updated At" },
    accessorKey: "updatedAt",
  },
  {
    meta: { title: "Transfer From" },
    accessorKey: "transferFrom",
    cell: LongTextCell,
  },
  {
    meta: { title: "Transfer To" },
    accessorKey: "transferTo",
    cell: LongTextCell,
  },
  {
    meta: { title: "Transfer Amount" },
    accessorKey: "transferAmount",
  },
  {
    meta: { title: "Transaction Owner" },
    accessorKey: "transactionOwner",
    cell: LongTextCell,
  },
  {
    meta: { title: "Transaction Status" },
    accessorKey: "transactionStatus",
    enableSorting: true,
  },
  {
    meta: { title: "Game ID" },
    accessorKey: "gameId",
  },
  {
    meta: { title: "Game Generation" },
    accessorKey: "gameGeneration",
  },
  {
    meta: { title: "Game State" },
    accessorKey: "gameState",
  },
  {
    meta: { title: "Revived Cell Index" },
    accessorKey: "revivedCellIndex",
  },
  {
    meta: { title: "Game Over" },
    accessorKey: "gameOver",
  },
] as const satisfies ColumnDef<Jsonify<Event>>[];

export async function loader() {
  const events = await db.selectFrom("event").selectAll().limit(50).execute();
  const filterableColumns = [
    {
      id: "networkName",
      title: "Network",
      options: [
        { label: "SN_GOERLI", value: "SN_GOERLI" },
        { label: "SN_MAINNET", value: "SN_MAINNET" },
      ],
    },
    {
      id: "contractAddress",
      title: "Contract Address",
      options: contracts.map((contract) => ({
        label: `${contract.contractAddress.slice(
          0,
          6,
        )}...${contract.contractAddress.slice(-4)}`,
        value: contract.contractAddress,
      })),
    },
    {
      id: "transactionStatus",
      title: "Transaction Status",
      options: [
        { label: "PENDING", value: "PENDING" },
        { label: "ACCEPTED_ON_L2", value: "ACCEPTED_ON_L2" },
      ],
    },
  ] as const;

  return json({
    events,
    filterableColumns,
  });
}

export default function Index() {
  const { events, filterableColumns } = useLoaderData<typeof loader>();
  const searchableColumns: DataTableSearchableColumn<Jsonify<Event>>[] = [];
  const [tableState, setTableState] = React.useState({});

  const table = useReactTable({
    data: events,
    columns,
    defaultColumn: {
      sortUndefined: -1,
      filterFn: "arrIncludesSome",
      meta: {},
      header: (headerContext) => {
        const { title } = headerContext.column.columnDef.meta as {
          title?: string;
        };

        return (
          <DataTableColumnHeader
            column={headerContext.column}
            title={title ?? headerContext.column.id}
          />
        );
      },
    },
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onStateChange(updater) {
      setTableState(updater);
    },
    state: tableState,
    manualPagination: true,
  });

  return (
    <div className="p-4">
      <DataTable
        table={table}
        columns={columns}
        searchableColumns={searchableColumns}
        filterableColumns={filterableColumns}
        // floatingBarContent={TasksTableFloatingBarContent(table)}
        // deleteRowsAction={(event) => deleteSelectedRows({ table, event })}
      />
    </div>
  );
}
