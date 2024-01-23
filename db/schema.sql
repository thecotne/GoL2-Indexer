SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: event; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: balance; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.balance AS
 WITH transfers AS (
         SELECT ((event.content ->> 'to'::text))::numeric AS "to",
            ((event.content ->> 'from_'::text))::numeric AS "from",
            ((event.content ->> 'value'::text))::numeric AS value,
            event."createdAt"
           FROM public.event
          WHERE ((event.name)::text = 'Transfer'::text)
        ), incoming AS (
         SELECT transfers."to",
            sum(transfers.value) AS incoming_credits,
            min(transfers."createdAt") AS oldesttransaction,
            max(transfers."createdAt") AS newesttransaction
           FROM transfers
          GROUP BY transfers."to"
        ), outgoing AS (
         SELECT transfers."from",
            sum(transfers.value) AS outgoing_credits,
            min(transfers."createdAt") AS oldesttransaction,
            max(transfers."createdAt") AS newesttransaction
           FROM transfers
          GROUP BY transfers."from"
        )
 SELECT incoming."to" AS "userId",
    (incoming.incoming_credits - COALESCE(outgoing.outgoing_credits, (0)::numeric)) AS balance,
        CASE
            WHEN (incoming.oldesttransaction > outgoing.oldesttransaction) THEN outgoing.oldesttransaction
            ELSE incoming.oldesttransaction
        END AS "createdAt",
        CASE
            WHEN (incoming.newesttransaction < outgoing.newesttransaction) THEN outgoing.newesttransaction
            ELSE incoming.newesttransaction
        END AS "updatedAt"
   FROM (incoming
     LEFT JOIN outgoing ON ((incoming."to" = outgoing."from")))
  WHERE (incoming."to" <> '0'::numeric)
  WITH NO DATA;


--
-- Name: creator; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.creator AS
 SELECT "txHash" AS "transactionHash",
    name AS "transactionType",
    "eventIndex",
    ((content ->> 'user_id'::text))::numeric AS "transactionOwner",
    ((content ->> 'game_id'::text))::numeric AS "gameId",
    ((content ->> 'generation'::text))::numeric AS "gameGeneration",
    ((content ->> 'state'::text))::numeric AS "gameState",
        CASE
            WHEN (((content ->> 'state'::text))::numeric = (0)::numeric) THEN true
            ELSE false
        END AS "gameOver",
    "createdAt"
   FROM public.event
  WHERE (((name)::text = ANY (ARRAY[('game_evolved'::character varying)::text, ('game_created'::character varying)::text])) AND (((content ->> 'game_id'::text))::numeric <> '39132555273291485155644251043342963441664'::numeric))
  WITH NO DATA;


--
-- Name: infinite; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.infinite AS
 SELECT "txHash" AS "transactionHash",
    name AS "transactionType",
    "eventIndex",
    ((content ->> 'user_id'::text))::numeric AS "transactionOwner",
    ((content ->> 'generation'::text))::numeric AS "gameGeneration",
    ((content ->> 'state'::text))::numeric AS "gameState",
    ((content ->> 'cell_index'::text))::numeric AS "revivedCellIndex",
        CASE
            WHEN (((content ->> 'state'::text))::numeric = (0)::numeric) THEN true
            ELSE false
        END AS "gameExtinct",
    "createdAt"
   FROM public.event
  WHERE ((((name)::text = ANY (ARRAY[('game_evolved'::character varying)::text, ('game_created'::character varying)::text])) AND (((content ->> 'game_id'::text))::numeric = '39132555273291485155644251043342963441664'::numeric)) OR ((name)::text = 'cell_revived'::text))
  WITH NO DATA;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying(128) NOT NULL
);


--
-- Name: transaction; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: event PK_168407df0cd2c71680bf4287000; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT "PK_168407df0cd2c71680bf4287000" PRIMARY KEY ("txHash", "eventIndex");


--
-- Name: transaction PK_de4f0899c41c688529784bc443f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT "PK_de4f0899c41c688529784bc443f" PRIMARY KEY (hash);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: IDX_08f3024b3fad3c62274225faf9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_08f3024b3fad3c62274225faf9" ON public.transaction USING btree ("blockHash");


--
-- Name: IDX_0d681662b792661c819f8276a0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0d681662b792661c819f8276a0" ON public.transaction USING btree ("functionInputGameId");


--
-- Name: IDX_253f6b005b632dbac80cff5020; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_253f6b005b632dbac80cff5020" ON public.transaction USING btree ("updatedAt");


--
-- Name: IDX_32ad9e0d62211b679ebca15104; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_32ad9e0d62211b679ebca15104" ON public.transaction USING btree ("functionCaller");


--
-- Name: IDX_54dcd9578eb59a50d4095eae99; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_54dcd9578eb59a50d4095eae99" ON public.transaction USING btree ("functionName");


--
-- Name: IDX_63f749fc7f7178ae1ad85d3b95; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_63f749fc7f7178ae1ad85d3b95" ON public.transaction USING btree (status);


--
-- Name: IDX_7719a5dd0518e380f8911fb7ff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7719a5dd0518e380f8911fb7ff" ON public.transaction USING btree ("functionInputGameState");


--
-- Name: IDX_7f40575a1b279607e73504117e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7f40575a1b279607e73504117e" ON public.transaction USING btree ("functionInputCellIndex");


--
-- Name: IDX_83cb622ce2d74c56db3e0c29f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_83cb622ce2d74c56db3e0c29f1" ON public.transaction USING btree ("createdAt");


--
-- Name: IDX_b535fbe8ec6d832dde22065ebd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b535fbe8ec6d832dde22065ebd" ON public.event USING btree (name);


--
-- Name: balance_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "balance_userId_idx" ON public.balance USING btree ("userId");


--
-- Name: balance_userId_updatedAt_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "balance_userId_updatedAt_createdAt_idx" ON public.balance USING btree ("userId", "updatedAt", "createdAt");


--
-- Name: creator_transactionHash_eventIndex_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "creator_transactionHash_eventIndex_idx" ON public.creator USING btree ("transactionHash", "eventIndex");


--
-- Name: creator_transactionType_transactionOwner_gameId_createdAt_g_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "creator_transactionType_transactionOwner_gameId_createdAt_g_idx" ON public.creator USING btree ("transactionType", "transactionOwner", "gameId", "createdAt", "gameOver");


--
-- Name: infinite_transactionHash_eventIndex_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "infinite_transactionHash_eventIndex_idx" ON public.infinite USING btree ("transactionHash", "eventIndex");


--
-- Name: infinite_transactionType_transactionOwner_createdAt_gameExt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "infinite_transactionType_transactionOwner_createdAt_gameExt_idx" ON public.infinite USING btree ("transactionType", "transactionOwner", "createdAt", "gameExtinct");


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20240113081901');
