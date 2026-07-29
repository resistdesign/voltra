type PersistableItem = {
  /**
   * @label ID
   * @primaryField
   * @hidden
   */
  readonly id?: string;
};

/**
 * @persisted
 * */
export type Car = PersistableItem & {
  /**
   * @label Make
   * @indexed.text
   * @indexed.exact @indexed.range
   */
  make: string;
  /**
   * @label Model
   * @indexed.text
   * @indexed.exact @indexed.range
   */
  model: string;
  /**
   * @label Year
   * @constraints.min 1900
   * @constraints.max 2022
   * @constraints.step 1
   * @indexed.exact @indexed.range
   */
  year: number;
};

/**
 * @persisted
 * */
export type Person = PersistableItem & {
  /**
   * @label First Name
   * @indexed.text
   * @indexed.exact @indexed.range
   */
  firstName: string;
  /**
   * @label Last Name
   * @indexed.text
   * @indexed.exact @indexed.range
   */
  lastName: string;
  /**
   * @label Age
   * @format number
   * @constraints.defaultValue "18.0"
   * @constraints.step 0.5
   * @constraints.min 18.0
   * @constraints.max 150.0
   * @constraints.pattern \d+
   * @indexed.exact @indexed.range
   * @indexed.decimal
   */
  age: number;
  /**
   * @label Phone Number (+### (###) ###-####)
   * @format tel
   * @constraints.pattern ^\+\d+(-\d+)? \(\d{3}\) \d{3}-\d{4}$
   */
  phoneNumber: string;
  /**
   * @label Email
   * @format email
   */
  email: string;
  /**
   * @label Car
   */
  car: Car;
  /**
   * @label Likes Cheese
   * @constraints.defaultValue
   */
  readonly likesCheese: boolean;
  /**
   * @label Dietary Restrictions
   * @indexed.exact @indexed.range
   */
  dietaryRestrictions:
    "Vegan" | "Vegetarian" | "Pescatarian" | "Keto" | "Paleo" | "None";
};
