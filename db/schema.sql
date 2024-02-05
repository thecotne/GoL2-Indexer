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
    "blockHash" character varying(65),
    "blockIndex" integer,
    "transactionHash" character varying(65) NOT NULL,
    "transactionIndex" integer NOT NULL,
    "eventIndex" integer NOT NULL,
    "eventName" character varying NOT NULL,
    "eventData" jsonb NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: transfer_events; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.transfer_events AS
 SELECT ("eventData" ->> 'from'::text) AS "transferFrom",
    ("eventData" ->> 'to'::text) AS "transferTo",
    (("eventData" ->> 'value'::text))::numeric AS "transferAmount",
    "blockHash",
    "blockIndex",
    "transactionHash",
    "transactionIndex",
    "eventIndex",
    "createdAt",
    "updatedAt"
   FROM public.event
  WHERE (("eventName")::text = 'Transfer'::text)
  ORDER BY "blockIndex" DESC, "transactionIndex" DESC, "eventIndex" DESC;


--
-- Name: balance_events; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.balance_events AS
 SELECT transfer_events."transferTo" AS "userId",
    transfer_events."transferAmount" AS balance,
    transfer_events."blockHash",
    transfer_events."blockIndex",
    transfer_events."transactionHash",
    transfer_events."transactionIndex",
    transfer_events."eventIndex",
    transfer_events."createdAt",
    transfer_events."updatedAt"
   FROM public.transfer_events
UNION ALL
 SELECT transfer_events."transferFrom" AS "userId",
    ((0)::numeric - transfer_events."transferAmount") AS balance,
    transfer_events."blockHash",
    transfer_events."blockIndex",
    transfer_events."transactionHash",
    transfer_events."transactionIndex",
    transfer_events."eventIndex",
    transfer_events."createdAt",
    transfer_events."updatedAt"
   FROM public.transfer_events;


--
-- Name: balance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.balance AS
 SELECT "userId",
    sum(balance) AS balance
   FROM public.balance_events
  GROUP BY "userId";


--
-- Name: game_events; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.game_events AS
 SELECT "blockHash",
    "blockIndex",
    "transactionHash",
    "transactionIndex",
    ("eventData" ->> 'user_id'::text) AS "transactionOwner",
        CASE "blockIndex"
            WHEN NULL::integer THEN 'PENDING'::text
            ELSE 'ACCEPTED_ON_L2'::text
        END AS "transactionStatus",
    "eventIndex",
    "eventName",
    "eventData",
    "createdAt",
    "updatedAt",
        CASE
            WHEN ("eventData" ? 'game_id'::text) THEN ("eventData" ->> 'game_id'::text)
            ELSE '0x7300100008000000000000000000000000'::text
        END AS "gameId",
        CASE
            WHEN ("eventData" ? 'generation'::text) THEN (("eventData" ->> 'generation'::text))::numeric
            ELSE (1)::numeric
        END AS "gameGeneration",
    (("eventData" ->> 'state'::text))::numeric AS "gameState",
    (("eventData" ->> 'cell_index'::text))::numeric AS "revivedCellIndex",
    ((("eventData" ->> 'state'::text))::numeric = (0)::numeric) AS "gameOver"
   FROM public.event
  WHERE (("eventName")::text = ANY ((ARRAY['GameCreated'::character varying, 'GameEvolved'::character varying, 'CellRevived'::character varying])::text[]))
  ORDER BY "blockIndex" DESC, "transactionIndex" DESC, "eventIndex" DESC;


--
-- Name: game_state; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.game_state AS
 SELECT "gameId",
    "gameGeneration",
    "gameState",
    ("gameState" = (0)::numeric) AS "gameOver",
    ( SELECT jsonb_agg(jsonb_build_object('cell_index', rci."revivedCellIndex", 'user_id', rci."transactionOwner")) AS jsonb_agg
           FROM public.game_events rci
          WHERE ((rci."gameId" = e."gameId") AND (rci."gameGeneration" = e."gameGeneration") AND ((rci."eventName")::text = 'CellRevived'::text))) AS "revivedCells"
   FROM public.game_events e
  WHERE (("eventName")::text = ANY ((ARRAY['GameCreated'::character varying, 'GameEvolved'::character varying])::text[]))
  ORDER BY "blockIndex" DESC, "transactionIndex" DESC, "eventIndex" DESC;


--
-- Name: game; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.game AS
 SELECT DISTINCT ON ("gameId") "gameId",
    "gameGeneration",
    "gameState",
    "gameOver",
    "revivedCells"
   FROM public.game_state
  ORDER BY "gameId", "gameGeneration" DESC;


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
    ADD CONSTRAINT event_pkey PRIMARY KEY ("transactionHash", "eventIndex");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


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
