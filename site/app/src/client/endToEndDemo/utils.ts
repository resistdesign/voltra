export const formatCarLabel = (item: any) => {
  const make = item?.make ?? "Unknown";
  const model = item?.model ?? "Model";
  const year = item?.year ?? "Year";

  return `${year} ${make} ${model}`;
};

export const formatPersonLabel = (
  person: any | null,
  fallbackId?: string | null,
) => {
  const firstName = person?.firstName ?? "First";
  const lastName = person?.lastName ?? "Last";

  if (person?.firstName || person?.lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  if (fallbackId) {
    return `Person ${fallbackId}`;
  }

  return "Person";
};
