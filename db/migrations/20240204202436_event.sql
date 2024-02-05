-- migrate:up
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE TABLE public.event(
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
ALTER TABLE public.event
ADD CONSTRAINT "event_pkey" PRIMARY KEY ("transactionHash", "eventIndex");
CREATE TRIGGER mdt_event BEFORE
UPDATE ON event FOR EACH ROW EXECUTE PROCEDURE moddatetime ("updatedAt");
-- migrate:down
DROP TABLE public.event;
