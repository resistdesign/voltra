export const handler = async (event: {
  path: string;
  body: any[];
}): Promise<any> => {
  const { path, body } = event;

  return {
    target: path.split("/"),
    args: body,
  };
};
