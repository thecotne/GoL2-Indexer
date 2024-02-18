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

--
-- Name: moddatetime; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA public;


--
-- Name: EXTENSION moddatetime; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION moddatetime IS 'functions for tracking last modification time';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event (
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
    "transferFrom" character varying(65) GENERATED ALWAYS AS (("eventData" ->> 'from'::text)) STORED,
    "transferTo" character varying(65) GENERATED ALWAYS AS (("eventData" ->> 'to'::text)) STORED,
    "transferAmount" numeric GENERATED ALWAYS AS ((("eventData" ->> 'value'::text))::numeric) STORED,
    "transactionOwner" character varying(65) GENERATED ALWAYS AS (("eventData" ->> 'user_id'::text)) STORED,
    "transactionStatus" character varying GENERATED ALWAYS AS (
CASE "blockIndex"
    WHEN NULL::integer THEN 'PENDING'::text
    ELSE 'ACCEPTED_ON_L2'::text
END) STORED,
    "gameId" character varying(65) GENERATED ALWAYS AS (
CASE "eventName"
    WHEN 'CellRevived'::text THEN '0x7300100008000000000000000000000000'::text
    ELSE ("eventData" ->> 'game_id'::text)
END) STORED,
    "gameGeneration" numeric GENERATED ALWAYS AS (
CASE "eventName"
    WHEN 'GameCreated'::text THEN (1)::numeric
    WHEN 'GameEvolved'::text THEN (("eventData" ->> 'generation'::text))::numeric
    WHEN 'CellRevived'::text THEN (("eventData" ->> 'generation'::text))::numeric
    ELSE NULL::numeric
END) STORED,
    "gameState" numeric GENERATED ALWAYS AS ((("eventData" ->> 'state'::text))::numeric) STORED,
    "revivedCellIndex" numeric GENERATED ALWAYS AS ((("eventData" ->> 'cell_index'::text))::numeric) STORED,
    "gameOver" boolean GENERATED ALWAYS AS (((("eventData" ->> 'state'::text))::numeric = (0)::numeric)) STORED
);


--
-- Name: balance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.balance AS
 SELECT sum(balance) AS balance,
    "userId",
    "networkName",
    "contractAddress"
   FROM ( SELECT sum(event."transferAmount") AS balance,
            event."transferTo" AS "userId",
            event."networkName",
            event."contractAddress"
           FROM public.event
          WHERE ((event."eventName")::text = 'Transfer'::text)
          GROUP BY event."transferTo", event."networkName", event."contractAddress"
        UNION ALL
         SELECT sum(((0)::numeric - event."transferAmount")) AS balance,
            event."transferFrom" AS "userId",
            event."networkName",
            event."contractAddress"
           FROM public.event
          WHERE ((event."eventName")::text = 'Transfer'::text)
          GROUP BY event."transferFrom", event."networkName", event."contractAddress") unnamed_subquery
  GROUP BY "userId", "networkName", "contractAddress";


--
-- Name: game_current_generation; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.game_current_generation AS
 SELECT max("gameGeneration") AS "gameGeneration",
    "networkName",
    "contractAddress",
    "gameId"
   FROM public.event
  GROUP BY "networkName", "contractAddress", "gameId";


--
-- Name: game_revived_cells; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.game_revived_cells AS
 SELECT "networkName",
    "contractAddress",
    "gameGeneration",
    array_agg("revivedCellIndex") AS "revivedCellIndexes",
    array_agg("transactionOwner") AS "revivedCellOwners"
   FROM public.event
  WHERE (("eventName")::text = 'CellRevived'::text)
  GROUP BY "networkName", "contractAddress", "gameGeneration";


--
-- Name: game_state; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.game_state AS
 SELECT e."networkName",
    e."contractAddress",
    e."blockHash",
    e."blockIndex",
    e."transactionHash",
    e."transactionIndex",
    e."eventIndex",
    e."eventName",
    e."eventData",
    e."createdAt",
    e."updatedAt",
    e."transferFrom",
    e."transferTo",
    e."transferAmount",
    e."transactionOwner",
    e."transactionStatus",
    e."gameId",
    e."gameGeneration",
    e."gameState",
    e."revivedCellIndex",
    e."gameOver",
    r."revivedCellIndexes",
    r."revivedCellOwners"
   FROM (public.event e
     LEFT JOIN public.game_revived_cells r ON ((((e."gameId")::text = '0x7300100008000000000000000000000000'::text) AND ((e."networkName")::text = (r."networkName")::text) AND ((e."contractAddress")::text = (r."contractAddress")::text) AND (e."gameGeneration" = r."gameGeneration"))))
  WHERE ((e."eventName")::text = ANY (ARRAY[('GameCreated'::character varying)::text, ('GameEvolved'::character varying)::text]))
  ORDER BY e."blockIndex" DESC, e."transactionIndex" DESC, e."eventIndex" DESC;


