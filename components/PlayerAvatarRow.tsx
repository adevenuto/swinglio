import UserAvatar from "@/components/UserAvatar";
import { Color } from "@/constants/design-tokens";
import React from "react";
import { StyleSheet, View } from "react-native";

export type PlayerAvatarInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

type Props = {
  players: PlayerAvatarInfo[];
  size?: number;
  overlap?: number;
};

export default function PlayerAvatarRow({
  players,
  size = 28,
  overlap = 8,
}: Props) {
  if (players.length === 0) return null;

  return (
    <View style={[styles.row, { height: size }]}>
      {players.map((player, i) => (
        <View
          key={player.id}
          style={[
            styles.avatarWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: players.length - i,
            },
          ]}
        >
          <UserAvatar
            avatarUrl={player.avatarUrl}
            firstName={player.firstName}
            lastName={player.lastName}
            size={size - 2}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    borderWidth: 1,
    borderColor: Color.white,
    overflow: "hidden",
    backgroundColor: Color.white,
  },
});
