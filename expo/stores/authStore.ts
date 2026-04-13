import { create } from "zustand";
import { combine } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import type { Session, Subscription, User } from "@supabase/supabase-js";

interface AuthStateData {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

interface AuthActionResult {
  error: string | null;
}

interface AuthStoreActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
}

export type AuthState = AuthStateData & AuthStoreActions;

const initialState: AuthStateData = {
  session: null,
  user: null,
  loading: true,
};

let authSubscription: Subscription | null = null;
let initializePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  combine(initialState, (set) => ({
    initialize: async () => {
      if (initializePromise) {
        await initializePromise;
        return;
      }

      initializePromise = (async () => {
        console.log("[auth] initialize:start");

        try {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.log("[auth] initialize:getSession:error", error.message);
          }

          set({
            session: data.session ?? null,
            user: data.session?.user ?? null,
            loading: false,
          });

          if (!authSubscription) {
            const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
              console.log("[auth] onAuthStateChange", event, nextSession?.user?.id ?? "anonymous");
              if (initializePromise) return;
              set({
                session: nextSession ?? null,
                user: nextSession?.user ?? null,
                loading: false,
              });
            });

            authSubscription = listener.subscription;
          }

          console.log("[auth] initialize:done", data.session?.user?.id ?? "anonymous");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown auth initialization error";
          console.log("[auth] initialize:failed", message);
          set({
            session: null,
            user: null,
            loading: false,
          });
        } finally {
          initializePromise = null;
        }
      })();

      await initializePromise;
    },

    signIn: async (email: string, password: string) => {
      console.log("[auth] signIn:start", email);

      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          console.log("[auth] signIn:error", error.message);
          return { error: error.message };
        }

        console.log("[auth] signIn:success", email);
        return { error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to sign in right now.";
        console.log("[auth] signIn:failed", message);
        return { error: message };
      }
    },

    signUp: async (email: string, password: string) => {
      console.log("[auth] signUp:start", email);

      try {
        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
          console.log("[auth] signUp:error", error.message);
          return { error: error.message };
        }

        console.log("[auth] signUp:success", email);
        return { error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create your account right now.";
        console.log("[auth] signUp:failed", message);
        return { error: message };
      }
    },

    signOut: async () => {
      console.log("[auth] signOut:start");

      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.log("[auth] signOut:error", error.message);
          return;
        }

        set({
          session: null,
          user: null,
          loading: false,
        });

        console.log("[auth] signOut:success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown sign out error";
        console.log("[auth] signOut:failed", message);
      }
    },
  }))
);
