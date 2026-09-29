CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "s3_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"file_url" text NOT NULL,
	"alt" varchar(180) NOT NULL,
	"content_type" varchar(255),
	"user_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "s3_files_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signed_in" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
