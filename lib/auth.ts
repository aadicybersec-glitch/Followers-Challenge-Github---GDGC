import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
  if (session.user && token.sub) {
    session.user.id = token.sub; // no @ts-expect-error needed
  }
  return session;
}
,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
