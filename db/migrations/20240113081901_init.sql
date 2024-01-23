-- migrate:up
-- EVENT TABLE
CREATE TABLE public.event(
  "txHash" character varying(65) NOT NULL,
  "txFinalityStatus" character varying NOT NULL,
  "txExecutionStatus" character varying,
  "txIndex" integer NOT NULL,
  "blockHash" character varying(65),
  "blockIndex" integer,
  "eventIndex" integer NOT NULL,
  name character varying NOT NULL,
  content jsonb NOT NULL,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone
);
-- EVENT TABLE INDEXES
ALTER TABLE public.event
ADD CONSTRAINT "event_pkey" PRIMARY KEY ("txHash", "eventIndex");
-- BALANCE VIEW
CREATE MATERIALIZED VIEW public.balance AS (
  WITH transfers AS (
    SELECT (event.content->>'to')::numeric AS "to",
      (event.content->>'from_')::numeric AS "from",
      (event.content->>'value')::numeric AS value,
      event."createdAt"
    FROM public.event
    WHERE (event.name = 'Transfer')
  ),
  incoming AS (
    SELECT transfers."to",
      sum(transfers.value) AS incoming_credits,
      min(transfers."createdAt") AS oldesttransaction,
      max(transfers."createdAt") AS newesttransaction
    FROM transfers
    GROUP BY transfers."to"
  ),
  outgoing AS (
    SELECT transfers."from",
      sum(transfers.value) AS outgoing_credits,
      min(transfers."createdAt") AS oldesttransaction,
      max(transfers."createdAt") AS newesttransaction
    FROM transfers
    GROUP BY transfers."from"
  )
  SELECT incoming."to" AS "userId",
    (
      incoming.incoming_credits - COALESCE(outgoing.outgoing_credits,(0)::numeric)
    ) AS balance,
    CASE
      WHEN (
        incoming.oldesttransaction > outgoing.oldesttransaction
      ) THEN outgoing.oldesttransaction
      ELSE incoming.oldesttransaction
    END AS "createdAt",
    CASE
      WHEN (
        incoming.newesttransaction < outgoing.newesttransaction
      ) THEN outgoing.newesttransaction
      ELSE incoming.newesttransaction
    END AS "updatedAt"
  FROM (
      incoming
      LEFT JOIN outgoing ON (incoming."to" = outgoing."from")
    )
  WHERE (incoming."to" <> '0'::numeric)
) WITH NO DATA;
-- BALANCE VIEW INDEXES
CREATE UNIQUE INDEX "balance_idx" ON public.balance USING btree("userId");
-- CREATOR VIEW
CREATE MATERIALIZED VIEW public.creator AS(
  SELECT event."txHash" AS "transactionHash",
    event.name AS "transactionType",
    event."txFinalityStatus",
    event."txExecutionStatus",
    event."eventIndex",
    (event.content->>'user_id')::numeric AS "transactionOwner",
    (event.content->>'game_id')::numeric AS "gameId",
    (event.content->>'generation')::numeric AS "gameGeneration",
    (event.content->>'state')::numeric AS "gameState",
    CASE
      WHEN (
        (event.content->>'state')::numeric =(0)::numeric
      ) THEN TRUE
      ELSE FALSE
    END AS "gameOver",
    event."createdAt"
  FROM public.event
  WHERE (
      (
        (event.name)::text = ANY (
          (
            ARRAY ['game_evolved'::character varying, 'game_created'::character varying]
          )::text []
        )
      )
      AND (
        (event.content->>'game_id')::numeric <> '39132555273291485155644251043342963441664'::numeric
      )
    )
) WITH NO DATA;
-- CREATOR VIEW INDEXES
CREATE UNIQUE INDEX "creator_idx" ON public.creator USING btree("transactionHash", "eventIndex");
-- INFINITE VIEW
CREATE MATERIALIZED VIEW public.infinite AS(
  SELECT event."txHash" AS "transactionHash",
    event.name AS "transactionType",
    event."txFinalityStatus",
    event."txExecutionStatus",
    event."eventIndex",
    (event.content->>'user_id')::numeric AS "transactionOwner",
    (event.content->>'generation')::numeric AS "gameGeneration",
    (event.content->>'state')::numeric AS "gameState",
    (event.content->>'cell_index')::numeric AS "revivedCellIndex",
    CASE
      WHEN (
        (event.content->>'state')::numeric =(0)::numeric
      ) THEN TRUE
      ELSE FALSE
    END AS "gameExtinct",
    event."createdAt"
  FROM public.event
  WHERE (
      (
        (
          (event.name)::text = ANY (
            (
              ARRAY ['game_evolved'::character varying, 'game_created'::character varying]
            )::text []
          )
        )
        AND (
          (event.content->>'game_id')::numeric = '39132555273291485155644251043342963441664'::numeric
        )
      )
      OR ((event.name)::text = 'cell_revived'::text)
    )
) WITH NO DATA;
-- INFINITE VIEW INDEXES
CREATE UNIQUE INDEX "infinite_idx" ON public.infinite USING btree("transactionHash", "eventIndex");
-- TRANSACTION TABLE
CREATE TABLE public.transaction(
  hash character varying(65) NOT NULL PRIMARY KEY,
  "finalityStatus" character varying NOT NULL,
  "executionStatus" character varying,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone,
  "functionName" character varying NOT NULL,
  "functionCaller" numeric NOT NULL,
  "functionInputCellIndex" integer,
  "functionInputGameState" numeric,
  "functionInputGameId" numeric
);

-- migrate:down
DROP TABLE public.event;
DROP MATERIALIZED VIEW public.balance;
DROP MATERIALIZED VIEW public.creator;
DROP MATERIALIZED VIEW public.infinite;
DROP TABLE public.transaction;
-- DROP INDEX IF EXISTS "IDX_08f3024b3fad3c62274225faf9";
