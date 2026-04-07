import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { api } from "../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

interface Stats {
  totalBeliefs: number;
  strongBeliefs: number;
  tensions: number;
  concepts: number;
}

interface Source {
  id: string;
  title: string;
  url: string;
  consumedAt: string;
  claimCount: number;
}

export function HomeScreen({ navigation }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSources, setRecentSources] = useState<Source[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, sourcesData] = await Promise.all([
        api.getBeliefStats(),
        api.getRecentSources(5),
      ]);
      setStats(statsData);
      setRecentSources(sourcesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const openWebDashboard = () => {
    Linking.openURL(process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Beliefs"
            value={stats?.totalBeliefs ?? 0}
            color="#10b981"
          />
          <StatCard
            label="Strong"
            value={stats?.strongBeliefs ?? 0}
            color="#3b82f6"
          />
          <StatCard
            label="Tensions"
            value={stats?.tensions ?? 0}
            color="#f59e0b"
          />
          <StatCard
            label="Concepts"
            value={stats?.concepts ?? 0}
            color="#8b5cf6"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => navigation.navigate("Feed")}
            >
              <Text style={styles.primaryActionIcon}>📰</Text>
              <Text style={styles.primaryActionText}>Feed</Text>
              <Text style={styles.primaryActionSubtext}>Explore posts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.primaryActionButton, styles.publishActionButton]}
              onPress={() => navigation.navigate("Publish")}
            >
              <Text style={styles.primaryActionIcon}>✍️</Text>
              <Text style={styles.primaryActionText}>Post</Text>
              <Text style={styles.primaryActionSubtext}>Share your thinking</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={openWebDashboard}
          >
            <Text style={styles.actionButtonText}>Open Belief Map</Text>
            <Text style={styles.actionButtonSubtext}>View your beliefs in the web dashboard</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Captured</Text>
          {recentSources.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No sources yet</Text>
              <Text style={styles.emptyHint}>
                Share articles from other apps to start building your belief map
              </Text>
            </View>
          ) : (
            recentSources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Settings Button */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate("Settings")}
      >
        <Text style={styles.settingsText}>Settings</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SourceCard({ source }: { source: Source }) {
  const openSource = () => {
    Linking.openURL(source.url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <TouchableOpacity style={styles.sourceCard} onPress={openSource}>
      <Text style={styles.sourceTitle} numberOfLines={2}>
        {source.title || source.url}
      </Text>
      <View style={styles.sourceFooter}>
        <Text style={styles.sourceDate}>{formatDate(source.consumedAt)}</Text>
        <Text style={styles.sourceClaims}>
          {source.claimCount} claim{source.claimCount !== 1 ? "s" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fafafa",
  },
  statLabel: {
    fontSize: 14,
    color: "#a1a1aa",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fafafa",
    marginBottom: 12,
  },
  quickActionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#3b82f6",
    alignItems: "center",
  },
  publishActionButton: {
    borderColor: "#d4915a",
  },
  primaryActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fafafa",
  },
  primaryActionSubtext: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: "#71717a",
    marginTop: 4,
  },
  sourceCard: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fafafa",
    lineHeight: 22,
  },
  sourceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sourceDate: {
    fontSize: 13,
    color: "#71717a",
  },
  sourceClaims: {
    fontSize: 13,
    color: "#10b981",
  },
  emptyState: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272a",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#71717a",
  },
  emptyHint: {
    fontSize: 14,
    color: "#52525b",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  settingsButton: {
    position: "absolute",
    bottom: 24,
    right: 16,
    backgroundColor: "#27272a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  settingsText: {
    color: "#fafafa",
    fontSize: 14,
    fontWeight: "500",
  },
});
