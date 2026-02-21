import { emit } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";

export type FriendProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type FriendRow = {
  id: number;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
};

export type FriendWithProfile = FriendRow & {
  profile: FriendProfile;
};

export function useFriends(userId: string) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendWithProfile[]>(
    [],
  );
  const [pendingSent, setPendingSent] = useState<FriendWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setFriends([]);
      setPendingReceived([]);
      setPendingSent([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 1. Fetch all friend rows involving this user
    const { data: rows } = await supabase
      .from("friends")
      .select("*")
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

    if (!rows || rows.length === 0) {
      setFriends([]);
      setPendingReceived([]);
      setPendingSent([]);
      setIsLoading(false);
      return;
    }

    // 2. Collect the "other" user IDs and batch-fetch profiles
    const otherIds = rows.map((r: FriendRow) =>
      r.requester_id === userId ? r.recipient_id : r.requester_id,
    );
    const uniqueIds = [...new Set(otherIds)];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, avatar_url")
      .in("id", uniqueIds);

    const profileMap = new Map<string, FriendProfile>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id, p);
      }
    }

    // 3. Merge and partition
    const accepted: FriendWithProfile[] = [];
    const received: FriendWithProfile[] = [];
    const sent: FriendWithProfile[] = [];

    for (const row of rows as FriendRow[]) {
      const otherId =
        row.requester_id === userId ? row.recipient_id : row.requester_id;
      const profile = profileMap.get(otherId);
      if (!profile) continue;

      const merged = { ...row, profile };

      if (row.status === "accepted") {
        accepted.push(merged);
      } else if (row.status === "pending") {
        if (row.recipient_id === userId) {
          received.push(merged);
        } else {
          sent.push(merged);
        }
      }
    }

    setFriends(accepted);
    setPendingReceived(received);
    setPendingSent(sent);
    setIsLoading(false);
  }, [userId]);

  const sendInvite = useCallback(
    async (recipientId: string) => {
      // Prevent duplicate (check both directions)
      const { data: existing } = await supabase
        .from("friends")
        .select("id")
        .or(
          `and(requester_id.eq.${userId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${userId})`,
        );

      if (existing && existing.length > 0) {
        return { error: "Friend request already exists" };
      }

      const { error } = await supabase.from("friends").insert({
        requester_id: userId,
        recipient_id: recipientId,
        status: "pending",
      });

      if (!error) {
        await refresh();
        emit("friends-changed");
      }
      return { error: error?.message ?? null };
    },
    [userId, refresh],
  );

  const acceptInvite = useCallback(
    async (friendRowId: number) => {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendRowId)
        .eq("recipient_id", userId); // Only recipient can accept

      if (!error) {
        await refresh();
        emit("friends-changed");
      }
      return { error: error?.message ?? null };
    },
    [userId, refresh],
  );

  const declineOrRemove = useCallback(
    async (friendRowId: number) => {
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("id", friendRowId);

      if (!error) {
        await refresh();
        emit("friends-changed");
      }
      return { error: error?.message ?? null };
    },
    [refresh],
  );

  return {
    friends,
    pendingReceived,
    pendingSent,
    isLoading,
    refresh,
    sendInvite,
    acceptInvite,
    declineOrRemove,
  };
}

export function usePendingFriendCount(userId: string) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }

    const { count: c } = await supabase
      .from("friends")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("status", "pending");

    setCount(c ?? 0);
  }, [userId]);

  return { count, refresh };
}
