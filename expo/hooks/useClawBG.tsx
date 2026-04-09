/**
 * useClawBG — Animated HTML background hook + components
 * Fetches active background from Supabase and renders it via WebView
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '@/lib/supabase';

// ── Fallback: pure black, no flicker ──────────────────────────────────────
const FALLBACK_HTML = `<!DOCTYPE html><html>
<head><meta name='viewport' content='width=device-width,initial-scale=1.0'></head>
<body style='margin:0;background:#000;width:100vw;height:100vh;overflow:hidden'></body>
</html>`;

// ── Hook ──────────────────────────────────────────────────────────────────
export function useClawBG() {
  const [html, setHtml] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchActive = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('clawbg_backgrounds')
        .select('html_content, updated_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('status', 'done')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.html_content) {
        setHtml(data.html_content);
      }
    } catch (e) {
      console.log('[ClawBG] fetch error:', e);
    }
  }, []);

  useEffect(() => {
    // Get user from existing session — don't wait for auth events
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;
      userIdRef.current = userId;

      // Initial fetch
      await fetchActive(userId);

      // Realtime — update live when agent pushes new background
      channelRef.current = supabase
        .channel(`clawbg-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clawbg_backgrounds',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as { is_active?: boolean; html_content?: string; status?: string };
            if (row?.is_active && row?.html_content && row?.status === 'done') {
              setHtml(row.html_content);
            }
          }
        )
        .subscribe();
    };

    init();

    // Also re-fetch whenever auth state changes (login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        fetchActive(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchActive]);

  return html;
}

// ── Wallpaper component ───────────────────────────────────────────────────
interface ClawBGWallpaperProps {
  style?: ViewStyle;
  opacity?: number;
}

export function ClawBGWallpaper({ style, opacity = 1 }: ClawBGWallpaperProps) {
  const html = useClawBG();

  return (
    <View
      style={[StyleSheet.absoluteFill, { opacity }, style]}
      pointerEvents="none"
    >
      <WebView
        source={{ html: html || FALLBACK_HTML }}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
        backgroundColor="transparent"
        applicationNameForUserAgent="ClawBG/1.0"
        mixedContentMode="always"
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={false}
        cacheEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        androidLayerType="hardware"
        originWhitelist={['*']}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess={false}
      />
    </View>
  );
}

// ── Full screen wrapper ───────────────────────────────────────────────────
export function ClawBGScreen({
  children,
  style,
  backgroundOpacity = 0.88,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundOpacity?: number;
}) {
  return (
    <View style={[{ flex: 1, backgroundColor: '#000' }, style]}>
      <ClawBGWallpaper opacity={backgroundOpacity} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
