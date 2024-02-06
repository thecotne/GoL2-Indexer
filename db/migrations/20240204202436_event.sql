-- migrate:up
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE TABLE public.event(
  "networkName" character varying NOT NULL,
  "contractAddress" character varying(65) NOT NULL,
  "blockHash" character varying(65),
  "blockIndex" integer,
  "transactionHash" character varying(65) NOT NULL,
  "transactionIndex" integer NOT NULL,
  "eventIndex" integer NOT NULL,
  "eventName" character varying NOT NULL,
  "eventData" jsonb NOT NULL,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
  "transferFrom" character varying(65) GENERATED ALWAYS AS ("eventData"->>'from') STORED,
  "transferTo" character varying(65) GENERATED ALWAYS AS ("eventData"->>'to') STORED,
  "transferAmount" numeric GENERATED ALWAYS AS (("eventData"->>'value')::numeric) STORED,
  "transactionOwner" character varying(65) GENERATED ALWAYS AS ("eventData"->>'user_id') STORED,
  "transactionStatus" character varying GENERATED ALWAYS AS (
    CASE
      "blockIndex"
      WHEN NULL THEN 'PENDING'
      ELSE 'ACCEPTED_ON_L2'
    END
  ) STORED,
  "gameId" character varying(65) GENERATED ALWAYS AS (
    CASE
      "eventName"
      WHEN 'CellRevived' THEN '0x7300100008000000000000000000000000'
      ELSE "eventData"->>'game_id'
    END
  ) STORED,
  "gameGeneration" numeric GENERATED ALWAYS AS (
    CASE
      "eventName"
      WHEN 'GameCreated' THEN 1
      WHEN 'GameEvolved' THEN ("eventData"->>'generation')::numeric
      WHEN 'CellRevived' THEN ("eventData"->>'generation')::numeric
      ELSE null
    END
  ) STORED,
  "gameState" numeric GENERATED ALWAYS AS (("eventData"->>'state')::numeric) STORED,
  "revivedCellIndex" numeric GENERATED ALWAYS AS (("eventData"->>'cell_index')::numeric) STORED,
  "gameOver" boolean GENERATED ALWAYS AS (("eventData"->>'state')::numeric = 0) STORED
);
CREATE INDEX "event_multi" ON public.event USING BTREE (
  "networkName",
  "contractAddress",
  "blockIndex",
  "transactionIndex",
  "eventIndex",
  "eventName",
  "gameGeneration"
);
CREATE INDEX "event_blockIndex" ON public.event USING BTREE ("blockIndex");
CREATE INDEX "event_eventIndex" ON public.event USING BTREE ("eventIndex");
CREATE INDEX "event_gameGeneration" ON public.event USING BTREE ("gameGeneration");
CREATE INDEX "event_networkName" ON public.event USING HASH ("networkName");
CREATE INDEX "event_contractAddress" ON public.event USING HASH ("contractAddress");
CREATE INDEX "event_blockHash" ON public.event USING HASH ("blockHash");
CREATE INDEX "event_transactionHash" ON public.event USING HASH ("transactionHash");
CREATE INDEX "event_eventName" ON public.event USING HASH ("eventName");
CREATE INDEX "event_gameId" ON public.event USING HASH ("gameId");
CREATE INDEX "event_gameOver" ON public.event USING HASH ("gameOver");
CREATE INDEX "event_transferFrom" ON public.event USING HASH ("transferFrom");
CREATE INDEX "event_transferTo" ON public.event USING HASH ("transferTo");
CREATE INDEX "event_transactionOwner" ON public.event USING HASH ("transactionOwner");
CREATE INDEX "event_transactionStatus" ON public.event USING HASH ("transactionStatus");

ALTER TABLE public.event
ADD CONSTRAINT "event_pkey" PRIMARY KEY (
    "networkName",
    "contractAddress",
    "transactionHash",
    "eventIndex"
  );
CREATE TRIGGER mdt_event BEFORE
UPDATE ON event FOR EACH ROW EXECUTE PROCEDURE moddatetime ("updatedAt");
-- migrate:down
DROP TABLE public.event;
