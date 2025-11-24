import {
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  index,
  pgEnum,
  integer,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";

export const householdTypeEnum = pgEnum("household_type_enum", [
  "family",
  "single",
  "couple",
  "other",
]);

export const sexEnum = pgEnum("sex_enum", [
  "male",
  "female",
  "other",
]);

export const participationStatusEnum = pgEnum("participation_status_enum", [
  "active",
  "visitor",
  "inactive",
  "transferred",
  "deceased",
]);

export const receivedByEnum = pgEnum("received_by_enum", [
  "baptism",
  "confirmation",
  "transfer",
  "profession",
  "other",
]);

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull().unique(),
  expiresAt: timestamp("expires_at"),
  acceptedAt: timestamp("accepted_at"),
});

export const household = pgTable("household", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  type: householdTypeEnum("type"),
  isNonHousehold: boolean("is_non_household").default(false),
  personAssigned: uuid("person_assigned"),
  ministryGroup: text("ministry_group"),
  address1: text("address1"),
  address2: text("address2"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country"),
  alternateAddressBegin: date("alternate_address_begin"),
  alternateAddressEnd: date("alternate_address_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id").references(() => household.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    suffix: text("suffix"),
    preferredName: text("preferred_name"),
    maidenName: text("maiden_name"),
    title: text("title"),
    sex: sexEnum("sex"),
    dateOfBirth: date("date_of_birth"),
    email1: text("email1").unique(),
    email2: text("email2"),
    phoneHome: text("phone_home"),
    phoneCell1: text("phone_cell1"),
    phoneCell2: text("phone_cell2"),
    baptismDate: date("baptism_date"),
    confirmationDate: date("confirmation_date"),
    receivedBy: receivedByEnum("received_by"),
    dateReceived: date("date_received"),
    removedBy: text("removed_by"),
    dateRemoved: date("date_removed"),
    deceasedDate: date("deceased_date"),
    membershipCode: text("membership_code"),
    envelopeNumber: integer("envelope_number"),
    participation: participationStatusEnum("participation")
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("members_household_id_idx").on(table.householdId),
    index("members_participation_idx").on(table.participation),
    index("members_email1_idx").on(table.email1),
  ],
);

export const membershipHistory = pgTable(
  "membership_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    fieldChanged: text("field_changed").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    changedBy: text("changed_by"),
    notes: text("notes"),
  },
  (table) => [
    index("membership_history_member_id_idx").on(table.memberId),
    index("membership_history_changed_at_idx").on(table.changedAt),
  ],
);

export const giving = pgTable(
  "giving",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    dateGiven: date("date_given").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("giving_member_id_idx").on(table.memberId),
    index("giving_date_given_idx").on(table.dateGiven),
  ],
);