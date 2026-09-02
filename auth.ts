import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
    maxAge: 365 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
});
