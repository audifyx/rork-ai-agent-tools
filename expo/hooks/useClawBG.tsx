/**
 * useClawBG — React Native hook for animated HTML app backgrounds
 *
 * Drop <ClawBGWallpaper /> at the root of any screen to have the
 * agent-controlled HTML background render behind your UI.
 *
 * Usage:
 *   import { ClawBGWallpaper } from '@/hooks/useClawBG';
 *
 *   export default function MyScreen() {
 *     return (
 *       <View style={{ flex: 1 }}>
 *         <ClawBGWallpaper />
 *         <YourContent />
 *       </View>
 *     );
 *   }
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ClawBGBackground {
  id: string;
  name: string;
  type: 'preset' | 'generated' | 'custom';
  html_content: string;
  is_active: boolean;
  updated_at: string;
}

interface UseClawBGOptions {
  /** Poll for changes every N ms. Default: 30000 (30s). Set 0 to disable. */
  pollInterval?: number;
  /** Opacity of the background layer. Default: 1 */
  opacity?: number;
  /** Called when background changes */
  onUpdate?: (bg: ClawBGBackground | null) => void;
}

// ── Default fallback HTML (pure black, no flicker on load) ──
const FALLBACK_HTML = `<!DOCTYPE html><html>
<body style="margin:0;background:#000;width:100vw;height:100vh;overflow:hidden">
</body></html>`;

// ── Hook ───────────────────────────────────────────────────────────────────

export function useClawBG(options: UseClawBGOptions = {}) {
  const { pollInterval = 30000, onUpdate } = options;
  const [background, setBackground] = useState<ClawBGBackground | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUpdatedAt = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchActive = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: err } = await supabase
        .from('clawbg_backgrounds')
        .select('id, name, type, html_content, is_active, updated_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'done')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (err) throw err;

      // Only update if actually changed (avoid unnecessary re-renders)
      if (data && data.updated_at !== lastUpdatedAt.current) {
        lastUpdatedAt.current = data.updated_at;
        setBackground(data as ClawBGBackground);
        onUpdate?.(data as ClawBGBackground);
      } else if (!data && background) {
        setBackground(null);
        onUpdate?.(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load background');
    } finally {
      setLoading(false);
    }
  }, [onUpdate, background]);

  // Initial fetch
  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  // Realtime subscription — reacts instantly when agent changes bg
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channelRef.current = supabase
        .channel('clawbg-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clawbg_backgrounds',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Background changed — refetch active
            if (payload.new && (payload.new as ClawBGBackground).is_active) {
              fetchActive();
            } else if (payload.eventType === 'DELETE' || payload.old) {
              fetchActive();
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchActive]);

  // Optional polling fallback
  useEffect(() => {
    if (!pollInterval) return;
    const timer = setInterval(fetchActive, pollInterval);
    return () => clearInterval(timer);
  }, [pollInterval, fetchActive]);

  return { background, loading, error, refetch: fetchActive };
}

// ── Component ──────────────────────────────────────────────────────────────

interface ClawBGWallpaperProps {
  style?: ViewStyle;
  opacity?: number;
  /** Show loading state. Default: false (invisible until ready) */
  showLoading?: boolean;
}

export function ClawBGWallpaper({
  style,
  opacity = 1,
  showLoading = false,
}: ClawBGWallpaperProps) {
  const { background, loading } = useClawBG();
  const html = background?.html_content || FALLBACK_HTML;

  if (loading && !showLoading) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, style]} />
    );
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { opacity, backgroundColor: '#000' },
        style,
      ]}
      pointerEvents="none" // Clicks pass through to your UI
    >
      <WebView
        source={{ html }}
        style={StyleSheet.absoluteFill}
        scrollEnabled={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        androidLayerType="hardware"
        // Prevent any navigation
        onShouldStartLoadWithRequest={() => false}
        originWhitelist={['*']}
        // Performance
        javaScriptEnabled={true}
        domStorageEnabled={false}
        cacheEnabled={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        // Security
        allowFileAccess={false}
        allowsBackForwardNavigationGestures={false}
      />
    </View>
  );
}

// ── Full-screen background screen wrapper ──────────────────────────────────

/**
 * Wrap any screen with this to give it an animated agent background.
 *
 * Example:
 *   export default function HubScreen() {
 *     return (
 *       <ClawBGScreen style={{ flex: 1 }}>
 *         <Text>Content here</Text>
 *       </ClawBGScreen>
 *     );
 *   }
 */
export function ClawBGScreen({
  children,
  style,
  backgroundOpacity = 0.85,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundOpacity?: number;
}) {
  return (
    <View style={[{ flex: 1, backgroundColor: '#000' }, style]}>
      <ClawBGWallpaper opacity={backgroundOpacity} />
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
