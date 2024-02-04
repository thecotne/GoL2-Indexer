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
            WHEN ("blockIndex" IS NULL) THEN 'PENDING'::text
            ELSE 'ACCEPTED_ON_L2'::text
        END AS "txStatus",
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
            WHEN ("blockIndex" IS NULL) THEN 'PENDING'::text
            ELSE 'ACCEPTED_ON_L2'::text
        END AS "txStatus",
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


--
-- Name: event event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_pkey PRIMARY KEY ("txHash", "eventIndex");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: transaction transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_pkey PRIMARY KEY (hash);


--
-- Name: balance_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX balance_idx ON public.balance USING btree ("userId");


--
-- Name: creator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX creator_idx ON public.creator USING btree ("transactionHash", "eventIndex");


--
-- Name: infinite_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX infinite_idx ON public.infinite USING btree ("transactionHash", "eventIndex");


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20240113081901');