--
-- Name: game; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.game AS
 SELECT e."networkName",
    e."contractAddress",
    e."gameId",
    e."transactionOwner" AS "gameOwner",
    s."gameGeneration",
    s."gameState",
    s."gameOver",
    s."blockIndex",
    s."transactionIndex",
    s."eventIndex",
    s."revivedCellIndexes",
    s."revivedCellOwners"
   FROM ((public.event e
     JOIN public.game_current_generation g ON ((((g."networkName")::text = (e."networkName")::text) AND ((g."contractAddress")::text = (e."contractAddress")::text) AND ((g."gameId")::text = (e."gameId")::text))))
     JOIN public.game_state s ON ((((s."networkName")::text = (e."networkName")::text) AND ((s."contractAddress")::text = (e."contractAddress")::text) AND ((s."gameId")::text = (e."gameId")::text) AND (s."gameGeneration" = g."gameGeneration"))))
  WHERE ((e."eventName")::text = 'GameCreated'::text)
  ORDER BY s."blockIndex" DESC, s."transactionIndex" DESC, s."eventIndex" DESC;


--
-- Name: game_event; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.game_event AS
 SELECT "networkName",
    "contractAddress",
    "blockHash",
    "blockIndex",
    "transactionHash",
    "transactionIndex",
    "eventIndex",
    "eventName",
    "eventData",
    "createdAt",
    "updatedAt",
    "transferFrom",
    "transferTo",
    "transferAmount",
    "transactionOwner",
    "transactionStatus",
    "gameId",
    "gameGeneration",
    "gameState",
    "revivedCellIndex",
    "gameOver"
   FROM public.event e
  WHERE (("eventName")::text = ANY (ARRAY[('GameCreated'::character varying)::text, ('GameEvolved'::character varying)::text, ('CellRevived'::character varying)::text]))
  ORDER BY "blockIndex" DESC, "transactionIndex" DESC, "eventIndex" DESC;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying(128) NOT NULL
);


--
-- Name: event event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_pkey PRIMARY KEY ("networkName", "contractAddress", "transactionHash", "eventIndex");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: event_blockHash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_blockHash" ON public.event USING hash ("blockHash");


--
-- Name: event_blockIndex; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_blockIndex" ON public.event USING btree ("blockIndex");


--
-- Name: event_contractAddress; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_contractAddress" ON public.event USING hash ("contractAddress");


--
-- Name: event_eventIndex; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_eventIndex" ON public.event USING btree ("eventIndex");


--
-- Name: event_eventName; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_eventName" ON public.event USING hash ("eventName");


--
-- Name: event_gameGeneration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_gameGeneration" ON public.event USING btree ("gameGeneration");


--
-- Name: event_gameId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_gameId" ON public.event USING hash ("gameId");


--
-- Name: event_gameOver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_gameOver" ON public.event USING hash ("gameOver");


--
-- Name: event_multi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_multi ON public.event USING btree ("networkName", "contractAddress", "blockIndex", "transactionIndex", "eventIndex", "eventName", "gameGeneration");


--
-- Name: event_networkName; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_networkName" ON public.event USING hash ("networkName");


--
-- Name: event_transactionHash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_transactionHash" ON public.event USING hash ("transactionHash");


--
-- Name: event_transactionOwner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_transactionOwner" ON public.event USING hash ("transactionOwner");


--
-- Name: event_transactionStatus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_transactionStatus" ON public.event USING hash ("transactionStatus");


--
-- Name: event_transferFrom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_transferFrom" ON public.event USING hash ("transferFrom");


--
-- Name: event_transferTo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_transferTo" ON public.event USING hash ("transferTo");


--
-- Name: event mdt_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER mdt_event BEFORE UPDATE ON public.event FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updatedAt');


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20240204202436'),
    ('20240204202447'),
    ('20240204204718');
