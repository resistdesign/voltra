export type LocalJSON = {
  create: (key: string, value: any) => void;
  read: (key: string) => any;
  update: (key: string, value: any) => void;
  delete: (key: string) => void;
  list: () => any[];
};

export const getLocalJSON = (path: string): LocalJSON => {
  const store = {
    create: (key: string, value: any) => {
      localStorage.setItem(`${path}/${key}`, JSON.stringify(value));
    },
    read: (key: string) => {
      const value = localStorage.getItem(`${path}/${key}`);

      try {
        return value ? JSON.parse(value) : undefined;
      } catch (_error) {
        return undefined;
      }
    },
    update: (key: string, value: any) => store.create(key, value),
    delete: (key: string) => {
      localStorage.removeItem(`${path}/${key}`);
    },
    list: () => {
      const keys = Object.keys(localStorage);
      return keys
        .map((key) => {
          if (key.indexOf(`${path}/`) === 0) {
            return store.read(key.replace(`${path}/`, ''));
          }
        })
        .filter((v) => typeof v !== 'undefined');
    },
  };

  return store;
};
