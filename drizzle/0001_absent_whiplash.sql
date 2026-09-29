CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"guests" varchar(80) NOT NULL,
	"desired_date" varchar(32),
	"category" varchar(120) NOT NULL,
	"details" text,
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
