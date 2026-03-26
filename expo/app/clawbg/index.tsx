/**
 * ClawBG Screen — Manage and preview agent-controlled backgrounds
 * Route: /clawbg/index.tsx
 */

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '@/lib/supabase';
import colors from '@/constants/colors';

// ── Types ──────────────────────────────────────────────────────────────────

interface Background {
  id: string;
  name: string;
  type: 'preset' | 'generated' | 'custom';
  prompt?: string;
  is_active: boolean;
  status: string;
  created_at: string;
}

interface Preset {
  name: string;
  description: string;
}

// ── API helper ─────────────────────────────────────────────────────────────

async function callClawBG(action: string, params: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Get master key from vault
  const { data: keyData } = await supabase
    .from('master_api_keys')
    .select('key_value')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!keyData) throw new Error('No active master key. Create one in Settings.');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const resp = await fetch(`${supabaseUrl}/functions/v1/clawbg-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${keyData.key_value}`,
    },
    body: JSON.stringify({ action, params }),
  });

  const json = await resp.json();
  if (!json.success) throw new Error(json.error || 'ClawBG error');
  return json.data;
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function ClawBGScreen() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [activeHtml, setActiveHtml] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [tab, setTab] = useState<'presets' | 'saved' | 'generate'>('presets');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [presetsData, listData, activeData] = await Promise.all([
        callClawBG('list_presets'),
        callClawBG('list'),
        callClawBG('get_active'),
      ]);
      setPresets(presetsData.presets);
      setBackgrounds(listData.backgrounds);
      if (activeData?.html_content) setActiveHtml(activeData.html_content);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function applyPreset(preset: string) {
    try {
      await callClawBG('set_preset', { preset });
      await loadAll();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  }

  async function generateBackground() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      await callClawBG('generate', { prompt: prompt.trim(), set_active: true });
      setPrompt('');
      await loadAll();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function activateBg(id: string) {
    try {
      await callClawBG('activate', { bg_id: id });
      await loadAll();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  }

  async function deleteBg(id: string, name: string) {
    Alert.alert('Delete', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await callClawBG('delete', { bg_id: id });
            await loadAll();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Loading ClawBG...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>

      {/* Live preview of current active background */}
      {activeHtml && (
        <View style={styles.livePreview}>
          <WebView
            source={{ html: previewHtml || activeHtml }}
            style={StyleSheet.absoluteFill}
            scrollEnabled={false}
            javaScriptEnabled
            pointerEvents="none"
          />
          <View style={styles.liveOverlay}>
            <Text style={styles.liveLabel}>● LIVE</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['presets', 'saved', 'generate'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'presets' ? '⚡ Presets' : t === 'saved' ? '💾 Saved' : '✨ Generate'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── PRESETS TAB ── */}
        {tab === 'presets' && (
          <View>
            <Text style={styles.sectionTitle}>Built-in Backgrounds</Text>
            <Text style={styles.sectionSub}>Tap to apply instantly. Your agent can use these too.</Text>
            <View style={styles.presetGrid}>
              {presets.map(p => (
                <TouchableOpacity
                  key={p.name}
                  style={styles.presetCard}
                  onPress={() => applyPreset(p.name)}
                  onLongPress={() => setPreviewHtml(null)} // reset preview on long press
                >
                  <Text style={styles.presetName}>{p.name}</Text>
                  <Text style={styles.presetDesc}>{p.description}</Text>
                  <Text style={styles.presetApply}>Tap to apply →</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Agent command hint */}
            <View style={styles.agentHint}>
              <Text style={styles.agentHintTitle}>🤖 Tell your agent:</Text>
              <Text style={styles.agentHintCode}>{`{ "action": "set_preset", "params": { "preset": "matrix" } }`}</Text>
            </View>
          </View>
        )}

        {/* ── SAVED TAB ── */}
        {tab === 'saved' && (
          <View>
            <Text style={styles.sectionTitle}>Your Backgrounds</Text>
            {backgrounds.length === 0 ? (
              <Text style={styles.empty}>No saved backgrounds yet. Generate one or apply a preset.</Text>
            ) : (
              backgrounds.map(bg => (
                <View key={bg.id} style={[styles.bgCard, bg.is_active && styles.bgCardActive]}>
                  <View style={styles.bgCardHeader}>
                    <Text style={styles.bgName}>{bg.name}</Text>
                    <View style={[styles.bgBadge, bg.type === 'generated' && styles.bgBadgeGen]}>
                      <Text style={styles.bgBadgeText}>{bg.type}</Text>
                    </View>
                  </View>
                  {bg.prompt && <Text style={styles.bgPrompt}>"{bg.prompt}"</Text>}
                  {bg.is_active && <Text style={styles.bgActiveLabel}>● Active</Text>}
                  <View style={styles.bgActions}>
                    {!bg.is_active && (
                      <TouchableOpacity style={styles.btnSmall} onPress={() => activateBg(bg.id)}>
                        <Text style={styles.btnSmallText}>Apply</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.btnSmall, styles.btnDanger]}
                      onPress={() => deleteBg(bg.id, bg.name)}
                    >
                      <Text style={styles.btnSmallText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── GENERATE TAB ── */}
        {tab === 'generate' && (
          <View>
            <Text style={styles.sectionTitle}>AI Background Generator</Text>
            <Text style={styles.sectionSub}>
              Describe any animated background. The AI will write the HTML canvas code.
            </Text>

            <View style={styles.examplesWrap}>
              <Text style={styles.examplesLabel}>Try:</Text>
              {[
                'spinning galaxy with red stars and nebula clouds',
                'glitchy red circuit board with data flowing',
                'dark ocean waves with bioluminescent particles',
                'abstract red DNA helix rotating slowly',
              ].map(ex => (
                <TouchableOpacity key={ex} onPress={() => setPrompt(ex)}>
                  <Text style={styles.example}>→ {ex}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Describe your background..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Text style={styles.charCount}>{prompt.length}/500</Text>

            <TouchableOpacity
              style={[styles.btn, (!prompt.trim() || generating) && styles.btnDisabled]}
              onPress={generateBackground}
              disabled={!prompt.trim() || generating}
            >
              {generating
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.btnText}>✨ Generate & Apply</Text>
              }
            </TouchableOpacity>

            <View style={styles.agentHint}>
              <Text style={styles.agentHintTitle}>🤖 Your agent can do this too:</Text>
              <Text style={styles.agentHintCode}>{`{ "action": "generate", "params": { "prompt": "spinning galaxy with red stars", "set_active": true } }`}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 14 },

  livePreview: {
    height: 180,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  liveOverlay: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: colors.accent,
  },
  liveLabel: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: colors.accent, fontWeight: '700' },

  content: { flex: 1, padding: 16 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionSub: { color: colors.textSecondary, fontSize: 13, marginBottom: 20 },

  presetGrid: { gap: 10 },
  presetCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetName: { color: colors.text, fontSize: 16, fontWeight: '700', textTransform: 'capitalize', marginBottom: 4 },
  presetDesc: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  presetApply: { color: colors.accent, fontSize: 12, fontWeight: '600' },

  agentHint: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `rgba(220,38,38,0.3)`,
  },
  agentHintTitle: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  agentHintCode: { color: colors.textSecondary, fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },

  bgCard: {
    backgroundColor: colors.surface,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 10,
  },
  bgCardActive: { borderColor: colors.accent },
  bgCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bgName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  bgBadge: { backgroundColor: colors.surfaceLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  bgBadgeGen: { backgroundColor: `rgba(220,38,38,0.15)` },
  bgBadgeText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  bgPrompt: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
  bgActiveLabel: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  bgActions: { flexDirection: 'row', gap: 8 },
  btnSmall: {
    backgroundColor: `rgba(220,38,38,0.15)`,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: `rgba(220,38,38,0.4)`,
  },
  btnDanger: { backgroundColor: `rgba(255,0,0,0.08)` },
  btnSmallText: { color: colors.accent, fontSize: 13, fontWeight: '600' },

  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 14 },

  examplesWrap: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  examplesLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  example: { color: colors.accent, fontSize: 13, marginBottom: 6 },

  input: {
    backgroundColor: colors.surface,
    borderRadius: 12, padding: 14,
    color: colors.text, fontSize: 14,
    borderWidth: 1, borderColor: colors.border,
    textAlignVertical: 'top', minHeight: 90,
    marginBottom: 6,
  },
  charCount: { color: colors.textMuted, fontSize: 11, textAlign: 'right', marginBottom: 16 },

  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12, padding: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
