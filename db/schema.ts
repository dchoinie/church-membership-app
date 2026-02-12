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
  unique,
} from "drizzle-orm/pg-core";
import { userRoleEnum, user } from "@/auth-schema";

export const householdTypeEnum = pgEnum("household_type_enum", [
  "family",
  "single",
  "other",
]);

export const sexEnum = pgEnum("sex_enum", [
  "male",
  "female",
  "other",
]);

export const participationStatusEnum = pgEnum("participation_status_enum", [
  "active",
  "deceased",
  "homebound",
  "military",
  "inactive",
  "school",
]);

export const receivedByEnum = pgEnum("received_by_enum", [
  "adult_confirmation",
  "affirmation_of_faith",
  "baptism",
  "junior_confirmation",
  "transfer",
  "with_parents",
  "other_denomination",
  "unknown",
]);

export const sequenceEnum = pgEnum("sequence_enum", [
  "head_of_house",
  "spouse",
  "child",
]);

export const removedByEnum = pgEnum("removed_by_enum", [
  "death",
  "excommunication",
  "inactivity",
  "moved_no_transfer",
  "released",
  "removed_by_request",
  "transfer",
  "other",
]);

// Service type enum removed - now using text to support custom types
// Keeping enum definition for backward compatibility during migration
export const serviceTypeEnum = pgEnum("service_type_enum", [
  "divine_service",
  "midweek_lent",
  "midweek_advent",
  "festival",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status_enum", [
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan_enum", [
  "basic",
  "premium",
]);

export const churches = pgTable(
  "churches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    subdomain: text("subdomain").notNull().unique(),
    domain: text("domain"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    denomination: text("denomination"),
    phone: text("phone"),
    email: text("email"),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color"),
    // Tax and legal information for giving statements
    taxId: text("tax_id"), // EIN format: XX-XXXXXXX
    is501c3: boolean("is_501c3").default(true),
    taxStatementDisclaimer: text("tax_statement_disclaimer"),
    goodsServicesProvided: boolean("goods_services_provided").default(false),
    goodsServicesStatement: text("goods_services_statement"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("unpaid"),
    subscriptionPlan: subscriptionPlanEnum("subscription_plan")
      .notNull()
      .default("basic"),
    trialEndsAt: timestamp("trial_ends_at"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("churches_subdomain_idx").on(table.subdomain),
    index("churches_stripe_customer_id_idx").on(table.stripeCustomerId),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    status: subscriptionStatusEnum("status").notNull(),
    plan: subscriptionPlanEnum("plan").notNull(),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("subscriptions_church_id_idx").on(table.churchId),
    index("subscriptions_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    code: text("code").notNull().unique(),
    expiresAt: timestamp("expires_at"),
    acceptedAt: timestamp("accepted_at"),
  },
  (table) => [
    index("invitations_church_id_idx").on(table.churchId),
  ],
);

export const userChurches = pgTable(
  "user_churches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("user_churches_user_id_idx").on(table.userId),
    index("user_churches_church_id_idx").on(table.churchId),
    unique("user_churches_user_church_unique").on(table.userId, table.churchId),
  ],
);

export const household = pgTable(
  "household",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
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
  },
  (table) => [
    index("household_church_id_idx").on(table.churchId),
  ],
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
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
    dateOfBirth: text("date_of_birth"), // Text to support encrypted values
    email1: text("email1").unique(),
    email2: text("email2"),
    phoneHome: text("phone_home"),
    phoneCell1: text("phone_cell1"),
    phoneCell2: text("phone_cell2"),
    baptismDate: date("baptism_date"),
    confirmationDate: date("confirmation_date"),
    weddingAnniversaryDate: date("wedding_anniversary_date"),
    receivedBy: receivedByEnum("received_by"),
    dateReceived: date("date_received"),
    removedBy: removedByEnum("removed_by"),
    dateRemoved: date("date_removed"),
    deceasedDate: date("deceased_date"),
    membershipCode: text("membership_code"),
    envelopeNumber: integer("envelope_number"),
    participation: participationStatusEnum("participation")
      .notNull()
      .default("active"),
    sequence: sequenceEnum("sequence"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("members_church_id_idx").on(table.churchId),
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

export const givingCategories = pgTable(
  "giving_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("giving_categories_church_id_idx").on(table.churchId),
    unique("giving_categories_church_name_unique").on(table.churchId, table.name),
  ],
);

export const giving = pgTable(
  "giving",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
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
    index("giving_service_id_idx").on(table.serviceId),
  ],
);

export const givingItems = pgTable(
  "giving_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    givingId: uuid("giving_id")
      .notNull()
      .references(() => giving.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => givingCategories.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("giving_items_giving_id_idx").on(table.givingId),
    index("giving_items_category_id_idx").on(table.categoryId),
    unique("giving_items_giving_category_unique").on(table.givingId, table.categoryId),
  ],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    serviceDate: date("service_date").notNull(),
    serviceType: text("service_type").notNull(), // Changed from enum to text to support custom types
    serviceTime: text("service_time"), // Stored as HH:MM:SS format (local church time), converted to user timezone on display
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("services_church_id_idx").on(table.churchId),
    index("services_service_date_idx").on(table.serviceDate),
    unique("services_church_date_type_unique").on(table.churchId, table.serviceDate, table.serviceType),
  ],
);

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    attended: boolean("attended").default(false).notNull(),
    tookCommunion: boolean("took_communion").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("attendance_member_id_idx").on(table.memberId),
    index("attendance_service_id_idx").on(table.serviceId),
    unique("attendance_member_service_unique").on(table.memberId, table.serviceId),
  ],
);

export const givingStatements = pgTable(
  "giving_statements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    statementNumber: text("statement_number"),
    generatedAt: timestamp("generated_at").notNull(),
    generatedBy: text("generated_by").notNull(),
    sentAt: timestamp("sent_at"),
    sentBy: text("sent_by"),
    emailStatus: text("email_status"), // 'pending', 'sent', 'failed', 'bounced'
    pdfUrl: text("pdf_url"),
    previewOnly: boolean("preview_only").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("giving_statements_church_id_idx").on(table.churchId),
    index("giving_statements_household_id_idx").on(table.householdId),
    index("giving_statements_year_idx").on(table.year),
    unique("giving_statements_household_year_unique").on(table.householdId, table.year),
  ],
);