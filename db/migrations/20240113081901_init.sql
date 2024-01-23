-- migrate:up
CREATE TABLE public.event (
  "txHash" character varying(65) NOT NULL,
  "txIndex" integer NOT NULL,
  "blockHash" character varying(65),
  "blockIndex" integer,
  "eventIndex" integer NOT NULL,
  name character varying NOT NULL,
  content jsonb NOT NULL,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone
);
CREATE MATERIALIZED VIEW public.balance AS WITH transfers AS (
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
    incoming.incoming_credits - COALESCE(outgoing.outgoing_credits, (0)::numeric)
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
    LEFT JOIN outgoing ON ((incoming."to" = outgoing."from"))
  )
WHERE (incoming."to" <> '0'::numeric) WITH NO DATA;
CREATE MATERIALIZED VIEW public.creator AS
SELECT event."txHash" AS "transactionHash",
  event.name AS "transactionType",
  event."eventIndex",
  (event.content->>'user_id')::numeric AS "transactionOwner",
  (event.content->>'game_id')::numeric AS "gameId",
  (event.content->>'generation')::numeric AS "gameGeneration",
  (event.content->>'state')::numeric AS "gameState",
  CASE
    WHEN (
      (event.content->>'state')::numeric = (0)::numeric
    ) THEN true
    ELSE false
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
  ) WITH NO DATA;
CREATE MATERIALIZED VIEW public.infinite AS
SELECT event."txHash" AS "transactionHash",
  event.name AS "transactionType",
  event."eventIndex",
  (event.content->>'user_id')::numeric AS "transactionOwner",
  (event.content->>'generation')::numeric AS "gameGeneration",
  (event.content->>'state')::numeric AS "gameState",
  (event.content->>'cell_index')::numeric AS "revivedCellIndex",
  CASE
    WHEN (
      (event.content->>'state')::numeric = (0)::numeric
    ) THEN true
    ELSE false
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
  ) WITH NO DATA;
CREATE TABLE public.transaction (
  hash character varying(65) NOT NULL,
  "blockHash" character varying(65),
  status character varying NOT NULL,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone,
  "functionName" character varying NOT NULL,
  "functionCaller" numeric NOT NULL,
  "functionInputCellIndex" integer,
  "functionInputGameState" numeric,
  "functionInputGameId" numeric
);
ALTER TABLE ONLY public.event
ADD CONSTRAINT "PK_168407df0cd2c71680bf4287000" PRIMARY KEY ("txHash", "eventIndex");
ALTER TABLE ONLY public.transaction
ADD CONSTRAINT "PK_de4f0899c41c688529784bc443f" PRIMARY KEY (hash);
CREATE INDEX "IDX_08f3024b3fad3c62274225faf9" ON public.transaction USING btree ("blockHash");
CREATE INDEX "IDX_0d681662b792661c819f8276a0" ON public.transaction USING btree ("functionInputGameId");
CREATE INDEX "IDX_253f6b005b632dbac80cff5020" ON public.transaction USING btree ("updatedAt");
CREATE INDEX "IDX_32ad9e0d62211b679ebca15104" ON public.transaction USING btree ("functionCaller");
CREATE INDEX "IDX_54dcd9578eb59a50d4095eae99" ON public.transaction USING btree ("functionName");
CREATE INDEX "IDX_63f749fc7f7178ae1ad85d3b95" ON public.transaction USING btree (status);
CREATE INDEX "IDX_7719a5dd0518e380f8911fb7ff" ON public.transaction USING btree ("functionInputGameState");
CREATE INDEX "IDX_7f40575a1b279607e73504117e" ON public.transaction USING btree ("functionInputCellIndex");
CREATE INDEX "IDX_83cb622ce2d74c56db3e0c29f1" ON public.transaction USING btree ("createdAt");
CREATE INDEX "IDX_b535fbe8ec6d832dde22065ebd" ON public.event USING btree (name);
CREATE UNIQUE INDEX "balance_userId_idx" ON public.balance USING btree ("userId");
CREATE INDEX "balance_userId_updatedAt_createdAt_idx" ON public.balance USING btree ("userId", "updatedAt", "createdAt");
CREATE UNIQUE INDEX "creator_transactionHash_eventIndex_idx" ON public.creator USING btree ("transactionHash", "eventIndex");
CREATE INDEX "creator_transactionType_transactionOwner_gameId_createdAt_g_idx" ON public.creator USING btree (
  "transactionType",
  "transactionOwner",
  "gameId",
  "createdAt",
  "gameOver"
);
CREATE UNIQUE INDEX "infinite_transactionHash_eventIndex_idx" ON public.infinite USING btree ("transactionHash", "eventIndex");
CREATE INDEX "infinite_transactionType_transactionOwner_createdAt_gameExt_idx" ON public.infinite USING btree (
  "transactionType",
  "transactionOwner",
  "createdAt",
  "gameExtinct"
);
-- migrate:down
