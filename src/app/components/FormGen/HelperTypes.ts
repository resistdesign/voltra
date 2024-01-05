export type Time = `${number}:${number}:${number}.${number}Z`;

export type DateTime = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;

export type LongText = string;

export type Rating = number;

export type Color = string;

export type TelephoneNumber = string;

export type EmailAddress = string;

export type File = string;

export type Hidden = string;

export type Image = string;

export type Month = string;

export type Password = string;

export type Radio = string;

export type Range = string;

export type Search = string;

export type URL = string;

export type Week = string;

export const DataTypeMap = {
  string: 'text',
  number: 'number',
  boolean: 'checkbox',
  Date: 'date',
  Time: 'time',
  DateTime: 'datetime-local',
  LongText: 'textarea',
  Rating: 'number',
  Color: 'color',
  TelephoneNumber: 'tel',
  EmailAddress: 'email',
  File: 'file',
  Hidden: 'hidden',
  Image: 'image',
  Month: 'month',
  Password: 'password',
  Radio: 'radio',
  Range: 'range',
  Search: 'search',
  URL: 'url',
  Week: 'week',
  any: 'text',
};
