/**
 * A storyboard use case scenario.
 * */
export type UseCase = {
  targetExport: string;
  description: string;
  conditions: Record<string, any>;
};

/**
 * A storyboard for a component.
 * */
export type Storyboard = {
  targetFile: string;
  useCases: UseCase[];
};

/**
 * A storyboard that has been loaded from a JSON file.
 * */
export type LoadedStoryboard = {
  path: string;
} & Storyboard;

/**
 * A map of {@link LoadedStoryboard}s.
 * */
export type LoadedStoryboardMap = Record<string, LoadedStoryboard>;
