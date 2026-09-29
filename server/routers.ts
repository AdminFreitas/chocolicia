import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createOrder, createS3File, listS3Files } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  orders: router({
    create: publicProcedure.input(z.object({
      name: z.string().trim().min(2).max(160),
      eventType: z.string().trim().min(2).max(120),
      guests: z.string().trim().min(1).max(80),
      desiredDate: z.string().max(32).optional(),
      category: z.string().trim().min(2).max(120),
      details: z.string().max(4000).optional(),
    })).mutation(({ input }) => createOrder({ ...input, desiredDate: input.desiredDate || null, details: input.details || null })),
  }),

  catalog: router({
    list: publicProcedure.query(async () => {
      const files = await listS3Files();
      return Promise.all(files.map(async (file) => ({ ...file, url: await storageGetSignedUrl(file.objectKey) })));
    }),
    upload: adminProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(180),
      contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
      dataBase64: z.string().min(1).max(8_000_000),
      alt: z.string().trim().min(2).max(180),
    })).mutation(async ({ input, ctx }) => {
      const data = Buffer.from(input.dataBase64, "base64");
      if (data.byteLength > 6 * 1024 * 1024) throw new Error("Image must be 6MB or smaller");
      const stored = await storagePut(`catalog/${input.fileName}`, data, input.contentType);
      return createS3File({ objectKey: stored.key, fileUrl: stored.url, alt: input.alt, contentType: input.contentType, userId: ctx.user.openId });
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
