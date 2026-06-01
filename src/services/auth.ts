import { supabase } from './supabase';

export const authService = {
    getSession: async () => {
        if (!supabase) {
            return null;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
            return null;
        }

        return data.session;
    },

    signIn: async (email: string, password: string) => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        return supabase.auth.signInWithPassword({ email, password });
    },

    signUp: async (email: string, password: string, fullName: string, role: 'guest' | 'host' = 'host') => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        return supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role,
                },
            },
        });
    },

    signOut: async () => {
        if (!supabase) {
            return;
        }

        await supabase.auth.signOut();
    },
};
