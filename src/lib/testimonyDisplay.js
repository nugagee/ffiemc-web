/** Public-safe display fields for a testimony (hides identity when anonymous). */
export function publicTestimonyView(t = {}) {
  const anonymous = Boolean(t.share_anonymous || t.shareAnonymous);
  if (!anonymous) {
    return {
      ...t,
      displayName: t.name || "Church member",
      displayRole: t.role || "Church Member",
      displayImage: t.image || "",
      displayDateJoined: t.dateJoined || "",
      isAnonymous: false,
    };
  }
  return {
    ...t,
    displayName: "Anonymous",
    displayRole: t.role?.trim() ? t.role : "Church family",
    displayImage: "",
    displayDateJoined: "",
    isAnonymous: true,
  };
}
