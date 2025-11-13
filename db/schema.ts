import {
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  index,
  foreignKey,
  pgEnum,
} from "drizzle-orm/pg-core";

export const membershipStatusEnum = pgEnum("membership_status_enum", [
  "active",
  "inactive",
  "pending",
  "transferred",
  "deceased",
]);

export const familyRoleEnum = pgEnum("family_role_enum", [
  "father",
  "mother",
  "son",
  "daughter",
]);

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull().unique(),
  expiresAt: timestamp("expires_at"),
  acceptedAt: timestamp("accepted_at"),
});

export const families = pgTable(
  "families",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentFamilyId: uuid("parent_family_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    parentFamilyIdFk: foreignKey({
      columns: [table.parentFamilyId],
      foreignColumns: [table.id],
    })
      .onDelete("set null"),
  }),
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id").references(() => families.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    membershipDate: date("membership_date").notNull(),
    email: text("email").unique(),
    phone: text("phone"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    dateOfBirth: date("date_of_birth"),
    baptismDate: date("baptism_date"),
    membershipStatus: membershipStatusEnum("membership_status")
      .notNull()
      .default("active"),
    familyRole: familyRoleEnum("family_role"),
    notes: text("notes"),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("members_family_id_idx").on(table.familyId),
    index("members_membership_status_idx").on(table.membershipStatus),
    index("members_email_idx").on(table.email),
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