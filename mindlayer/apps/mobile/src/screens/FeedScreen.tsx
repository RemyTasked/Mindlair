import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { api, Post } from "../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "Feed">;

const STANCE_COLORS = {
  arguing: "#a3c47a",
  exploring: "#d4915a",
  steelmanning: "#4a9eff",
};

const STANCE_LABELS = {
  arguing: "Arguing",
  exploring: "Exploring",
  steelmanning: "Steelmanning",
};

type FilterType = "all" | "following" | "discover";

export function FeedScreen({ navigation }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (refresh = false) => {
    try {
      const newCursor = refresh ? undefined : cursor;
      const response = await api.getFeed({
        cursor: newCursor,
        filter: filter === "all" ? undefined : filter,
        limit: 20,
      });
      
      if (refresh) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }
      
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error("Failed to fetch feed:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [cursor, filter]);

  useEffect(() => {
    setIsLoading(true);
    setCursor(undefined);
    fetchFeed(true);
  }, [filter]);

  const onRefresh = () => {
    setIsRefreshing(true);
    setCursor(undefined);
    fetchFeed(true);
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchFeed(false);
    }
  };

  const handleReaction = async (postId: string, reaction: "agree" | "disagree" | "complicated") => {
    try {
      await api.reactToPost(postId, reaction);
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, userReaction: reaction }
          : post
      ));
    } catch (error) {
      console.error("Failed to react:", error);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <View style={styles.avatar} />
          <View>
            <Text style={styles.authorName}>{item.author?.name || "Anonymous"}</Text>
            <Text style={styles.postDate}>
              {new Date(item.publishedAt || item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={[styles.stanceBadge, { backgroundColor: `${STANCE_COLORS[item.authorStance]}20` }]}>
          <View style={[styles.stanceDot, { backgroundColor: STANCE_COLORS[item.authorStance] }]} />
          <Text style={[styles.stanceText, { color: STANCE_COLORS[item.authorStance] }]}>
            {STANCE_LABELS[item.authorStance]}
          </Text>
        </View>
      </View>

      <Text style={styles.headlineClaim}>{item.headlineClaim}</Text>
      
      {item.body && (
        <Text style={styles.bodyPreview} numberOfLines={3}>
          {item.body}
        </Text>
      )}

      {item.topicTags && item.topicTags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.topicTags.slice(0, 3).map((tag, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.reactionSection}>
        {!item.userReaction && (
          <Text style={styles.reactionPrompt}>React to see what others think</Text>
        )}
        <View style={styles.reactionButtons}>
          {(["agree", "disagree", "complicated"] as const).map((reaction) => (
            <TouchableOpacity
              key={reaction}
              style={[
                styles.reactionButton,
                item.userReaction === reaction && styles.reactionButtonActive,
                { borderColor: reaction === "agree" ? "#a3c47a" : reaction === "disagree" ? "#e57373" : "#d4915a" },
              ]}
              onPress={() => handleReaction(item.id, reaction)}
            >
              <Text style={[
                styles.reactionButtonText,
                { color: reaction === "agree" ? "#a3c47a" : reaction === "disagree" ? "#e57373" : "#d4915a" },
              ]}>
                {reaction.charAt(0).toUpperCase() + reaction.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.filterRow}>
        {(["all", "following", "discover"] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "all" ? "For You" : f === "following" ? "Following" : "Discover"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d4915a" />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#d4915a"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptyHint}>Be the first to publish!</Text>
            </View>
          }
          ListFooterComponent={
            hasMore && posts.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} color="#d4915a" />
            ) : null
          }
        />
      )}

      <TouchableOpacity
        style={styles.publishFab}
        onPress={() => navigation.navigate("Publish")}
      >
        <Text style={styles.publishFabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0e0c",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2825",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1a1916",
  },
  filterButtonActive: {
    backgroundColor: "#d4915a20",
    borderWidth: 1,
    borderColor: "#d4915a",
  },
  filterText: {
    color: "#7a7469",
    fontSize: 14,
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#d4915a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: "#1a1916",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a2825",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2a2825",
  },
  authorName: {
    color: "#e8e4dc",
    fontSize: 14,
    fontWeight: "500",
  },
  postDate: {
    color: "#7a7469",
    fontSize: 12,
  },
  stanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stanceText: {
    fontSize: 12,
    fontWeight: "500",
  },
  headlineClaim: {
    color: "#e8e4dc",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 8,
  },
  bodyPreview: {
    color: "#c4bfb4",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#2a2825",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: "#7a7469",
    fontSize: 11,
  },
  reactionSection: {
    borderTopWidth: 1,
    borderTopColor: "#2a2825",
    paddingTop: 12,
  },
  reactionPrompt: {
    color: "#7a7469",
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 8,
  },
  reactionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  reactionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  reactionButtonActive: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  reactionButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#7a7469",
    fontSize: 16,
    fontWeight: "500",
  },
  emptyHint: {
    color: "#52525b",
    fontSize: 14,
    marginTop: 8,
  },
  footerLoader: {
    paddingVertical: 20,
  },
  publishFab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#d4915a",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  publishFabText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "300",
    marginTop: -2,
  },
});
