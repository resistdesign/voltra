export const formatCarLabel = (item: any) => {
  const make = item?.make ?? "Unknown";
  const model = item?.model ?? "Model";
  const year = item?.year ?? "Year";

  return `${year} ${make} ${model}`;
};
