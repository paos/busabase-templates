export function dueFollowups(records, today) {
  return records.filter((record) => {
    const date = String(record.fields?.["next-follow-up-date"] || "").slice(0, 10);
    return date && date <= today;
  }).sort((left, right) =>
    String(left.fields["next-follow-up-date"]).localeCompare(String(right.fields["next-follow-up-date"])) ||
    String(left.id).localeCompare(String(right.id)),
  );
}
